module.exports = {
	type: {
		get: 'text/plain',
		post: 'application/json'
	},
	get: (query) => {
		return '?????????????';
	},
	post: (query) => {
		return { name: 'name', age: 123 }
	},
	put: (query) => {
		return '????????????'
	},
	delete: (query) => {
		return { action: 'fuck' }
	}
}