import process from 'process';
import minimist from 'minimist';
import inquirer from 'inquirer';

import { Login } from './Login.js';
const PARANUM = 2;

function Usage() {
    console.log('usage');
}
if (process.argv.length > 3) {
    console.log('参数输入有误！');
    Usage();
    process.exit(-1);
}

let args = minimist(process.argv.slice(2));
if (args.hasOwnProperty('r') || args.hasOwnProperty('register')) {
    //TODO: 注册
    //TODO: 登录
    let username = '';
    let passwd = '';
    inquirer.prompt([
        {
            type: 'string',
            message: '请输入用户名',
            name: 'username',
        },
        {
            type: 'password',
            message: '请输入密码',
            name: 'passwd',
            validate: function (val) {
                if (val.match(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[`~()#?!@$%^&*,_+={}<>/|:;'".-]).{8,32}$/)) {
                    return true;
                }
                return "密码至少应8位，且应同时包含大小写字母、数字和符号";
            }
        },
        {
            type: 'password',
            message: '请确认密码',
            name: 'passwd2',
            validate: function (val, ans) {
                if (val === ans.passwd) {
                    return true;
                }
                return "两次密码输入不一致！";
            }
        }
    ]).then(answers => {
        username = answers.username;
        passwd = answers.passwd;
        console.log('用户名：', username);
        console.log('密码：', passwd);
    });
}

else if (args.hasOwnProperty('u') || args.hasOwnProperty('user')) {
    //TODO: 登录
    let username = '';
    let passwd = '';
    inquirer.prompt([
        {
            type: 'string',
            message: '请输入用户名',
            name: 'username',
        },
        {
            type: 'password',
            message: '请输入密码',
            name: 'passwd'
        }
    ]).then(answers => {
        username = answers.username;
        passwd = answers.passwd;
        let userinfo = new SignIn(username, passwd);
    });
}
else if (args.hasOwnProperty('h') || args.hasOwnProperty('help') || process.argv.length === 2) {
    Usage();
}
else {
    console.log('参数输入有误！');
    Usage();
}
