import * as utils from '../utils/utils.js';
import { URL } from './Socket.js';
import axios from 'axios';
import { Sync } from './Sync.js';

class Login {
    constructor(username_, passwd_) {
        this.username = username_;
        this.passwd = passwd_;
        this.uuid = '';
        this.uid = '';
    }
    login() {
        let username = this.username;
        let passwd = this.passwd;
        axios.post(URL, {
            action: 'signin',
            username: username,
            password: utils.SHA(passwd),
        }).then(function (res) {
            // console.log(res);
            if (res.data.result === 'OK') {
                // 登陆成功
                console.log('你好！', username);
                // 创建一个登录实例
                let clientSync = new Sync(username, res.data.uid);
                // 开始同步
                clientSync.SyncDir();
            }
            else if (res.data.result === 'ERROR') {
                // 登陆失败，显示错误信息，直接退出程序
                // console.log(res.data.message);
                if (res.data.message === 'User does not exist') {
                    console.log('用户不存在！登陆失败');
                    process.exit(-1);
                }
                else if (res.data.message === 'Password is not correct') {
                    console.log('密码错误！登陆失败');
                    process.exit(-1);
                }
                else {
                    console.log('服务端有问题');
                    process.exit(-1);
                }
            }
        }).catch(function (err) {
            console.log(err);
        })
    }

}

export { Login };