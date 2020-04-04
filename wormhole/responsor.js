const Responsor = {};

Responsor.shakehand = (sender, msg, res) => {
	console.log(">>>>>>>>", msg, sender.id, sender.address, sender.port);
	res('DONE');
};

module.exports = Responsor;