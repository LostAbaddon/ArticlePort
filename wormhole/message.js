const crypto = require("crypto");

class Message {
	mid;
	sign;
	sender = '';
	stamp = 0;
	event = '';
	message = '';

	generate (privKey) {
		this.stamp = this.stamp || Date.now();
		this.sender = this.sender || global.NodeConfig.node.id;
		var data = this.sender + '|' + this.stamp + '|' + this.event + '|' + JSON.stringify(this.message);
		const hash = crypto.createHash('sha256');
		hash.update(data);
		this.mid = hash.digest('base64');
		if (!privKey) return;
		data = this.mid + '|' + data;
		this.sign = crypto.sign('RSA-SHA256', Buffer.from(data, 'utf8'), privKey).toString('base64');
	}
	verify (pubkey) {
		var data = this.sender + '|' + this.stamp + '|' + this.event + '|' + JSON.stringify(this.message);
		const hash = crypto.createHash('sha256');
		hash.update(data);
		var mid = hash.digest('base64');
		console.log('XXXXXXXXXXXXXXXXX    1', mid, this.mid);
		if (mid !== this.mid) return false;
		console.log('XXXXXXXXXXXXXXXXX    2');
		if (!this.sign) return true;
		data = mid + '|' + data;
		var ok = false;
		try {
			ok = crypto.verify('RSA-SHA256', Buffer.from(data, 'utf8'), pubkey, Buffer.from(this.sign, 'base64'));
		}
		catch (err) {
			console.error(err.message);
			ok = false;
		}
		return ok;
	}
	copy () {
		var m = new Message();
		m.sender = this.sender;
		m.stamp = this.stamp;
		m.event = this.event;
		m.message = this.message;
		return m;
	}
}

module.exports = Message;