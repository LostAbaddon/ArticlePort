const crypto = require("crypto");
const protobuf = require('protons');
const keysPBM = protobuf(require('./keys.proto'));
const base58 = require('bs58');
const multihash = require('multihashes');

const keyMap = new Map();

module.exports = {
	marshal (key, type="RSA") {
		if (String.is(key)) key = Buffer.from(key, 'base64');
		if (type === 'Ed25519') type = 1;
		else if (type === 'Secp256k1') type = 2;
		else type = 0;
		const encoded = keysPBM.Key.encode({Type: type, Data: key});
		return encoded;
	},
	unmarshal (buf) {
		if (String.is(buf)) buf = Buffer.from(buf, 'base64');
		const decoded = keysPBM.Key.decode(buf);
		return decoded.Data;
	},
	pubkey2cid: key => new Promise(async res => {
		var buf = Buffer.from(key, 'base64');
		buf = crypto.createHash('sha256').update(buf).digest();
		buf = await multihash.encode(buf, 'sha2-256');
		res(buf);
	}),
	getPubKey: cid => keyMap.get(cid),
	setPubKey: (cid, key) => new Promise(async res => {
		var bufCid = base58.decode(cid);
		var bufKey = await module.exports.pubkey2cid(key);
		if (!bufCid.equal(bufKey)) return res(false);

		try {
			let buf = module.exports.unmarshal(key);
			key = crypto.createPublicKey({
				key: buf,
				format: 'der',
				type: 'spki'
			});
			keyMap.set(cid, key);
			res(true);
		}
		catch (err) {
			console.error('记录节点 ' + cid + ' 的公钥失败：' + err.message);
			res(false);
		}
	}),
};