<template>
	<div id="Showroom" class="showroom scroller" @mousewheel="onWheel">
		<div class="item-container cursor" v-for="item in articles" :name="item.id" @click="onClick(item)">
			<div class="item-title">{{item.title}}</div>
			<div class="item-description">{{item.description}}</div>
			<div class="item-footer"><span class="item-author">{{item.author}}</span><span class="action">{{item.action}}于</span><span class="item-publish">{{num2time(item.publishAt)}}</span></div>
		</div>
	</div>
</template>

<script>
import eventBus from './eventbus.js';

const AllArticles = [];
const ArticleMap = {};
var net;

export default {
	name: "showroom",
	data () {
		return {
			articles: []
		}
	},
	mounted () {
		net = this.$net;
		eventBus.on('updateTimeline', timeline => {
			timeline.forEach(item => {
				var id = item.id;
				var old = ArticleMap[id];
				if (!old) {
					ArticleMap[id] = item;
				}
				else {
					if (item.publishAt > old.publishAt) ArticleMap[id] = item;
				}
			});
			var list = Object.keys(ArticleMap).map(id => ArticleMap[id]);
			list.sort((a, b) => b.publishAt - a.publishAt);
			list.forEach(item => {
				if (item.channel === 'ArticleComments') item.action = '评论';
				else item.action = '发布';
				if (!item.description) item.description = '无简介……';
			});
			this.articles.splice(0, this.articles.length, ...list);
		});
	},
	methods: {
		num2time: num => {
			var time = new Date(num);
			var Y = (time.getYear() + 1900) + '';
			var M = (time.getMonth() + 1) + '';
			var D = time.getDate() + '';
			var h = time.getHours() + '';
			var m = time.getMinutes() + '';
			var s = time.getSeconds() + '';

			if (M.length < 2) M = '0' + M;
			if (D.length < 2) D = '0' + D;
			if (h.length < 1) h = '00';
			else if (h.length < 2) h = '0' + h;
			if (m.length < 1) m = '00';
			else if (m.length < 2) m = '0' + m;
			if (s.length < 1) s = '00';
			else if (s.length < 2) s = '0' + s;
			return Y + '/' + M + '/' + D + ' ' + h + ':' + m + ':' + s;
		},
		onWheel: evt => {
			var scroll = Showroom.scrollLeft + evt.deltaY;
			if (scroll < 0) scroll = 0;
			else {
				let limit = Showroom.scrollWidth - Showroom.offsetWidth;
				if (scroll > limit) scroll = limit;
			}
			Showroom.scrollLeft = scroll;
		},
		onClick: (item) => {
			eventBus.emit('loadStart');
			net.emit('GetArticleByID', {
				channel: 'ArticleMarket',
				id: item.id
			});
		}
	}
};
</script>

<style scoped>
.showroom {
	position: fixed;
	display: flex;
	box-sizing: border-box;
	flex-flow: column wrap;
	justify-content: flex-start;
	align-content: flex-start;
	top: 50px;
	bottom: 10px;
	left: 10px;
	right: 10px;
	z-index: 0;
	background-color: rgb(22, 24, 35);
	overflow-x: auto;
	overflow-y: hidden;
}
.showroom .item-container {
	position: relative;
	display: inline-block;
	box-sizing: border-box;
	width: 300px;
	flex: 1 0 100px;
	margin: 10px;
	padding: 5px;
	border: 5px solid black;
	border-radius: 8px;
	box-shadow: inset 0px 0px 5px rgba(210, 240, 244, 0.3), 2px 2px 5px 2px rgba(211, 224, 243, 0.3);
	word-break: break-word;
	transition: all 250ms ease-in-out;
}
.showroom .item-container:last-child {
	flex: 0 0 300px;
}
.showroom .item-container:hover {
	transform: scale(1.05);
}
.showroom .item-container .item-title {
	font-size: 18px;
	font-weight: bolder;
	text-align: center;
	padding-bottom: 5px;
	border-bottom: 1px solid rgba(211, 224, 243, 0.4);
}
.showroom .item-container .item-description {
	padding: 5px;
	font-size: 14px;
}
.showroom .item-container .item-footer {
	margin-top: 5px;
	padding-right: 5px;
	font-size: 12px;
	text-align: right;
}
.showroom .item-container .item-footer .item-author {
	margin-right: 5px;
	font-weight: bold;
}
.showroom .item-container .item-footer .item-publish {
	margin-left: 5px;
	font-style: italic;
}
</style>