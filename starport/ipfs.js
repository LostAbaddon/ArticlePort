const Path = require('path');
const FS = require('fs');
const { spawn } = require('child_process');
const getJSON = _('Utils.getJSON');
const saveFile = _('Utils.saveFile');

const RetryDelay = 1000 * 60;
const UpdateDelay = 1000 * 60 * 10;
const ResponsingTimeout = 1000 * 30;
const PublishTimeout = 1000 * 60 * 3;
const ResourceExpire = 1000 * 60 * 60 * 24; // 一周后自动删除资源
const ResourceSaveDelay = 1000 * 10;
const ResourceExpireDelay = 1000 * 60 * 60;

const IPFS = {};
const watchList = {};
const publishPending = [];
const currentPending = [];
const FolderPath = Path.join(process.cwd(), 'field');
const ShowLog = false;
var lastHash = '';

const runCMD = (cmd, onData, onError, onWarning, timeout=ResponsingTimeout) => new Promise(res => {
	var logcmd = cmd.join(' ');
	var closer = () => {
		try {
			worker.kill('SIGINT');
		} catch {}
		if (!!onError) onError(new Error('请求超时，请稍后再试……'));
		res();
	};
	var timeouter;
	if (timeout > 0) timeouter = setTimeout(closer, timeout);
	var worker = spawn(IPFS.cmd, [...cmd, '--config=' + IPFS.path]);
	var result = '';
	worker.stdout.on('data', data => {
		if (timeout > 0) {
			clearTimeout(timeouter);
			timeouter = setTimeout(closer, timeout);
		}
		data = data.toString();
		if (ShowLog) console.log(logcmd + ' :', data);
		result = result + data;
	});
	worker.stdout.on('error', err => {
		if (timeout > 0) {
			clearTimeout(timeouter);
			timeouter = setTimeout(closer, timeout);
		}
		err = err.toString();
		if (ShowLog) console.error(logcmd + ' >', err);
		if (!!onError) onError(err);
	});
	worker.stderr.on('data', data => {
		if (timeout > 0) {
			clearTimeout(timeouter);
			timeouter = setTimeout(closer, timeout);
		}
		data = data.toString();
		if (ShowLog) console.log(logcmd + ' |', data);
		if (!!onWarning) onWarning(data);
	});
	worker.on('close', data => {
		if (timeout > 0) clearTimeout(timeouter);
		timeouter = null;
		closer = null;
		if (!!onData) onData(result);
		res(result);
	});
});
const changeMultiAddressPort = (addr, port) => {
	addr = addr.split('/');
	addr[addr.length - 1] = port;
	return addr.join('/');
};
const resolveAndFetch = async node => {
	console.log('开始获取节点更新：' + node);
	if (!watchList[node]) return;
	var hash;
	try {
		hash = await IPFS.resolve(node);
	}
	catch (err) {
		setTimeout(() => resolveAndFetch(node), RetryDelay);
		return;
	}
	console.log('获取节点新哈希：' + node + ' ==> ' + hash);
	var info = watchList[node];
	if (!info) return;
	if (!hash) {
		setTimeout(() => resolveAndFetch(node), RetryDelay);
		return;
	}
	if (info.hash !== hash) {
		let path;
		try {
			path = await IPFS.downloadFolder(node, hash);
		}
		catch (err) {
			setTimeout(() => resolveAndFetch(node), RetryDelay);
			return;
		}
		info.hash = hash;
		console.log('获取节点内容：' + path);
		info.stamp = Date.now();
		global.ContentUpdated(node, hash, path);
	}
	else {
		console.log('节点无更新：' + node);
	}
	setTimeout(() => resolveAndFetch(node), UpdateDelay);
};
const getLocalFile = filepath => new Promise((res, rej) => {
	FS.readFile(filepath, 'utf8', (err, data) => {
		if (!!err) {
			return rej(err);
		}
		data = data.toString();
		res(data);
	});
});

