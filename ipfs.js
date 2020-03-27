const { spawn } = require('child_process');

const IPFS = {};

const runCMD = (cmd, onData, onError, onWarning) => new Promise(res => {
	var worker = spawn(IPFS.cmd, [...cmd, '--config=' + IPFS.path]);
	worker.stdout.on('data', data => {
		if (!!onData) onData(data.toString());
	});
	worker.stdout.on('error', err => {
		if (!!onError) onError(err.toString());
	});
	worker.stderr.on('data', data => {
		if (!!onWarning) onWarning(data.toString());
	});
	worker.on('close', data => {
		res(data);
	});
	return worker;
});

IPFS.start = () => {
	if (!!IPFS.ipfs) return;
	IPFS.ipfs = runCMD(['daemon', '--enable-namesys-pubsub']);
};
IPFS.initUser = () => new Promise(async (res, rej) => {
	var finished = false;
	await runCMD(
		['init'], null,
		err => {
			finished = true;
			rej(err);
		}
	);
	if (finished) return;
	res();
});
IPFS.uploadFolder = path => new Promise(async (res, rej) => {
	var logs = '', finished = false;
	await runCMD(
		['add', '-r', path],
		data => {
			logs += data + '\n';
		},
		err => {
			finished = true;
			rej(err);
		}
	);
	if (finished) return;

	var hashes = {}
	logs.split('added')
		.filter(l => l.length > 0)
		.map(l => l.trim().replace(/\n+/g, ''))
		.forEach(l => {
			l = l.split(/ +/);
			hashes[l[1]] = l[0];
		})
	;
	path = path.split(/[\\\/]/);
	path = path.last;
	res(hashes[path]);
});
IPFS.uploadFile = file => new Promise(async (res, rej) => {
	var logs = '', finished = false;
	await runCMD(
		['add', file],
		data => {
			logs += data + '\n';
		},
		err => {
			finished = true;
			rej(err);
		}
	);
	if (finished) return;

	var hash = logs.split('added').filter(l => l.length > 0).map(l => l.trim().replace(/\n+/g, '').split(/ +/))[0];
	if (!hash) return res(null);
	res(hash[0]);
});
IPFS.publish = hash => new Promise(async (res, rej) => {
	var logs = '', finished = false;
	await runCMD(
		['name', 'publish', hash, '--allow-offline'],
		data => {
			logs += data + '\n';
		},
		err => {
			finished = true;
			rej(err);
		}
	);
	if (finished) return;
	logs = logs.split(':')[0].replace('Published to ', '');
	res(logs);
});

global.IPFS = IPFS;
module.exports = IPFS;