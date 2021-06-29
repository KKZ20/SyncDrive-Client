import * as utils from '../utils/utils.js';
import { URL } from './Socket.js';
import axios from 'axios';



class SignUp {
    constructor(username_, passwd_) {
        this.username = username_;
        this.passwd = passwd_;
    }
    register() {
        let username = this.username;
        let passwd = this.passwd;
        console.log('SignUp类-username', username);
        console.log('SignUp类-passwd', passwd);
        axios.post(URL, {
            type: 'signup',
            username: username,
            password: utils.SHA(passwd),
        }).then(function (res) {
            console.log(res);
            if (res.data.result === 'OK') {
                return utils.OK;
            }
        }).catch(function (err) {
            console.log(err);
        })
    }

}

export { SignUp };