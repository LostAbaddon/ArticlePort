class UserTraffic {
	conns = {};
	socket = null;
	weight = 0;
	count = 0;
	total = 0;
	incoming = 0;
	outcoming = 0;
	#rate = 0;
	#changed = false;
	prepare (host, port) {
		var conn = this.getConn(host);
		conn.getConn(port);
	}
	getConn (host) {
		var conn = this.conns[host];
		if (!!conn) return conn;
		conn = new NodeTraffic(host);
		this.conns[host] = conn;
		return conn;
	}
	record (host, port, success, bytes, isIn) {
		this.#changed = true;
		this.count ++;
		this.total += bytes;
		if (success) {
			this.weight ++;
		}
		else {
			this.weight --;
		}
		if (isIn) {
			this.incoming += bytes;
		}
		else {
			this.outcoming += bytes;
		}
		var conn = this.getConn(host);
		conn.record(port, success, bytes, isIn);
	}
	getAll () {
		var list = [];
		Object.keys(this.conns).forEach(host => {
			var conn = this.conns[host];
			conn.getAll().forEach(item => list.push(item));
		});
		return list;
	}
	choose () {
		var list = this.getAll();
		var max = list[0].weight, result = [];
		list.forEach(item => {
			if (item.weight > max) {
				max = item.weight;
				result = [item];
			}
			else if (item.weight < max) return;
			else result.push(item);
		});
		var len = result.length;
		len = Math.floor(Math.random() * len);
		return result[len];
	}
	get rate () {
		if (this.#changed) {
			let a = 0, b = 0;
			if (this.total > 0) a = (this.incoming - this.outcoming) / this.total;
			if (this.count > 0) b = this.weight / this.count;
			this.#rate = a * (1 + b) / 2;
			this.#changed = false;
		}
		return this.#rate;
	}
}
class NodeTraffic {
	conns = {};
	host = '';
	weight = 0;
	count = 0;
	total = 0;
	incoming = 0;
	outcoming = 0;
	#rate = 0;
	#changed = false;
	constructor (host) {
		this.host = host;
	}
	getConn (port) {
		var conn = this.conns[port];
		if (!!conn) return conn;
		conn = new ConnTraffic(port);
		this.conns[port] = conn;
		return conn;
	}
	record (port, success, bytes, isIn) {
		this.#changed = true;
		this.count ++;
		this.total += bytes;
		if (success) {
			this.weight ++;
		}
		else {
			this.weight --;
		}
		if (isIn) {
			this.incoming += bytes;
		}
		else {
			this.outcoming += bytes;
		}
		var conn = this.getConn(port);
		conn.record(success, bytes, isIn);
	}
	getAll () {
		var list = [];
		Object.keys(this.conns).forEach(port => {
			var conn = this.conns[port];
			var item = {};
			item.host = this.host;
			item.port = conn.port;
			item.weight = conn.weight;
			item.count = conn.count;
			item.total = conn.total;
			item.incoming = conn.incoming;
			item.outcoming = conn.outcoming;
			item.rate = conn.rate;
			list.push(item);
		});
		return list;
	}
	get rate () {
		if (this.#changed) {
			let a = 0, b = 0;
			if (this.total > 0) a = (this.incoming - this.outcoming) / this.total;
			if (this.count > 0) b = this.weight / this.count;
			this.#rate = a * (1 + b) / 2;
			this.#changed = false;
		}
		return this.#rate;
	}
}
class ConnTraffic {
	port = 0;
	weight = 0;
	count = 0;
	total = 0;
	incoming = 0;
	outcoming = 0;
	#rate = 0;
	#changed = false;
	constructor (port) {
		this.port = port;
	}
	record (success, bytes, isIn) {
		this.#changed = true;
		this.count ++;
		this.total += bytes;
		if (success) {
			this.weight ++;
		}
		else {
			this.weight --;
		}
		if (isIn) {
			this.incoming += bytes;
		}
		else {
			this.outcoming += bytes;
		}
	}
	get rate () {
		if (this.#changed) {
			let a = 0, b = 0;
			if (this.total > 0) a = (this.incoming - this.outcoming) / this.total;
			if (this.count > 0) b = this.weight / this.count;
			this.#rate = a * (1 + b) / 2;
			this.#changed = false;
		}
		return this.#rate;
	}
}

module.exports = {
	UserTraffic,
	NodeTraffic,
	ConnTraffic
};