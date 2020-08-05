<template>
	<div id="app"
		@keyup.left="turnLeft" @keyup.right="turnRight"
		@keyup.up="moveUp" @keyup.down="moveDown"
		@keyup.home="goTop" @keyup.end="goBottom"
		@keyup.page-up="goPrev" @keyup.page-down="goNext"
		tabindex="0">
		<toolbar />
		<showroom />
		<article-container />
		<image-wall />
		<configuration />
		<node-manager />
		<port-manager />
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
import portManager from './components/publicPort.vue';

export default {
	data () {
		return {
			nodeInfo: {},
			imageShown: false,
			userID: '',
			userName: ''
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
		nodeManager,
		portManager
	},
	mounted () {
		document.body.addEventListener('keyup', evt => {
			if (evt.which !== 27) return;
			this.onClose();
		});

		eventBus.on('showImageWall', () => {
			this.imageShown = true;
		});
		eventBus.on('imageWallHidden', () => {
			this.imageShown = false;
		});
		eventBus.on('ToggleEsc', () => this.onClose());
		eventBus.on('Article:Comment:Append', info => {
			info.userName = this.userName;
			info.userID = this.userID;
			eventBus.emit('loadStart');
			this.$net.emit('AppendComment', info);
		});

		this.$net.register('RequestStarPortInfo', (msg, err, event) => {
			eventBus.emit('loadFinish');
			if (!!err) {
				eventBus.emit('popupShow', '出错', err);
				return;
			}

			this.userID = msg.id;
			this.userName = msg.name;

			eventBus.emit('updateNodeInfo', {
				name: msg.name,
				id: msg.id,
			});
			eventBus.emit('updatePublicPort', msg.publicPort);
			eventBus.emit('updateTimeline', msg.timeline);

			var query = {};
			location.search.toString().replace(/^\?+/, '').split(/\$+/).forEach(l => {
				l = l.split('=');
				var k = l.splice(0, 1)[0];
				l = l.join('=');
				query[k] = l;
			});
			if (!!query.article) {
				eventBus.emit('loadStart');
				this.$net.emit('GetArticleByID', {
					channel: 'ArticleMarket',
					id: query.article
				});
			}
		});
		this.$net.register('TimelineUpdated', (msg, err, event) => {
			this.$net.emit('GetTimeline', ['ArticleMarket', 'ArticleComments']);
		});
		this.$net.register('GetTimeline', (msg, err, event) => {
			eventBus.emit('updateTimeline', msg);
		});
		this.$net.register('AppendComment', (msg, err, event) => {
			eventBus.emit('loadFinish');
			console.log(msg, err);
		});

		eventBus.emit('loadStart');
		this.$net.emit('RequestStarPortInfo', ['ArticleMarket', 'ArticleComments']);
	},
	methods: {
		onClose () {
			if (this.imageShown) eventBus.emit('hideImageWall');
			else eventBus.emit('hideArticle');
		},
		turnLeft () {
			if (!this.imageShown) return;
			eventBus.emit('turnPrevImage');
		},
		turnRight () {
			if (!this.imageShown) return;
			eventBus.emit('turnNextImage');
		},
		moveUp (evt) {
			eventBus.emit('Article:Go:Up', evt.shiftKey);
		},
		moveDown (evt) {
			eventBus.emit('Article:Go:Down', evt.shiftKey);
		},
		goTop (evt) {
			var tag = evt.target.tagName.toLowerCase();
			if (tag === 'input' || tag === 'textarea') return;
			tag = evt.target.getAttribute('contenteditable');
			if (tag === true || tag === 'true') return;
			eventBus.emit('Article:Go:Top');
		},
		goBottom (evt) {
			var tag = evt.target.tagName.toLowerCase();
			if (tag === 'input' || tag === 'textarea') return;
			tag = evt.target.getAttribute('contenteditable');
			if (tag === true || tag === 'true') return;
			eventBus.emit('Article:Go:Bottom');
		},
		goPrev () {
			eventBus.emit('Article:Go:Prev');
		},
		goNext () {
			eventBus.emit('Article:Go:Next');
		}
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
	outline: none;
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