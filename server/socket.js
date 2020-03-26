const Path = require('path');
const FS = require('fs');
const EventEmitter = require('events');
const IO = require('socket.io');

var io;
var eventLoop = new EventEmitter();

const init = (server) => {
	io = new IO(server);

	io.on('connection', socket => {
		socket.on('disconnect', () => {
			eventLoop.emit('disconnected', null, socket);
		});
		socket.on('__message__', msg => {
			var event = msg.event, data = msg.data;
			if (!event) return;
			eventLoop.emit(event, data, socket, msg);
		});
		socket.send = (event, data) => {
			socket.emit('__message__', { event, data });
		};
		eventLoop.emit('connected', null, socket);
	});
};
const register = (event, responser) => {
	eventLoop.on(event, responser);
};
const unregister = (event, responser) => {
	eventLoop.off(event, responser);
};

const autoRegister = path => {
	var list = FS.readdirSync(path);
	list.forEach(name => {
		var p = Path.join(path, name);
		var stat = FS.statSync(p);
		if (stat.isFile()) {
			let match = name.match(/^.+\.js$/i);
			if (!match) return;
			let res = require(p);
			if (!res) return;
			register(res.event, res.callback, res.namespace || '');
		}
		else if (stat.isDirectory()) {
			autoRegister(p);
		}
	});
};

autoRegister(Path.join(__dirname, './sockets'));

module.exports = {
	init,
	register,
	unregister,
	get io () {
		return io
	}
};