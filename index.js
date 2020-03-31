const Path = require('path');
const FS = require('fs');

require("./contentManager");
require("./nodeManager");
require("./core");
// require("./core/events/delaytrigger.js");
// require("./core/datastore/lrucache.js");
loadall("./core/commandline");

const vueService = require('@vue/cli-service');
const IPFS = require('./ipfs');

const CLP = _('CL.CLP');
const setStyle = _('CL.SetStyle');

process.on('unhandledRejection', (reason, promise) => {
	console.log('xxxxxxxxxxxxxxxxxxxx');
	console.log(reason);
	console.log(promise);
});

// 系统参数

const CSP_Name = "内容星门（Contverse StarPort）";
const CSP_Version = "0.0.1";
const CSP_Default_Config = './config.json';

// 配置命令行工具

const clp = CLP({
	mode: 'process',
	title: CSP_Name + " v" + CSP_Version,
})
.describe(setStyle(CSP_Name + " v" + CSP_Version, "bold"))
.addOption('--config -c <path> >> 指定配置文件')
.addOption('--dev >> 开发模式，不自动 build Vue 和启动 IPFS daemon')
.on('command', async (param, command) => {
	var cfgPath = CSP_Default_Config;
	if (param.config) cfgPath = param.path || CSP_Default_Config;
	cfgPath = getFullPath(cfgPath);
	var config;
	try {
		config = await readConfig(cfgPath);
	} catch (err) {
		if (err.code === 'MODULE_NOT_FOUND') {
			console.error('指定的配置文件找不到！\n' + cfgPath);
		}
		else if (err.code === 'NO_CONFIG_FOLDER' || err.code === 'CONFIG_FILE_DESTROYED') {
			console.error(err.message);
		}
		else {
			console.error(err);
		}
		process.exit();
		return;
	}

	console.log(setStyle('内容星站已接入星网', 'bold'));
	console.log('节点配置目录：' + config.user);
	console.log('     节点 ID：' + config.node.id);

	global.NodeConfig = config;

	var actions;
	if (!param.dev) {
		actions = [];

		// 检查前端页面是否准备就绪
		actions.push(checkFrontend());
		// 启动 IPFS
		actions.push(IPFS.start(config.port - 4000));

		try {
			await Promise.all(actions);
		}
		catch (err) {
			console.error('核心组件启动失败：\n' + err.message);
			process.exit();
			return;
		}
	}

	actions = [];
	actions.push(global.ContentManager.init());
	actions.push(global.NodeManager.init());
	await Promise.all(actions);

	require('./server')(config.port, () => {
		console.log(setStyle('星站开始工作！', 'bold'));
	});
})
;

// 辅助函数

const getFullPath = path => {
	if (!!path.match(/^(\/|\w:[\\\/])/)) return path;
	return Path.join(__dirname, path);
};
const readConfig = filepath => new Promise(async (res, rej) => {
	var config = require(filepath);
	config.user = getFullPath(config.user);
	if (config.port < 5000) config.port += 5000;
	IPFS.cmd = config.ipfs;
	IPFS.path = config.user;

	try {
		FS.readdirSync(config.user);
	} catch (err) {
		if (err.code === 'ENOENT') {
			try {
				await IPFS.initUser();
			} catch (err) {
				err = new Error('用户配置目录不存在且创建失败！\n' + config.user);
				err.code = 'NO_CONFIG_FOLDER';
				rej(err);
				return;
			}
		}
		else {
			rej(err);
			return;
		}
	}

	var file, path = Path.join(config.user, 'config');
	try {
		file = FS.readFileSync(path);
		file = file.toString();
		file = JSON.parse(file);
	} catch (err) {
		err = new Error('IPFS 节点配置目录损坏，请删除后重新初始化节点配置信息，或导入配置数据。\n' + path);
		err.code = 'CONFIG_FILE_DESTROYED';
		rej(err);
		return;
	}

	config.node = {
		id: file.Identity.PeerID,
		key: file.Identity.PrivKey
	};
	res(config);
});
const checkFrontend = () => new Promise((res, rej) => {
	FS.readdir('./dist', (err, ctx) => {
		if (!!err) {
			if (err.code === 'ENOENT') {
				console.log('前端页面尚未部署，请稍等……');
				return buildFrontend(res);
			}
			else {
				err = new Error('前端页面部署目录出错！');
				err.code = 'FOLDER_ERROR';
				rej(err);
				return;
			}
		}
		res();
	});
});
const buildFrontend = res => {
	var service = new vueService(process.cwd());
	service.run('build', {
		_: ['build'],
		modern: false,
		report: false,
		'report-json': false,
		'inline-vue': false,
		watch: false,
		open: false,
		copy: false,
		https: false,
		verbose: false
	}, ['build']).then(res);
};

clp.launch();