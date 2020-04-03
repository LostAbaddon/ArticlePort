<template>
	<div class="container scroller" :shown="show ? 'true' : 'false'">
		<div class="title no-select">
			<span>设置外网端口</span>
		</div>
		<div class="publicPortManager">
			<input type="number" name="publicPort" @keyup.enter="changePort" :value="publicPort">
			<span class="cursor" @click="changePort">确认</span>
		</div>
	</div>
</template>

<script>
import eventBus from './eventbus.js';

export default {
	name: "publicPortManager",
	data () {
		return {
			show: false,
			publicPort: 0
		}
	},
	mounted () {
		eventBus.on('updatePublicPort', port => {
			this.publicPort = port;
		});
		eventBus.on('showPublicPort', nodeList => {
			this.show = true;
			eventBus.emit('showMask');
			eventBus.once('maskHidden', () => {
				this.show = false;
			});
		});
		this.$net.register('publicPortChanged', info => {
			eventBus.emit('loadFinish');
			if (info.success) {
				this.publicPort = info.port;
				eventBus.emit('hideMask');
			}
		});
	},
	methods: {
		changePort () {
			var port = this.$el.querySelector('input[name="publicPort"]').value * 1;
			if (isNaN(port)) return;
			eventBus.emit('loadStart');
			this.$net.emit('changePublicPort', port);
		}
	}
};
</script>

<style scoped>
.container {
	position: fixed;
	display: block;
	box-sizing: border-box;
	top: 0%;
	left: 50%;
	width: 250px;
	max-height: 500px;
	z-index: 2;
	padding: 10px 0px;
	background-color: rgb(22, 24, 35);
	box-shadow: rgba(127, 127, 127, 0.5) 2px 2px 5px 2px;
	overflow: auto;
	color: white;
	transform: translate(-50%, -100%);
	transition: all 250ms ease-in-out;
}
.container[shown="true"] {
	top: 50%;
	transform: translate(-50%, -50%);
}
.container .title {
	position: relative;
	margin-bottom: 10px;
	margin-left: 10px;
	margin-right: 10px;
	padding-bottom: 10px;
	border-bottom: 1px solid rgb(210, 240, 244);
	font-size: 20px;
	font-weight: bolder;
	text-align: center;
}
.container .publicPortManager {
	height: 25px;
	margin-bottom: 0px;
	padding: 0px 15px;
	overflow: hidden;
	transition: all 250ms ease-in-out;
}
.container .publicPortManager input {
	width: 150px;
	margin-right: 15px;
	padding: 0px 5px 2px 5px;
	outline: none;
	border: none;
	border-bottom: 1px solid rgb(210, 240, 244);
	background-color: transparent;
}
</style>