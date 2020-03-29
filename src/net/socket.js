import config from '../config.js';

export default Vue => {
	var socket = null;

	Object.defineProperties(Vue.$net, {
		"$io": {
			get () {
				return io;
			}
		},
		"$socket": {
			get () {
				return socket;
			}
		}
	});

	// 在加载成功前的注册事件与发送任务
	var taskEmit = [], taskListen = [];
	Vue.$net.emit = function (event, data) {
		taskEmit.push([event, data]);
		return this;
	};
	Vue.$net.register = function (event, data) {
		taskListen.push([event, data]);
		return this;
	};
	Vue.$net.unregister = function (event, callback) {
		var index = -1;
		taskListen.some((l, i) => {
			if (l[0] === event && l[1] === callback) {
				index = i;
				return true;
			}
		});
		if (index < 0) return this;
		taskListen.splice(index, 1);
		return this;
	};

	var onSocketLoaded = () => {
		var responsers = new Map();

		socket = io.connect(config.baseURL);
		socket.on('__message__', msg => {
			var event = msg.event, data = msg.data, err = msg.err;
			if (!event) return;
			var cbs = responsers.get(event);
			if (!cbs || !cbs.size) return;
			for (let cb of cbs) cb(data, err, msg);
		});

		Vue.$net.emit = function (event, data) {
			if (!socket) socket = io.connect(config.baseURL);
			socket.emit('__message__', { event, data });
			return this;
		};
		Vue.$net.register = function (event, callback) {
			var cbs = responsers.get(event);
			if (!cbs) {
				cbs = new Set();
				responsers.set(event, cbs);
			}
			cbs.add(callback);
			return this;
		};
		Vue.$net.unregister = function (event, callback) {
			var cbs = responsers.get(event);
			if (!cbs) return this;
			cbs.delete(callback);
			return this;
		};

		taskListen.forEach(task => Vue.$net.register(...task));
		taskEmit.forEach(task => Vue.$net.emit(...task));

		taskListen.splice(0, taskListen.length);
		taskEmit.splice(0, taskEmit.length);
		taskListen = null;
		taskEmit = null;
	};

	// 从服务器后台加载socket
	var loader = document.createElement('script');
	loader.type = "text/javascript";
	loader.src = config.baseURL + '/socket.io/socket.io.js';
	loader.onload = onSocketLoaded;
	document.body.appendChild(loader);
};