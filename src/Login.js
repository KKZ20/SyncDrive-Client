import * as utils from '../utils/utils.js';
import { URL } from './Socket.js';
import axios from 'axios';

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
            type: 'signin',
            username: username,
            password: utils.SHA(passwd),
        }).then(function (res) {
            console.log(res);
            if (res.data.result === 'OK') {
                
            }
            else if (res.data.result === 'ERROR') {
                // 登陆失败，显示错误信息，直接退出程序
                console.log(res.data.message);
                process.exit(-1);
            }
        }).catch(function (err) {
            console.log(err);
        })
    }

}

export { Login };