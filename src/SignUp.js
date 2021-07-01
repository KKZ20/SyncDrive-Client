import * as utils from '../utils/utils.js';
import { URL } from './Socket.js';
import axios from 'axios';
import sha256 from 'sha256';


class SignUp {
    constructor(username_, passwd_) {
        this.username = username_;
        this.passwd = passwd_;
    }
    register() {
        let username = this.username;
        let passwd = this.passwd;
        // console.log('SignUp类-username', username);
        // console.log('SignUp类-passwd', passwd);
        axios({
            method: 'POST',
            url: URL,
            data: {
                action: 'signup',
                username: username,
                password: sha256(passwd),
            },
            headers: {
                'Connection': 'keep-alive',
            }
        }).then(function (res) {
            if (res.data.result === 'OK') {
                console.log('注册成功！请重新启动程序进行登录！');
                // process.exit(-1);
                return utils.OK;
            }
            else if (res.data.result === 'ERROR') {
                console.log('用户名已存在，请重新注册！');
                // process.exit(-1);
                return utils.ERROR;
            }
        }).catch(function (err) {
            console.log('连接出错！');
            console.log(err);
        })
    }

}

export { SignUp };