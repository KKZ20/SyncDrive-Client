import * as utils from '../utils/utils.js';
import { URL, CHUNKSIZE } from './Socket.js';
import axios from 'axios';
import inquirer from 'inquirer';
import chokidar from 'chokidar';
import fs from 'fs';
import { OPERATION, LOGTYPE } from './Log.js';
import { ClientLog } from './Log.js';
import { Log } from './Log.js';

const UserConfig = '../result/user.json';

let CONFIG;

// 我自己需要记录的文件信息
class FileInfo {
    constructor(filePath_, isDir_, size_, chunkNum_, chunkList_, hashList_, mtime) {
        // 文件路径（'/'开头，在本机绑定的同步目录下的路径） String
        this.filePath = filePath_;
        // 文件类型
        this.isDir = isDir_;
        // 文件大小
        this.size = size_;
        // 文件块数
        this.chunkNum = chunkNum_;
        // 块内容列表 []
        this.chunkList = chunkList_;
        // 哈希值列表 []
        this.hashList = hashList_;
        // 最后修改时间
        this.fileTime = utils.formatDate(mtime);
    }
}


class Sync {
    constructor(username_, uid_) {
        // this.uuid = uuid_;
        this.username = username_;
        this.uid = uid_;
        this.localSyncDir = '';
        this.clientSyncDir = '';
        this.filePathList = [];
        this.fileInfo = [];
    }
    
    // 先把本机同步目录下所有的文件遍历一遍
    SyncPrepare() {
        this.filePathList = utils.GetFileList(this.localSyncDir);
        console.log('本机同步目录下全部文件：', this.filePathList);
        // 先清空
        this.fileInfo = [];
        // 这个时候的fileNameList应该是含所有文件绝对路径的一个数组
        // 根据这个数组，生成所有文件的信息
        this.filePathList.forEach(file => {
            let fileStat = utils.GetFileState(file);
            let fileContent = utils.GenerateHashList(file);
            this.fileInfo.push(new FileInfo(file, fileStat.type, fileStat.size,
                fileContent.chunkNum, fileContent.chunkList, fileContent.hashList, fileStat.mtime));
        });
        // console.log(this.fileInfo.length);
        // console.log(this.fileInfo[0]);
        // process.exit(-1);
    }

    // 查询commit
    async postCommit(fileInfo) {
        // 保存一下this指针
        let that = this;

        // return axios({
        //     method: 'POST',
        //     url: URL,
        //     headers: {
        //         "Content-type": "application/json; charset=GBK2312",
        //     },
        //     data: {
        //         action: 'commit',
        //         uid: that.uid,
        //         path: fileInfo.filePath.slice(that.localSyncDir.length),
        //         length: fileInfo.chunkNum,
        //         size: fileInfo.size,
        //         mtime: fileInfo.fileTime,
        //         hash_list: fileInfo.hashList,
        //     }
        // })

        return axios.post(URL, {
            action: 'commit',
            uid: that.uid,
            path: fileInfo.filePath.slice(that.localSyncDir.length),
            length: fileInfo.chunkNum,
            size: fileInfo.size,
            mtime: fileInfo.fileTime,
            hash_list: fileInfo.hashList,
        });
    }

    // 块上传store
    async postChunk(hashList, chunkList) {
        // 保存一下this指针
        let that = this;
        return axios.post(URL, {
            action: 'store',
            length: hashList.length,
            hash_list: hashList,
            block_list: chunkList,
        });
    }

