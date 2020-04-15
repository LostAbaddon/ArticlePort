const protobuf = require('protons');
const keysPBM = protobuf(require('./keys.proto'));

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
	}
};