module.exports = {
	type: 'text/plain',
	get: (query, path, ctx) => {
		return 'hello world!';
	},
	post: (query, path, ctx) => {
		return 'aloha kosmos~'
	}
}