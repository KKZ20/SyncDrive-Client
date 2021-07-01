import sha256 from "sha256";
import fs from 'fs';
import path from "path";
import { CHUNKSIZE } from "../src/Socket.js";
import inquirer from 'inquirer';
import * as log from '../src/Log.js';

const OK = 1;
const ERROR = -1;
// SHA256加密
let SHA = (str) => sha256(str);

// 判断一个文件是否存在
let FileExist = (str) => fs.existsSync(str);

// 根据一个文件路径，返回文件全部内容和hash列表
function GenerateHashList(filePath) {
    if (fs.statSync(filePath).isDirectory()) {
        return { chunkList: [], hashList: [], chunkNum: 0 };
    }
    let fd = fs.openSync(filePath);
    let buffer = Buffer.alloc(CHUNKSIZE);
    let chunkList = [];
    let hashList = [];
    while (1) {
        let bytes = fs.readSync(fd, buffer, { length: CHUNKSIZE });
        if (bytes === 0) {
            break;
        }
        // console.log(buffer.toString());
        // console.log(bytes);
        let tmp = buffer.toString(undefined, 0, bytes);
        // content += tmp;
        chunkList.push(tmp);
        buffer.fill();
        hashList.push(sha256(tmp));
    }
    return { chunkList: chunkList, hashList: hashList, chunkNum: chunkList.length };
}

// 根据一个文件路径，返回文件的状态信息
function GetFileState(filePath) {
    let stat = fs.statSync(filePath);
    return { size: stat.size, mtime: stat.mtime, type: stat.isDirectory() };
}

// UTC时间转为本地时间
function formatDate (date) {  
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    m = m < 10 ? ('0' + m) : m;
    var d = date.getDate();
    d = d < 10 ? ('0' + d) : d;
    var h = date.getHours();
    h = h < 10 ? ('0' + h) : h;
    var minute = date.getMinutes();
    minute = minute < 10 ? ('0' + minute) : minute;
    var second = date.getSeconds();
    second = second < 10 ? ('0' + second) : second;
    return y + '-' + m + '-' + d + ' ' + h + ':' + minute + ':' + second;
}; 

// 读取一个目录下的的全部文件列表（含子目录）
function GetFileList(dir, list =[]) {
    let arr = fs.readdirSync(dir);
    // console.log(arr);
    arr.forEach(item => {
        let fullPath = dir + '/' + item;
        // let fullPath = path.join(dir, item);
        let stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
        list.push(fullPath);
        GetFileList(fullPath, list);
        }
        else {
        list.push(fullPath);
        }
    });
    return list;
}

// 退出登录
function LogOut(username) {
    inquirer.prompt([
        {
            type: 'input',
            message: '输入exit退出登录',
            name: 'logout',
            validate: function (val) {
                if (val.toUpperCase() === 'EXIT') {
                    return true;
                }
                else {
                    return '';
                }
            }
        }
    ]).then(ans => {
        log.ClientLog(new log.Log(username, log.LOGTYPE.QUIT, '', '', ''));
        console.log('退出登录！');
        process.exit(-1);
    })
}

export { OK, ERROR };
export { SHA };
export { FileExist };
export { GetFileState, GenerateHashList };
export { formatDate };
export { GetFileList };
export { LogOut };