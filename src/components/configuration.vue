<template>
	<div class="configuration no-select" :shown="show ? 'true' : 'false'">
		<div class="menu-item" @click="manageNodes">管理关注节点</div>
	</div>
</template>

<script>
import eventBus from './eventbus.js';

export default {
	name: "configuration",
	data () {
		return {
			show: false
		}
	},
	mounted () {
		this.$net.register('GetNodeList', async (msg, err) => {
			eventBus.emit('loadFinish');
			if (!!err) {
				eventBus.emit('popupShow', '出错', err);
				return;
			}
			eventBus.emit('showNodeManager', msg.nodeinfo);
			console.log(msg.timeline);
		});
		eventBus.on('toggleConfigMenu', info => {
			if (this.show) {
				eventBus.emit('hideMask');
			}
			else {
				eventBus.emit('showMask');
				eventBus.once('maskHidden', () => {
					this.show = false;
				});
				this.show = true;
			}
		});
		eventBus.on('configMenuHide', () => {
			this.show = false;
		});
	},
	methods: {
		manageNodes () {
			eventBus.emit('hideMask');
			this.$net.emit('GetNodeList');
			eventBus.emit('loadStart');
		}
	}
};
</script>

<style scoped>
.configuration {
	position: fixed;
	display: block;
	box-sizing: border-box;
	top: 0px;
	right: 20px;
	width: 200px;
	z-index: 2;
	padding: 10px 0px;
	background-color: rgb(22, 24, 35);
	box-shadow: rgba(127, 127, 127, 0.5) 2px 2px 5px 2px;
	color: white;
	transform: translateY(-100%);
	transition: all 250ms ease-in-out;
}
.configuration[shown="true"] {
	top: 50px;
	transform: translateY(0);
}

.configuration .menu-item {
	position: relative;
	display: block;
	box-sizing: border-box;
	left: 0px;
	margin: 5px 0px;
	padding: 5px 10px;
	border-left: 0px solid rgba(0, 0, 0, 0);
	background-color: rgb(22, 24, 35);
	box-shadow: 0px 0px 0px 0px rgba(0, 0, 0, 0);
	transition: all 250ms ease-in-out;
	cursor: pointer;
}
.configuration .menu-item:hover {
	left: -20px;
	background-color: rgb(0, 0, 0);
	border-left: 5px solid rgba(128, 29, 174, 1);
	box-shadow: 1px 1px 5px 1px rgba(233, 241, 246, 0.3);
}
</style>