import net from 'net';
import teltonikaParser  from './parser'
import { LISTEN_PORT } from "babel-dotenv"

var server = net.createServer();
server.on('connection', teltonikaParser);
server.listen(LISTEN_PORT);



