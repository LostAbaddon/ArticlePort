<template>
	<div class="article-container" :shown="show ? 'true' : 'false'">
		<toc :list="contentList"></toc>
		<div class="container" @click="onClick"></div>
	</div>
</template>

<script>
import eventBus from './eventbus.js';
import toc from './toc.vue';

var net;
var article;

export default {
	name: "articleContainer",
	data () {
		return {
			show: false,
			contentList: [],
			articleID: '',
			articleHash: ''
		}
	},
	components: {
		toc
	},
	mounted () {
		net = this.$net;
		var container = this.$el.querySelector('div.container');
		InitNotes(container);
		MathJax.Hub.Config({
			extensions: ["tex2jax.js"],
			TeX: {
				extensions: ["AMSmath.js", "AMSsymbols.js"]
			},
			jax: ["input/TeX", "output/HTML-CSS"],
			tex2jax: {
				inlineMath: [["$","$"]]}
			}
		);

		this.$net.register('GetArticleByID', (data, err) => {
			this.articleID = data.id;
			this.articleHash = data.hash;
			eventBus.emit('loadFinish');
			if (!!err) {
				eventBus.emit('popupShow', '出错', err);
				return;
			}
			eventBus.emit('showArticleTitle', data.title);
			var content = MarkUp.fullParse(data.content, {
				toc: true,
				showtitle: false,
				resources: true,
				reference: true
			});

			// 添加文件信息
			container.innerHTML = content.content;
			article = container.querySelector('article');
			article.classList.add('scroller');
			var info = newEle('header', 'article-info');
			var inner = '<div class="article-author-publisher"><span class="article-author">作者：';
			if (!!content.meta.email) inner += '<a href="email:' + content.meta.email + '">';
			inner += content.meta.author || data.author;
			if (!!content.meta.email) inner += '</a>';
			inner += '</span><span class="article-publisher">发布者：' + (data.publisher.name || data.publisher) + '</span></div>';
			inner += '<div class="article-writeAt">写于：<span>' + this.num2time(content.meta.update) + '</span></div>'
			inner += '<div class="article-fingerprint">本文指纹：<span>' + data.fingerprint + '</span></div>'
			info.innerHTML = inner;
			article.insertBefore(info, article.firstChild);

			// 添加历史版本信息
			data.history = data.history || []
			if (data.history.length > 1) {
				info = newEle('hr', 'endnote-line');
				article.appendChild(info);

				info = newEle('section', 'history-versions');
				inner = '<h1 class="history-title">历史版本</h1>';
				inner += '<ol>';
				data.history.forEach(item => {
					inner += '<li class="history-item" name="' + item.hash + '" article="' + data.id + '">';
					if (item.hash === data.hash) {
						inner += '<strong>' + item.hash + '（当前版本）</strong>';
					}
					else {
						inner += item.hash;
					}
					inner += '</li>';
				});
				inner += '</ol>';
				info.innerHTML = inner;
				article.appendChild(info);
			}

			// 添加评论

			// LaTeX 显示
			MathJax.Hub.Queue(["Typeset", MathJax.Hub]);

			// 获取目录
			var toc = container.querySelectorAll('aside.content-table .content-item');
			this.contentList.splice(0, this.contentList.length);
			if (!!toc) {
				[].filter.call(toc, item => {
					return item.classList.contains('level-1') || item.classList.contains('level-2')
				}).forEach(item => {
					var level = item.classList.contains('level-1') ? 1 : 2;
					var title = item.querySelector('a.content-link');
					var link = title.getAttribute('href');
					title = title.innerHTML;
					this.contentList.push({level, title, link});
				});
			}

			// 添加评论区
			this.initCommentPanel();

			// 事件处理
			article.addEventListener('scroll', this.onScroll);

			// 初始化
			eventBus.emit('TOC:Scroll', article);
			history.pushState(null, null, '/?article=' + data.id);
			this.show = true;
		});
		eventBus.on('hideArticle', () => {
			article.removeEventListener('scroll', this.onScroll);
			article = null;
			this.contentList.splice(0, this.contentList.length);
			history.pushState(null, null, '/');
			this.show = false;
			eventBus.emit('hideArticleTitle');
		});
		eventBus.on('Article:Go:Top', () => {
			article.scrollTo(0, 0);
		});
		eventBus.on('Article:Go:Bottom', () => {
			var area = article.querySelector('section.comment-panel');
			var top = area.getBoundingClientRect().top;
			var base = article.getBoundingClientRect().top;
			top -= base;
			if (top < 100) {
				article.scrollTo(0, article.scrollHeight);
			}
			else {
				article.scrollTo(0, article.scrollTop + top);
			}
		});
		eventBus.on('Article:Go:Up', slow => {
			var top = article.scrollTop - (slow ? 5 : 50);
			if (top < 0) top = 0;
			article.scrollTo(0, top);
		});
		eventBus.on('Article:Go:Down', slow => {
			var top = article.scrollTop + (slow ? 5 : 50);
			if (top > article.scrollHeight) top = article.scrollHeight;
			article.scrollTo(0, top);
		});
		eventBus.on('Article:Go:Prev', () => {
			eventBus.emit('TOC:Go:Prev', article);
		});
		eventBus.on('Article:Go:Next', () => {
			eventBus.emit('TOC:Go:Next', article);
		});
		eventBus.on('Article:Go:Position', target => {
			article.scrollTo(0, target);
		});
	},
	methods: {
		num2time: num => {
			if (!num) return '猴年马月牛日 龙点蛇分鸡秒';
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
		onClick (evt) {
			var ele = evt.target;
			if (!ele) return;
			if (!ele.tagName) return;

			var tag = ele.tagName.toLowerCase();
			if (tag === 'button' && ele.classList.contains('append-comment')) {
				this.appendComment();
				return;
			}

			if (this.showImage(ele)) return;

			if (tag !== 'li') return;
			if (!ele.classList.contains('history-item')) return;
			var id = ele.getAttribute('article');
			var history = ele.getAttribute('name');
			eventBus.emit('loadStart');
			net.emit('GetArticleByID', {
				channel: 'ArticleMarket',
				id: id,
				hash: history
			});
		},
		onScroll (evt) {
			eventBus.emit('TOC:Scroll', article);
		},
		appendComment () {
			var comment = article.querySelector('section.comment-panel textarea');
			if (!comment) return;
			comment = comment.value;
			eventBus.emit('Article:Comment:Append', {
				id: this.articleID,
				hash: this.articleHash,
				comment
			});
		},
		getImageContainer (ele) {
			var tag = ele.tagName.toLowerCase();
			if (tag === 'img') {
				ele = ele.parentElement;
				tag = ele.tagName.toLowerCase();
			}
			if (tag === 'figure' || tag === 'figcaption') {
				ele = ele.parentElement;
				tag = ele.tagName.toLowerCase();
			}
			if (tag === 'div') {
				if (!(ele.classList.contains('resource') && ele.classList.contains('image'))) return null;
			}
			else return null;
			var parent = ele.parentElement;
			if (parent.classList.contains('image-wall')) {
				return [ele, parent];
			}
			return [ele, null];
		},
		showImage (ele) {
			var container = this.getImageContainer(ele);
			if (!container) return false;
			var imageWall = container[1];
			container = container[0];
			var index = 0;
			if (!!imageWall) {
				let list = [];
				let target = container.querySelector('img');
				imageWall.querySelectorAll('div.image').forEach((pic, i) => {
					var img = pic.querySelector('img');
					if (!img) return;
					if (img === target) index = i;
					img = img.src;
					var cap = pic.querySelector('figcaption');
					if (!!cap) cap = cap.innerHTML;
					else cap = '';
					list.push({
						image: img,
						caption: cap
					});
				});
				imageWall = list;
			}
			else {
				let picture = container.querySelector('img').src;
				let cap = container.querySelector('figcaption');
				if (!!cap) cap = cap.innerHTML;
				else cap = '';
				imageWall = [{
					image: picture,
					caption: cap
				}];
			}
			eventBus.emit('showImageWall', imageWall, index);
			return true;
		},
		initCommentPanel () {
			var area = newEle('section', 'comment-panel');
			var ele = newEle('h1');
			ele.innerHTML = '评论';
			area.appendChild(ele);
			ele = newEle('textarea', 'scroller');
			area.appendChild(ele);
			ele = newEle('button', 'append-comment');
			ele.innerHTML = '追加评论';
			area.appendChild(ele);
			article.appendChild(area);
		}
	}
};
</script>

<style scoped>
.article-container {
	position: fixed;
	display: flex;
	box-sizing: border-box;
	justify-content: space-around;
	top: 0px;
	bottom: 100%;
	left: 10px;
	right: 10px;
	z-index: 0;
	background-color: rgb(22, 24, 35);
	overflow-y: auto;
	pointer-events: none;
	transition: all 250ms ease-in-out;
}
.article-container[shown="true"] {
	top: 55px;
	bottom: 5px;
	pointer-events: auto;
}
</style>
<style type="text/css">
.article-container .container > article {
	display: block;
	box-sizing: border-box;
	max-width: 850px;
	padding-right: 10px;
	height: 100%;
	margin-left: auto;
	margin-right: auto;
	overflow: auto;
}
.article-container .container > article ul,
.article-container .container > article ol {
	margin-block-start: 1em;
	margin-block-end: 1em;
	margin-inline-start: 0px;
	margin-inline-end: 0px;
	padding-inline-start: 40px;
}
.article-container .container > article ul {
	list-style-type: disc;
}
.article-container .container > article ul ul {
	list-style-type: circle;
}
.article-container .container > article ul ul ul {
	list-style-type: square;
}
.article-container .container > article ul ul ul ul {
	list-style-type: square;
}
.article-container .container > article ol {
	list-style-type: decimal;
}
.article-container .container > article ol ol {
	list-style-type: upper-roman;
}
.article-container .container > article ol ol ol {
	list-style-type: lower-alpha;
}
.article-container .container > article ol ol ol ol {
	list-style-type: lower-greek;
}
.article-container .container > article > header.article-info {
	margin-top: 10px;
	margin-bottom: 50px;
	font-size: 14px;
	text-align: right;
	color: rgb(224, 240, 233);
	cursor: default;
}
.article-container .container > article > header.article-info .article-publisher {
	margin-left: 20px;
}
.article-container .container > article p {
	word-break: break-word;
	font-size: 16px;
	line-height: 24px;
}
.article-container .container > article > section.history-versions {
	margin-top: 50px;
}
.article-container .container > article > section.history-versions h1 {
	margin-top: 50px;
	margin-bottom: 40px;
	font-size: 30px;
	font-weight: bolder;
	line-height: 36px;
}
.article-container .container > article > section.history-versions li {
	cursor: pointer;
	user-select: none;
}
.article-container .container > article div.resource.image {
	cursor: pointer;
}
.article-container .container > article div.image-wall div.resource.image {
	width: 100%;
}
.article-container .container > article .endnote-chapter p,
.article-container .container > article .endnote-chapter li {
	word-break: break-word;
}
.article-container .container > article > section.comment-panel {
	border-top: 1px solid rgb(66, 80, 102);
}
.article-container .container > article > section.comment-panel textarea {
	display: block;
	box-sizing: border-box;
	width: 100%;
	height: 150px;
	padding: 8px;
	margin-bottom: 10px;
	border: 1px solid rgb(66, 80, 102);
	border-radius: 8px;
	background-color: rgb(0, 31, 53);
	box-shadow: inset 0px 0px 5px 1px rgb(0, 0, 0);
	color: rgb(225, 225, 225);
	outline: none;
	resize: none;
}
.article-container .container > article > section.comment-panel button.append-comment {
	display: block;
	margin-left: auto;
	margin-right: auto;
	border: none;
	outline: none;
	background-color: transparent;
	cursor: pointer;
}
</style>