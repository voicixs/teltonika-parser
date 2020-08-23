import net from 'net';
import teltonikaParser  from './functions'
import { LISTEN_PORT } from "babel-dotenv"

var server = net.createServer();
server.on('connection', teltonikaParser);
server.listen(LISTEN_PORT);