const ResourceManager = {
	mapFile: Path.join(process.cwd(), 'storage', 'resourceMap.json'),
	resources: {},
	saver: null,
	init: async () => {
		var map = await getJSON(ResourceManager.mapFile);
		var exists = await ResourceManager.checkFolder();
		Object.keys(map).forEach(name => {
			if (!exists[name]) delete map[name];
		});
		Object.keys(exists).forEach(name => {
			if (!map[name]) map[name] = exists[name];
		});
		ResourceManager.resources = map;
		ResourceManager.expire();
		setInterval(ResourceManager.expire, ResourceExpireDelay);
	},
	checkFolder: () => new Promise(res => {
		var exists = {};
		FS.readdir(FolderPath, (err, list) => {
			if (!!err) return res(exists);
			var count = list.length;
			if (count === 0) return res(exists);
			list.forEach(name => {
				var subPath = Path.join(FolderPath, name);
				FS.stat(subPath, (err, stat) => {
					count --;
					if (!err && !!stat && (stat.isFile() || stat.isDirectory())) {
						exists[name] = {
							stamp: Math.round(stat.birthtimeMs),
							isDir: stat.isDirectory()
						};
					}
					if (count === 0) res(exists);
				});
			});
		});
	}),
	waitAndSave: () => {
		if (!!ResourceManager.saver) clearTimeout(ResourceManager.saver);
		ResourceManager.saver = setTimeout(ResourceManager.save, ResourceSaveDelay);
	},
	save: () => new Promise(async res => {
		if (!!ResourceManager.saver) {
			clearTimeout(ResourceManager.saver);
			ResourceManager.saver = null;
		}
		await saveFile(ResourceManager.mapFile, JSON.stringify(ResourceManager.resources));
		res();
	}),
	set: (name, isDir=false) => {
		ResourceManager.resources[name] = { stamp: Date.now(), isDir };
		ResourceManager.waitAndSave();
	},
	expire: () => new Promise(res => {
		var targets = [];
		var now = Date.now();
		Object.keys(ResourceManager.resources).forEach(name => {
			var stat = ResourceManager.resources[name];
			var time = stat.stamp;
			if (now - time >= ResourceExpire) targets.push([name, stat]);
		});
		var count = targets.length;
		if (count === 0) return res();
		var callback = (path, err) => {
			count --;
			if (!!err) {
				console.error('删除 ' + path + ' 时出错：' + err.message);
			}
			if (count === 0) {
				res();
			}
		};
		targets.forEach(async item => {
			var [name, stat] = item;
			var path = Path.join(FolderPath, name);
			if (stat.isDir) {
				FS.rmdir(path, { recursive: true }, err => {
					callback(path, err);
				});
			}
			else {
				FS.unlink(path, err => {
					callback(path, err);
				});
			}
		});
	}),
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
		}, console.error, console.warn, -1
	);
});
IPFS.initUser = () => new Promise(async (res, rej) => {
	try {
		await runCMD(['init'], res, rej);
	}
	catch (err) {
		rej(err);
	}
});
IPFS.uploadFolder = path => new Promise(async (res, rej) => {
	try {
		await runCMD(
			['add', '-r', path],
			data => {
				var hashes = {};
				data.split(/\n+/)
					.filter(l => l.indexOf('added') >= 0)
					.map(l => l.replace(/^added */i, '').trim())
					.forEach(l => {
						l = l.split(/ +/);
						hashes[l[1]] = l[0];
					})
				;
				path = path.split(/[\\\/]/);
				path = path.last;
				res(hashes[path]);
			}, rej
		);
	}
	catch (err) {
		rej(err);
	}
});
IPFS.uploadFile = file => new Promise(async (res, rej) => {
	try {
		await runCMD(
			['add', file],
			data => {
				var hash = data.split('added').filter(l => l.length > 0).map(l => l.trim().replace(/\n+/g, '').split(/ +/))[0];
				if (!hash) return res(null);
				res(hash[0]);
			}, rej
		);
	}
	catch (err) {
		rej(err);
	}
});
IPFS.downloadFolder = (cid, hash) => new Promise(async (res, rej) => {
	var path = Path.join(FolderPath, cid);
	try {
		await runCMD(
			['get', hash, '--output=' + path],
			data => {
				ResourceManager.set(hash, true);
				res(path);
			}, rej
		);
	}
	catch (err) {
		rej(err);
	}
});
IPFS.downloadFile = hash => new Promise(async (res, rej) => {
	var filepath = Path.join(FolderPath, hash);
	var file;
	try {
		file = await getLocalFile(filepath);
	}
	catch {
		file = null;
	}
	if (!!file) {
		ResourceManager.set(hash, false);
		return res(file);
	}

	try {
		await runCMD(
			['get', hash, '--output=' + filepath],
			async data => {
				try {
					file = await getLocalFile(filepath);
					ResourceManager.set(hash, false);
				}
				catch {
					file = null;
				}
				return res(file);
			}, rej
		);
	}
	catch (err) {
		rej(err);
	}
});
IPFS.publish = hash => new Promise(async (res, rej) => {
	if (publishPending.length === 0) {
		try {
			await runCMD(
				['name', 'publish', hash, '--allow-offline'],
				async data => {
					data = data.split(':')[0].replace('Published to ', '');
					res(data);
					var loops = currentPending.splice(0, currentPending.length);
					loops.forEach(r => r(data));

					if (publishPending.length > 0) {
						publishPending.forEach(r => currentPending.push(r));
						publishPending.splice(0, publishPending.length);
						try {
							await IPFS.publish(lastHash);
						}
						catch (err) {
							console.error('发布更新失败：' + err.message);
						}
					}
				}, rej, null, PublishTimeout
			);
		}
		catch (err) {
			rej(err);
		}
	}
	else {
		lastHash = hash;
		publishPending.push(res);
	}
});
IPFS.resolve = hash => new Promise(async (res, rej) => {
	try {
		await runCMD(
			['name', 'resolve', hash],
			data => {
				data = data.trim().replace(/^\n+|\n+$/g, '').trim().replace(/^([\\\/])ipfs\1/i, '');
				res(data);
			}, rej
		);
	}
	catch (err) {
		rej(err);
	}
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
IPFS.getConnections = hash => new Promise(async (res, rej) => {
	try {
		await runCMD(
			['dht', 'findpeer', hash],
			data => {
				data = data.split(/\n+/).map(c => c.trim()).filter(c => c.length > 0);
				data = data.map(l => {
					var match = l.match(/^\/ip[46]\/([\w\.:]+)\/(tcp\d*|udp\d*)\/(\d+)$/i);
					if (!match) return null;
					var ip = match[1];
					if (ip === '::1' || ip === '0.0.0.0' || ip === '127.0.0.1') return; // 去除本机地址
					var protocol = match[2].toLowerCase();
					if (protocol !== 'tcp') return; // 只考虑 TCP 连接
					var port = match[3] * 1;
					return {ip, port};
				}).filter(c => !!c);
				res(data);
			}, rej
		);
	}
	catch (err) {
		rej(err);
	}
});
IPFS.getNodeInfo = () => new Promise(async (res, rej) => {
	try {
		await runCMD(
			['id'],
			data => {
				try {
					data = JSON.parse(data);
				}
				catch (err) {
					console.error(err.message);
					return res(null);
				}
				res(data);
			}, rej
		);
	}
	catch (err) {
		rej(err);
	}
});

ResourceManager.init();

global.IPFS = IPFS;
module.exports = IPFS;