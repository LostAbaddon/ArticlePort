const Responsor = [];

Responsor.push({
	event: 'RequestStarPortInfo',
	callback: (data, socket, event) => {
		socket.send('RequestStarPortInfo', {
			name: global.NodeConfig.name,
			id: global.NodeConfig.node.id
		});
	}
});
Responsor.push({
	event: 'GetNodeList',
	callback: (data, socket, event) => {
		var info = {
			nodeinfo: global.NodeManager.getNodeList(),
			timeline: global.ContentManager.getTimeline()
		};
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

module.exports = Responsor;