    // 同步上传单个文件
    async UploadSingleFile(fileInfo) {
        // 首先进行一个初次确认
        let fistCommitRes = await this.postCommit(fileInfo);
        console.log(fistCommitRes.data);
        if (fistCommitRes.data.result === 'OK') {
            // 这个文件不需要同步
            //TODO: 这里要打印信息
            // 秒传
            if (fistCommitRes.data.extra === 'flash') {
                // 控制台打印信息
                console.log(fileInfo.filePath, '上传完成【秒传】\n');
                // 写日志
                ClientLog(new Log(this.username, LOGTYPE.INFO, new Date().toLocaleString(),
                    fileInfo.filePath, OPERATION.UPLOAD, true));
            }
            // 文件夹第一次同步
            else if (fistCommitRes.data.extra === 'dir') {
                // 控制台打印信息
                console.log(fileInfo.filePath, '上传完成\n');
                // 写日志
                ClientLog(new Log(this.username, LOGTYPE.INFO, new Date().toLocaleString(),
                    fileInfo.filePath, OPERATION.UPLOAD));
            }

            return 0;
        }
        // process.exit(-1);
        // 开始块上传
        let needList = [];
        if (fistCommitRes.data.result === 'NEED_BLOCKS') {
            needList = (fistCommitRes.data.block_no_list === undefined ? [] : fistCommitRes.data.block_no_list);
        }
        for (let j = 0; j < needList.length; j++){
            //TODO: 这里是要上传块
            let chunkStoreRes = await this.postChunk([fileInfo.hashList[needList[j]]], [fileInfo.chunkList[needList[j]]]);
            
            console.log('块上传: ', needList[j], '号块, ', chunkStoreRes.data);
            //TODO: 这里要打印进度
            console.log(fileInfo.filePath, ' 同步（上传）进度: 已传', j + 1, '块, 共', needList.length, '块');
        }
        // 再次进行确认
        let finalCommitRes = await this.postCommit(fileInfo);
        if (finalCommitRes.data.result === 'OK') {
            //TODO: 这里要打印信息：已完成
            console.log(fileInfo.filePath, '上传完成\n');
            // 打印日志
            ClientLog(new Log(this.username, LOGTYPE.INFO, new Date().toLocaleString(),
                fileInfo.filePath, OPERATION.UPLOAD));
            return 0;
        }
        else {
            console.log(fileInfo.filePath, '上传未完成\n');
            return -1;
        }
    }

    // 请求下载一个文件块
    // 这里请求下载指定文件的指定文件块，然后返回
    async downloadChunk(hash) {
        return axios.post(URL, {
            action: 'retrieve',
            hash_list: [hash],
            length: 1,
        });
    }

    // 请求下载一个文件
    
    async DownloadSingleFile(fileListItem) {
        // 先初始化一个长度为服务端下载文件块数的一个数组
        let contentArr = new Array(fileListItem.length);
        contentArr.fill('');

        let targetPath = this.localSyncDir + fileListItem.path;

        for (let i = 0; i < fileListItem.length; i++){
            let chunkDownloadRes = await this.downloadChunk(fileListItem.hash_list[i]);
            let tmp = '';
            // 这时候读到了一块
            console.log(chunkDownloadRes.data);
            if (chunkDownloadRes.data.result === 'OK') {
                tmp = chunkDownloadRes.data.block_list[0];
                console.log(targetPath, ' 同步（下载）进度: 已传', i + 1, '块, 共', fileListItem.length, '块');
                //TODO: 这里把读到的数据放到contentArr的对应位置
                contentArr[i] = tmp;
            }
            else if (chunkDownloadRes.data.result === 'ERROR') {
                console.log(targetPath, '当前块未下载成功');
                i--;
            }
        }

        if (contentArr.indexOf('') !== -1) {
            //TODO: 这里代表并没有传输完成
            return -1;
        }
        else {
            //TODO: 写入文件
            let content = '';
            for (let cont of contentArr) {
                content += cont;
            }
            if (content.length !== fileListItem.size) {
                console.log(targetPath, ': 文件大小没弄对');
                process.exit(-1);
            }
            fs.writeFileSync(targetPath, content);
            console.log(targetPath, '下载完成\n');
            ClientLog(new Log(this.username, LOGTYPE.INFO, new Date().toLocaleString(),
                targetPath, OPERATION.DOWNLOAD));
            return 0;
        }
    }

