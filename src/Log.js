import fs from 'fs';

const LOGTYPE = {
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    QUIT: 4,
};

const OPERATION = {
    UPLOAD: 1,
    DOWNLOAD: 2,
    REMOVE: 6,
    REMOVELOCAL: 7,
    BIND: 3,
    UNBIND: 4,
    REBIND: 5,
    RENAME: 8,
};


class Log {
    constructor(username_, logType_, logTime_, target_, operation_, flash_ = false) {
        // 哪个用户（作为文件名）
        this.username = username_;
        // 日志类型[INFO]、[WARNING]、[ERROR]
        this.logType = logType_;
        // 日志时间
        this.logTime = logTime_;
        // 操作对象
        this.target = target_;
        // 操作类型
        this.operation = operation_;
        // 是否“秒”
        this.flash = flash_;
    }
}

function ClientLog(log) {
    let logcontent = '';
    
    // 记录类型
    switch (log.logType) {
        case LOGTYPE.INFO:
            logcontent += '[INFO]';
            break;
        case LOGTYPE.WARNING:
            logcontent += '[WARNING]';
            break;
        case LOGTYPE.ERROR:
            logcontent += '[ERROR]';
            break;
        case LOGTYPE.QUIT:
            logcontent += '\n------------------退出登录------------------\n\n';
            break;

    }
    if (log.logType !== LOGTYPE.QUIT) {
        // 记录时间
        // // var myDate = new Date();
        // // logcontent += (myDate.toLocaleString() + ' ');
        logcontent += (log.logTime + ' ');

        // 记录操作
        switch (log.operation) {
            case OPERATION.UPLOAD:
                logcontent += '同步（上传）';
                logcontent += (log.flash ? '【秒】' : '');
                logcontent += ': ';
                break;
            case OPERATION.DOWNLOAD:
                logcontent += '同步（下载）';
                logcontent += (log.flash ? '【秒】' : '');
                logcontent += ': ';
                break;
            case OPERATION.BIND:
                logcontent += '绑定目录: ';
                break;
            case OPERATION.REBIND:
                logcontent += '换绑目录: ';
                break;
            case OPERATION.UNBIND:
                logcontent += '解绑目录: ';
                break;
            case OPERATION.REMOVE:
                logcontent += '删除文件（服务端）: ';
                break;
            case OPERATION.REMOVELOCAL:
                logcontent += '删除文件（本地）: ';
                break;
            case OPERATION.RENAME:
                logcontent += '本地文件改名: ';
                break;
        }

        // 记录操作对象
        logcontent += log.target;
        logcontent += '\n';
    }
    

    // 追加写入文件
    let logFileName = '../log/' + log.username + '.log';
    fs.writeFileSync(logFileName, logcontent, { encoding: 'utf-8', flag: 'a' });

}

export { LOGTYPE, OPERATION };
export { Log };
export { ClientLog };