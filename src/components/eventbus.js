const EventMap = new Map();
const PipeMap = new Map();

const prepareEvent = event => {
	if (!event) return null;
	var map = EventMap.get(event);
	if (!!map) return map;
	map = [];
	EventMap.set(event, map);
	return map;
};
const preparePipe = event => {
	if (!event) return null;
	var map = PipeMap.get(event);
	if (!!map) return map;
	map = {
		dts: [],
		cbs: []
	};
	PipeMap.set(event, map);
	return map;
};

export default {
	on: (event, callback) => {
		var cbs = prepareEvent(event);
		if (!cbs) return;
		cbs.push([callback, false]);
	},
	once: (event, callback) => {
		var cbs = prepareEvent(event);
		if (!cbs) return;
		cbs.push([callback, true]);
	},
	off: (event, callback) => {
		var cbs = prepareEvent(event);
		if (!cbs) return;
		var index = -1;
		cbs.some((cb, i) => {
			if (cb[0] === callback) {
				index = i;
				return true;
			}
		});
		if (index < 0) return;
		cbs.splice(index, 1);
	},
	clear: (event) => {
		var cbs = prepareEvent(event);
		if (!cbs) return;
		cbs.splice(0, cbs.length);
	},
	emit: (event, ...data) => {
		var cbs = prepareEvent(event);
		if (!cbs) return;
		var current = [...cbs];
		cbs = cbs.filter(cb => !cb[1]);
		EventMap.set(event, cbs);
		current.forEach(cb => {
			cb[0](...data);
		});
	},
	emitAndWait: (event, ...data) => new Promise(async res => {
		var cbs = prepareEvent(event);
		if (!cbs) return res();
		var current = [...cbs];
		cbs = cbs.filter(cb => !cb[1]);
		EventMap.set(event, cbs);
		for (let cb of current) {
			await cb[0](...data);
		}
		res();
	}),
	push: (event, ...data) => new Promise(res => {
		var pipe = preparePipe(event);
		if (!pipe) return res();
		if (pipe.cbs.length === 0) {
			pipe.dts.push([data, res]);
		}
		else {
			let cb = pipe.cbs.shift();
			if (!!cb[0]) cb[0](...data);
			cb[1](...data);
			res();
		}
	}),
	pull: (event, callback) => new Promise((res, rej) => {
		var pipe = preparePipe(event);
		if (!pipe) return res();
		if (pipe.dts.length === 0) {
			pipe.cbs.push([callback, res]);
		}
		else {
			let dt = pipe.dts.shift();
			if (!!callback) callback(...dt[0]);
			dt[1]();
			res(...dt[0]);
		}
	}),
}