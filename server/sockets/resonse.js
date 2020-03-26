const callback = (data, socket, event) => {
	console.log('>>>>>>>>>>>>>>>>>>>>', data);
	socket.send('aloha', 'Aloha Kosmos!');
};

module.exports = {
	event: 'test',
	callback
};