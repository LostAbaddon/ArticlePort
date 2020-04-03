module.exports = {
	type: {
		get: 'application/json'
	},
	get: (query) => {
		return {
			name: "Contverse StarPort",
			version: "0.2.0",
			port: global.NodeConfig.webPort
		};
	}
}