    // 文件同步函数(上传)
    // 包含三个流程：准备、同步、同步完成
    async FileSyncUpload() {
        // 同步准备
        this.SyncPrepare();
        // console.log(this.fileInfo[0]);
        // process.exit(-1);
        // 这时已经完整地获取到了本机同步目录下文件的全部信息
        console.log('-------------------------本地文件上传----------------------------');
        // 保存一下this指针（为了保险）
        let that = this;
        for (let i = 0; i < that.fileInfo.length; i++){
            // 0字节文件不上传
            if (that.fileInfo[i].size === 0 && that.fileInfo[i].isDir === false) {
                continue;
            }
            // 文件大小不为0是才上传
            let status = await that.UploadSingleFile(that.fileInfo[i]);
            if (status === 0) {
                console.log('下一位！');
            }
            else if (status === -1) {
                console.log('没传完！重来！');
                i--;
            }
            // // 首先进行一个初次确认
            // let fistCommitRes = await that.postCommit(that.fileInfo[i]);
            // console.log(i, ':', fistCommitRes.data);
            // if (fistCommitRes.data.result === 'OK') {
            //     // 这个文件不需要同步
            //     //TODO: 这里要打印信息
            //     // 秒传
            //     if (fistCommitRes.data.extra === 'flash') {
            //         // 控制台打印信息
            //         console.log(that.fileInfo[i].filePath, '上传完成【秒传】\n');
            //         // 写日志
            //         ClientLog(new Log(that.username, LOGTYPE.INFO, new Date().toLocaleString(),
            //             that.fileInfo[i].filePath, OPERATION.UPLOAD, true));
            //     }
            //     // 文件夹第一次同步
            //     else if (fistCommitRes.data.extra === 'dir') {
            //         // 控制台打印信息
            //         console.log(that.fileInfo[i].filePath, '上传完成\n');
            //         // 写日志
            //         ClientLog(new Log(that.username, LOGTYPE.INFO, new Date().toLocaleString(),
            //             that.fileInfo[i].filePath, OPERATION.UPLOAD));
            //     }

            //     continue;
            // }
            // // process.exit(-1);
            // // 开始块上传
            // let needList = fistCommitRes.data.block_no_list;
            // // if (fistCommitRes.data.result === 'NEED_BLOCKS') {
            // //     needList = fistCommitRes.data.block_no_list;
            // // }
            // for (let j = 0; j < needList.length; j++){
            //     //TODO: 这里是要上传块
            //     let chunkStoreRes = await that.postChunk([that.fileInfo[i].hashList[needList[j]]], [that.fileInfo[i].chunkList[needList[j]]]);
                
            //     console.log('块上传: ', needList[j], '号块, ', chunkStoreRes.data);
            //     //TODO: 这里要打印进度
            //     console.log(that.fileInfo[i].filePath, ' 同步（上传）进度: 已传', j + 1, '块, 共', needList.length, '块');
            // }
            // // 再次进行确认
            // let finalCommitRes = await that.postCommit(that.fileInfo[i]);
            // if (finalCommitRes.data.result === 'OK') {
            //     //TODO: 这里要打印信息：已完成
            //     console.log(that.fileInfo[i].filePath, '上传完成\n');
            //     // 打印日志
            //     ClientLog(new Log(that.username, LOGTYPE.INFO, new Date().toLocaleString(),
            //             that.fileInfo[i].filePath, OPERATION.UPLOAD));
            // }
            

        }
        console.log('-----------------------本地文件全部上传完成-----------------------\n');
    }

