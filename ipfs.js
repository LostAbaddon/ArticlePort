const Path = require('path');
const { spawn } = require('child_process');

const RetryDelay = 1000 * 60 * 5;

const IPFS = {};
const watchList = {};
const publishPending = [];
const currentPending = [];
var lastHash = '';

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
const changeMultiAddressPort = (addr, port) => {
	addr = addr.split('/');
	addr[addr.length - 1] = port;
	return addr.join('/');
};
const resolveAndFetch = async node => {
	if (!watchList[node]) return;
	var hash = await IPFS.resolve(node);
	var info = watchList[node];
	if (!info) return;
	if (!hash) {
		setTimeout(() => {
			if (!watchList[node]) return;
			resolveAndFetch(node);
		}, RetryDelay);
		return;
	}
	info.hash = hash;
	var path = await IPFS.downloadFolder(node, hash);
	info.stamp = Date.now();
	global.ContentUpdated(node, hash, path);
};

IPFS.start = port => new Promise(res => {
	if (!!IPFS.ipfs) return;

	var file, path = Path.join(IPFS.path, 'config');
	try {
		file = require('fs').readFileSync(path);
		file = file.toString();
		file = JSON.parse(file);
	} catch (err) {
		err = new Error('IPFS 节点配置目录损坏，请删除后重新初始化节点配置信息，或导入配置数据。\n' + path);
		err.code = 'CONFIG_FILE_DESTROYED';
		throw err;
	}

	file.Addresses.Swarm = file.Addresses.Swarm.map(addr => changeMultiAddressPort(addr, port));
	file.Addresses.API = changeMultiAddressPort(file.Addresses.API, port + 1000);
	file.Addresses.Gateway = changeMultiAddressPort(file.Addresses.Gateway, port + 4100);
	require('fs').writeFileSync(path, JSON.stringify(file, '\t', 4), 'utf8');

	IPFS.ipfs = runCMD(['daemon', '--enable-namesys-pubsub'],
		log => {
			console.log(log.replace(/^\n+|\n+$/g, ''));
			if (log.indexOf('Daemon is ready') >= 0) res();
		}, console.error, console.warn
	);
});
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
IPFS.downloadFolder = (cid, hash) => new Promise(async (res, rej) => {
	var logs = '', finished = false;
	var path = Path.join(process.cwd(), 'field/' + cid);
	await runCMD(
		['get', hash, '--output=' + path],
		data => {
			logs += data + '\n';
		},
		err => {
			finished = true;
			rej(err);
		}
	);
	if (finished) return;
	res(path);
});
IPFS.publish = hash => new Promise(async (res, rej) => {
	var logs = '', finished = false;
	if (publishPending.length === 0) {
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
		var loops = currentPending.splice(0, currentPending.length);
		loops.forEach(r => r(logs));

		if (publishPending.length > 0) {
			publishPending.forEach(r => currentPending.push(r));
			publishPending.splice(0, publishPending.length);
			await IPFS.publish(lastHash);
		}
	}
	else {
		lastHash = hash;
		publishPending.push(res);
	}
});
IPFS.resolve = hash => new Promise(async (res, rej) => {
	var logs = '', finished = false;
	await runCMD(
		['name', 'resolve', hash],
		data => {
			logs += data + '\n';
		},
		err => {
			finished = true;
			rej(err);
		}
	);
	if (finished) return;
	logs = logs.trim().replace(/^\n+|\n+$/g, '').trim().replace(/^([\\\/])ipfs\1/i, '');
	res(logs);
});
IPFS.subscribe = hash => {
	watchList[hash] = {
		hash: '',
		stamp: Date.now()
	};
	resolveAndFetch(hash);
};
IPFS.unsubscribe = hash => {
	delete watchList[hash];
};

global.IPFS = IPFS;
module.exports = IPFS;