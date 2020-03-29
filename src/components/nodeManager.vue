<template>
	<div class="container scroller" :shown="show ? 'true' : 'false'">
		<div class="title no-select">
			<span>节点管理</span>
			<span class="addNode cursor" @click="showAppendItem">添加节点</span>
		</div>
		<div class="addNewNode" :shown="showAdd ? 'true' : 'false'">
			<input type="text" name="newNodeID" @keyup.enter="appendNode">
			<span class="cursor" @click="appendNode">添加</span>
		</div>
		<div class="nodeList">
			<div class="nodeItem" v-for="item in nodeList" @click="removeNode(item.id)">
				<span class="itemName">{{item.name}}（{{item.id}}）</span>
				<i class="fa fa-minus"></i>
			</div>
		</div>
	</div>
</template>

<script>
import eventBus from './eventbus.js';

export default {
	name: "configuration",
	data () {
		return {
			show: false,
			nodeList: [],
			showAdd: false
		}
	},
	mounted () {
		eventBus.on('showNodeManager', nodeList => {
			this.nodeList.splice(0, this.nodeList.length);
			nodeList.forEach(item => this.nodeList.push(item));
			this.show = true;
			this.showAdd = false;
			eventBus.emit('showMask');
			eventBus.once('maskHidden', () => {
				this.show = false;
			});
		});
		this.$net.register('AddNewNode', nodeList => {
			this.nodeList.splice(0, this.nodeList.length);
			nodeList.forEach(item => this.nodeList.push(item));
		});
		this.$net.register('RemoveNode', nodeList => {
			this.nodeList.splice(0, this.nodeList.length);
			nodeList.forEach(item => this.nodeList.push(item));
		});
	},
	methods: {
		async showAppendItem () {
			this.showAdd = true;
			var inputter = this.$el.querySelector('input[name="newNodeID"]');
			inputter.value = '';
			await wait(50);
			inputter.focus();
		},
		appendNode () {
			var nodeID = this.$el.querySelector('input[name="newNodeID"]').value;
			this.$net.emit('AddNewNode', nodeID);
		},
		removeNode (id) {
			this.$net.emit('RemoveNode', id);
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
	width: 750px;
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
.container .title .addNode {
	position: absolute;
	top: 0px;
	right: 25px;
	opacity: 0;
	transition: all 250ms ease-in-out;
}
.container .title:hover .addNode {
	right: 0px;
	opacity: 1;
}
.container .addNewNode {
	height: 0px;
	margin-bottom: 0px;
	padding: 0px 15px;
	overflow: hidden;
	transition: all 250ms ease-in-out;
}
.container .addNewNode[shown="true"] {
	height: 25px;
	margin-bottom: 10px;
	padding: 0px 15px;
}
.container .addNewNode input {
	width: 650px;
	margin-right: 15px;
	padding: 0px 5px 2px 5px;
	outline: none;
	border: none;
	border-bottom: 1px solid rgb(210, 240, 244);
	background-color: transparent;
}
.container .nodeList:empty {
	text-align: center;
}
.container .nodeList:empty:after {
	content: '没有内容';
}
.container .nodeItem {
	position: relative;
	margin: 0px 5px;
	padding: 5px 10px;
	cursor: pointer;
	box-shadow: 0px 0px 0px 0px rgba(210, 240, 244, 0);
	word-break: break-word;
	transition: all 250ms ease-in-out;
}
.container .nodeItem:hover {
	padding: 10px 10px;
	box-shadow: 2px 2px 5px 1px rgba(210, 240, 244, 0.5);
}
.container .nodeItem .fa-minus {
	position: absolute;
	top: 10px;
	right: 15px;
	box-sizing: border-box;
	width: 20px;
	height: 20px;
	padding-top: 2px;
	border-radius: 15px;
	box-shadow: 1px 1px 2px 1px rgba(227, 227, 227, 0.6);
	opacity: 0;
	text-align: center;
	transition: all 250ms ease-in-out;
}
.container .nodeItem:hover .fa-minus {
	right: 5px;
	opacity: 1;
}
</style>