    // 文件同步函数（下载）
    async FileSyncDownload(delay, isInit = false) {
        //FIXME: 先更新一遍文件信息列表（因为这个函数不只是为了初次同步服务，还有可能是后面的轮询）
        this.SyncPrepare();
        let fileList = [];
        // 先生成一个下载时服务端所需的信息列表
        for (let i = 0; i < this.fileInfo.length; i++){
            // 0字节文件不问
            if (this.fileInfo[i].size === 0 && this.fileInfo[i].isDir === false) {
                continue;
            }
            fileList.push({
                path: this.fileInfo[i].filePath.slice(this.localSyncDir.length),
                mtime: this.fileInfo[i].fileTime,
            });
        }
        console.log(fileList);
        let that = this;
        if (isInit) {
            console.log('-------------------------服务端文件下载----------------------------');
        }
        
        // 发送一个初始请求
        let listRes = await axios.post(URL, {
            action: 'list',
            uid: that.uid,
            file_list: fileList,
        });
        // 根据返回结果，进行不同操作
        // console.log('下载的返回报文数据: ', listRes.data.file_list[0].hash_list);
        console.log('下载的返回报文数据: ', listRes.data);

        // 无需任何下载，服务端和本地一致
        if (listRes.data.result === 'OK' && listRes.data.file_list.length === 0) {
            console.log('当前本地文件与服务端文件一致，无需同步');
        }
        // 有需要下载的文件，开始下载
        else if (listRes.data.result === 'OK' && listRes.data.file_list.length !== 0) {
            let downloadList = listRes.data.file_list;
            //TODO: 循环每一个文件开始下载
            for (let i = 0; i < downloadList.length; i++){
                // 如果是文件夹直接创建即可
                if (downloadList[i].type === 'folder') {
                    let dirPath = that.localSyncDir + downloadList[i].path;
                    if (utils.FileExist(dirPath)) {
                        console.log('文件夹', dirPath, '已存在， 看看是不是哪里弄错了');
                        process.exit(-1);
                        // continue;
                    }
                    fs.mkdirSync(dirPath);
                    console.log(dirPath, '文件夹下载完成');
                    ClientLog(new Log(this.username, LOGTYPE.INFO, new Date().toLocaleString(),
                        dirPath, OPERATION.DOWNLOAD));
                    continue;
                }
                let status = await that.DownloadSingleFile(downloadList[i]);
                if (status === 0) {
                    console.log('下载成功！下一位！');
                }
                else if (status === -1) {
                    console.log('没下载好，重来！');
                    i--;
                }
            }
        }
        else {
            console.log('出大事情了！');
            process.exit(-1);
        }

        // 删除本地的文件
        if (listRes.data.result === 'OK' && listRes.data.remove_list.length !== 0) {
            let removeList = listRes.data.remove_list;
            for (let i = 0; i < removeList; i++){
                let removePath = that.localSyncDir + removeList[i];
                fs.rmSync(removePath, { recursive: true, force: true });
                console.log(removePath, '删除成功\n');
                ClientLog(new Log(this.username, LOGTYPE.INFO, new Date().toLocaleString(),
                    removePath, OPERATION.REMOVELOCAL));
            }
        }

        // 本次流程全部结束
        // 初始同步就直接结束即可
        if (isInit) {
            console.log('-----------------------服务端文件全部下载完成-----------------------\n');
            return 0;
        }
        // 日常同步开始模拟心跳包
        else {
            setTimeout(() => that.FileSyncDownload(delay, false), delay);
        }
    }

