'use strict';


const EventEmitter = require('events');
const net = require('net');

const uuid = require('uuid/v4');

const port = process.env.PORT || 3001;
const server = net.createServer();
const events = new EventEmitter();
const socketPool = {};

let User = function(socket) {
  let id = uuid();
  this.id = id;
  this.nickname = `User-${id}`;
  this.socket = socket;
};

server.on('connection', (socket) => {
  let user = new User(socket);
  socketPool[user.id] = user;
  socket.on('data', (buffer) => dispatchAction(user.id, buffer));
  socket.on('close', () => {delete socketPool[user.id]; console.log(socketPool);});
  socket.on('error', (err) => {
    console.error('whoops! there was an error');
  });
});

let parse = (buffer) => {

  let text = buffer.toString().trim();
  if ( !text.startsWith('@') ) { return null; }

  let [command,payload] = text.split(/\s+(.*)/);

  if(payload){
  let [target,message] = payload.split(/\s+(.*)/);
  return {command,payload,target,message};
  }

  return {command};
};


let dispatchAction = (userId, buffer) => {
  let entry = parse(buffer);
  entry && events.emit(entry.command, entry, userId);
};

events.on('@all', (data, userId) => {
  for( let connection in socketPool ) {
    let user = socketPool[connection];
    user.socket.write(`<${socketPool[userId].nickname}>: ${data.payload}\n`);
  }
});

events.on('@nickname', (data, userId) => {
  socketPool[userId].nickname = data.target;
});

events.on('@dm', (data, userId) => {
  console.log(data.target);
  console.log(data.message);
  for(var property1 in socketPool){
    if(socketPool[property1].nickname === data.target){
      socketPool[property1].socket.write(`<DM from ${socketPool[userId].nickname}>: ${data.message}\n`);
    }
  }
});

events.on('@quit', (data, userId) => {
  socketPool[userId].socket.write('You successfully logged out.');
  delete socketPool[userId];
  
});

events.on('@list', (data, userId) => {
  let arr = Object.keys(socketPool);
  let nicknames = '';
  for(let i = 0; i < Object.keys(socketPool).length; i++){
    nicknames+=socketPool[arr[i]].nickname + ' ';
  }
  socketPool[userId].socket.write(nicknames);
});

server.listen(port, () => {
  console.log(`Chat Server up on ${port}`);
});