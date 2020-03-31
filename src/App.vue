<template>
	<div id="app">
		<toolbar />
		<showroom />
		<article-container />
		<image-wall />
		<configuration />
		<node-manager />
		<loadmask />
		<popup />
	</div>
</template>

<script>
import eventBus from './components/eventbus.js';
import loadmask from './components/loadMask.vue';
import popup from './components/popup.vue';
import toolbar from './components/toolbar.vue';
import showroom from './components/showroom.vue';
import article from './components/article.vue';
import imageWall from './components/imagewall.vue';
import configuration from './components/configuration.vue';
import nodeManager from './components/nodeManager.vue';

export default {
	data () {
		return {
			nodeInfo: {}
		};
	},
	components: {
		loadmask,
		popup,
		toolbar,
		showroom,
		articleContainer: article,
		imageWall,
		configuration,
		nodeManager
	},
	mounted () {
		this.$net.register('RequestStarPortInfo', (msg, err, event) => {
			eventBus.emit('loadFinish');
			if (!!err) {
				eventBus.emit('popupShow', '出错', err);
				return;
			}
			eventBus.emit('updateNodeInfo', {
				name: msg.name,
				id: msg.id
			});
			eventBus.emit('updateTimeline', msg.timeline);
		});
		this.$net.register('TimelineUpdated', (msg, err, event) => {
			eventBus.emit('updateTimeline', msg);
		});

		eventBus.emit('loadStart');
		this.$net.emit('RequestStarPortInfo', ['ArticleMarket', 'ArticleComments']);
	},
	methods: {
	}
}
</script>

<style>
html, body {
	height: 100%;
	margin: 0px;
	padding: 0px;
	background-color: black;
	font-family: 'Avenir', Helvetica, Arial, sans-serif, 宋体;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	color: white;
}
#app {
	width: 100%;
	height: 100%;
	background-color: rgb(22, 24, 35);
	color: rgb(227, 239, 253);
}

.scroller::-webkit-scrollbar {
	width: 12px;
	background-color: transparent;
	cursor: default;
}
.scroller::-webkit-scrollbar-thumb {
	border-radius: 5px;
	background-color: rgb(57, 47, 65);
	box-shadow: inset 2px 2px 3px rgba(186, 202, 198, 0.5);
	cursor: default;
}
.scroller::-webkit-scrollbar-track {
	border-radius: 6px;
	background-color: rgba(186, 202, 198, 0.1);
	box-shadow: inset 2px 2px 3px rgba(22, 24, 35, 0.2);
	cursor: default;
}
.no-select {
	user-select: none;
}
.no-event {
	pointer-events: none;
}
.cursor {
	cursor: pointer;
}
</style>