    async FileSync() {
        let that = this;
        console.log('----------------------开始自动同步-------------------------');
        // 本地文件上传
        await this.FileSyncUpload();
        // 服务端文件下载
        await this.FileSyncDownload(500, true);


        console.log('----------------------初始同步完成-------------------------\n');
        console.log('----------------------开始文件监听-------------------------\n');
        // 开始监听本地文件
        let watcher = chokidar.watch(this.localSyncDir, {
            // ignored: 'node_modules',
            depth: 3,
            ignoreInitial: true,
        });
        // 添加一个文件
        watcher.on('add', async (Epath, stat) => {
            // 文件大小不为0是才上传
            if (stat.size !== 0) {
                let path = Epath.split('\\').join('/');
                // console.log('监听到添加了文件');
                let fileStat = utils.GetFileState(path);
                let fileContent = utils.GenerateHashList(path);
                let fileInfo = new FileInfo(path, fileStat.type, fileStat.size,
                    fileContent.chunkNum, fileContent.chunkList, fileContent.hashList, fileStat.mtime);
                
                let status = await that.UploadSingleFile(fileInfo);
                //FIXME: 不确定对
                while (status === -1) {
                    status = await that.UploadSingleFile(fileInfo);
                }
            }
            
        });
        // 添加一个目录
        watcher.on('addDir', async (Epath) => {
            let path = Epath.split('\\').join('/');
            console.log(path, typeof (path));
            let fileStat = utils.GetFileState(path);
            let fileContent = utils.GenerateHashList(path);
            let fileInfo = new FileInfo(path, fileStat.type, fileStat.size,
                fileContent.chunkNum, fileContent.chunkList, fileContent.hashList, fileStat.mtime);
            
            let status = await that.UploadSingleFile(fileInfo);
            //FIXME: 不确定对
            while (status === -1) {
                status = await that.UploadSingleFile(fileInfo);
            }
        });
        // 修改一个文件
        watcher.on('change', async (Epath, stat) => {
            // 文件大小不为0是才上传
            if (stat.size !== 0) {
                let path = Epath.split('\\').join('/');
                let fileStat = utils.GetFileState(path);
                let fileContent = utils.GenerateHashList(path);
                let fileInfo = new FileInfo(path, fileStat.type, fileStat.size,
                    fileContent.chunkNum, fileContent.chunkList, fileContent.hashList, fileStat.mtime);
                
                let status = await that.UploadSingleFile(fileInfo);
                //FIXME: 不确定对
                while (status === -1) {
                    status = await that.UploadSingleFile(fileInfo);
                }
            }
            
        });
        //TODO: 删除一个目录
        watcher.on('unlinkDir', async (Epath) => {
            let path = Epath.split('\\').join('/');
            console.log(path);
            let res = await axios.post(URL, {
                action: 'remove',
                uid: that.uid,
                path: path.slice(that.localSyncDir.length),
            });
            console.log('删除文件夹: ', res.data);
            if (res.data.result === 'OK') {
                ClientLog(new Log(that.username, LOGTYPE.INFO, new Date().toLocaleString(),
                    path, OPERATION.REMOVE));
            }
        });
        //TODO: 删除一个文件
        watcher.on('unlink', async (Epath) => {
            let path = Epath.split('\\').join('/');
            let res = await axios.post(URL, {
                action: 'remove',
                uid: that.uid,
                path: path.slice(that.localSyncDir.length),
            });
            console.log('删除文件: ', res.data);
            if (res.data.result === 'OK') {
                ClientLog(new Log(that.username, LOGTYPE.INFO, new Date().toLocaleString(),
                    path, OPERATION.REMOVE));
            }
        });

        // 发送心跳包，注意是与监听并行的
        // setInterval(that.FileSyncDownload(), 1000);
        that.FileSyncDownload(500, false);
        //TODO: 退出程序
        utils.LogOut(that.username);
    }


    InitSync(has_logged, REBIND = false) {
        // 保存一下this指针
        let that = this;
        inquirer.prompt([
            {
                type: 'input',
                message: '请选择要绑定的本地目录',
                suffix: '绝对路径',
                name: 'localsyncdir',
            },
            {
                type: 'list',
                choices: [
                    'dir1',
                    'dir2',
                    'dir3',
                ],
                message: '请选择要绑定的客户端目录',
                name: 'clientsyncdir',
            }
        ]).then(answers => {
            if (!utils.FileExist(answers.localsyncdir)) {
                console.log('未找到路径：', answers.localsyncdir);
                process.exit(-1);
            }
            that.localSyncDir = answers.localsyncdir;
            that.clientSyncDir = answers.clientsyncdir;
            // 先将信息写入UserConfig配置文件
            if (has_logged) {
                for (let conf of CONFIG) {
                    //FIXME: 找到一种确定用户身份的方法
                    if (conf.uid === that.uid) {
                        conf.localsyncdir = that.localSyncDir;
                        conf.clientsyncdir = that.clientSyncDir;
                        break;
                    }
                }
            }
            else {
                CONFIG.push({ uid: that.uid, localsyncdir: that.localSyncDir, clientsyncdir: that.clientSyncDir });
            }
            // 覆盖方式写
            fs.writeFileSync(UserConfig, JSON.stringify(CONFIG, null, 4), { encoding: 'utf-8' });

            // 写入日志
            ClientLog(new Log(that.username, LOGTYPE.INFO, new Date().toLocaleString(),
                that.localSyncDir, REBIND ? OPERATION.REBIND : OPERATION.BIND));
            
            // 通知服务器
            axios.post(URL, {
                action: REBIND ? 'rebind' : 'bind',
                uid: that.uid,
                dirname: that.localSyncDir,
            }).then(function (res) {
                if (res.data.result === 'OK') {
                    // 服务器成功接收
                    //TODO: 开始同步
                    that.FileSync();
                }
            }).catch(function (err) {
                console.log('绑定/换绑通知服务端时出错！');
                console.log(err);
            })
            
        });
    }

