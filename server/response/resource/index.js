module.exports = {
	type: {
		get: 'auto'
	},
	get: (param, rest, path, ctx) => new Promise(async res => {
		var hash = rest[1];
		var type = (rest[0] || 'application/json').toLowerCase();
		if (!hash) {
			ctx.type = 'application/json';
			ctx.body = {
				message: 'Wrong Resource Hash',
				code: 404,
				ok: false
			};
			return res();
		}

		var file = await IPFS.downloadFile(hash, false);
		ctx.body = file;
		ctx.type = type;
		res();
	})
}