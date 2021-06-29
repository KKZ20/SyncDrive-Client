import sha256 from "sha256";
import fs from 'fs';

const OK = 1;
const ERROR = -1;
// SHA256加密
let SHA = (str) => sha256(str);

// 判断一个文件是否存在
let FileExist = (str) => fs.existsSync(str);

export { OK, ERROR };
export { SHA };
export { FileExist };