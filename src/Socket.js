import * as utils from '../utils/utils.js';
import fs from 'fs';
import net from 'net';

let serverInfo;
serverInfo = JSON.parse(fs.readFileSync('../conf/socket.json', { encoding: 'utf-8' }));
const URL = 'http://' + serverInfo.server_addr + ':' + serverInfo.server_port;
const CHUNKSIZE = serverInfo.chunk_size;

// let client = new net.Socket();
// // console.log(serverInfo.server_addr);
// client.connect(serverInfo.server_port, serverInfo.server_addr, () => {
//     console.log()
// });

// client.on('data', function (data) {
    
// })

export { URL, CHUNKSIZE };