    NormalSync(has_logged, localsyncdir, clientsyncdir) {
        // 保存一下this指针
        let that = this;
        inquirer.prompt([
            {
                type: 'list',
                choices: [
                    '保持原样，跳过',
                    '换绑目录',
                    '解绑目录',
                ],
                message: '请选择操作',
                name: 'choice',
            }
        ]).then(ans => {
            if (ans.choice === '换绑目录') {
                // 就是相当于再来一次初始绑定
                that.InitSync(has_logged, true);
            }
            else if (ans.choice === '保持原样，跳过') {
                // 直接开始同步
                that.clientSyncDir = clientsyncdir;
                that.localSyncDir = localsyncdir;
                //TODO: 开始同步
                that.FileSync();
            }
            else if (ans.choice === '解绑目录') {
                that.localSyncDir = '';
                that.clientSyncDir = '';
                // 先修改配置文件
                if (has_logged) {
                    for (let conf of CONFIG) {
                        //FIXME: 找到一种确定用户身份的方法
                        if (conf.uid === that.uid) {
                            conf.localsyncdir = that.localSyncDir;
                            conf.clientsyncdir = that.clientSyncDir;
                            break;
                        }
                    }
                }
                else {
                    console.log('报错，不可能这里显示没登陆过，除非手动改配置文件了');
                    // CONFIG.push({ uid: that.uid, localsyncdir: that.localSyncDir, clientsyncdir: that.clientSyncDir });
                }
                // 覆盖方式写
                fs.writeFileSync(UserConfig, JSON.stringify(CONFIG, null, 4), { encoding: 'utf-8' });

                // 写入日志
                ClientLog(new Log(that.username, LOGTYPE.INFO, new Date().toLocaleString(),
                    localsyncdir, OPERATION.UNBIND));

                //TODO: 通知服务器
                axios.post(URL, {
                    action: 'unbind',
                    uid: that.uid,
                    dirname: localsyncdir,
                }).then(function (res) {
                    if (res.data.result === 'OK') {
                        // 服务器成功接收，准备退出
                        utils.LogOut(that.username);
                    }
                }).catch(function (err) {
                    console.log('解绑通知服务端时出错！');
                    console.log(err);
                })
            }
        })
    }

    SyncDir() {
        if (utils.FileExist(UserConfig)) {
            let data = fs.readFileSync(UserConfig, { encoding: 'utf-8' });
            CONFIG = JSON.parse(data);
        }
        else {
            CONFIG = [];
        }
        // 找用户有没有绑定目录
        let is_bind = false;
        let has_logged = false;
        let localsyncdir = '';
        let clientsyncdir = '';
        for (let conf of CONFIG) {
            if (CONFIG.length === 0) {
                break;
            }
            //FIXME: 找到一种确定用户身份的方法
            if (conf.uid === this.uid) {
                has_logged = true;
                localsyncdir = conf.localsyncdir;
                clientsyncdir = conf.clientsyncdir;
                // 绑定了把is_bind改为true
                is_bind = !(localsyncdir === '');
                break;
            }
        }
        

        // 当前登录的用户没有在本机上绑定同步目录
        if (CONFIG.length === 0 || !is_bind) {
            this.InitSync(has_logged);
        }
        // 当前用户已经绑定了一个目录
        else {
            this.NormalSync(has_logged, localsyncdir, clientsyncdir);
        }
    }
}

export { Sync };