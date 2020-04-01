const Responsor = [];

Responsor.push({
	event: 'RequestStarPortInfo',
	callback: (data, socket, event) => {
		socket.send('RequestStarPortInfo', {
			name: global.NodeConfig.name,
			id: global.NodeConfig.node.id,
			timeline: global.ContentManager.getTimeline(data)
		});
	}
});
Responsor.push({
	event: 'GetNodeList',
	callback: (data, socket, event) => {
		socket.send('GetNodeList', global.NodeManager.getNodeList());
	}
});
Responsor.push({
	event: 'AddNewNode',
	callback: async (data, socket, event) => {
		try {
			await global.NodeManager.addNode(data);
		}
		catch (err) {
			console.error(err);
			socket.send('AddNewNode', null, err.message);
			return;
		}
		socket.send('AddNewNode', global.NodeManager.getNodeList());
	}
});
Responsor.push({
	event: 'RemoveNode',
	callback: async (data, socket, event) => {
		try {
			await global.NodeManager.removeNode(data);
		}
		catch (err) {
			console.error(err);
			socket.send('RemoveNode', null, err.message);
			return;
		}
		socket.send('RemoveNode', global.NodeManager.getNodeList());
	}
});
Responsor.push({
	event: 'GetTimeline',
	callback: (data, socket, event) => {
		socket.send('GetTimeline', global.ContentManager.getTimeline(data));
	}
});
Responsor.push({
	event: 'GetArticleByID',
	callback: async (data, socket, event) => {
		var article;
		try {
			article = await global.ContentManager.get(data.channel, data.id, data.ipfs);
		}
		catch (err) {
			socket.send('GetArticleByID', null, err.message);
			return;
		}
		socket.send('GetArticleByID', article);
	}
});

module.exports = Responsor;