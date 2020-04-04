const Responsor = {};

Responsor.shakehand = (msg, res) => {
	console.log(">>>>>>>>", msg);
	res('DONE|' + global.NodeConfig.node.id);
};

module.exports = Responsor;