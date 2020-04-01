<template>
	<div class="article-container" :shown="show ? 'true' : 'false'" @click="onClick">
	</div>
</template>

<script>
import eventBus from './eventbus.js';

const newEle = (tagName, classList, id) => {
	var ele = document.createElement(tagName);
	if (!!id) ele.id = id;
	if (!!classList) {
		if (classList.toString() === classList) classList = classList.split(' ');
		if (classList instanceof Array) {
			classList.forEach(c => ele.classList.add(c));
		}
	}
	return ele;
};

var net;

export default {
	name: "articleContainer",
	data () {
		return {
			show: false
		}
	},
	mounted () {
		net = this.$net;
		InitNotes(this.$el);
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
			this.$el.innerHTML = content.content;
			var article = this.$el.querySelector('article');
			article.classList.add('scroller');
			var info = newEle('header', 'article-info');
			var inner = '<div class="article-author-publisher"><span class="article-author">作者：';
			if (!!content.meta.email) inner += '<a href="email:' + content.meta.email + '">';
			inner += content.meta.author || data.author;
			if (!!content.meta.email) inner += '</a>';
			inner += '</span><span class="article-publisher">发布者：' + data.publisher + '</span></div>';
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
					if (item.hash === data.ipfs) {
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

			// LaTeX 显示
			MathJax.Hub.Queue(["Typeset", MathJax.Hub]);

			this.show = true;
		});
		eventBus.on('hideArticle', () => {
			this.show = false;
			eventBus.emit('hideArticleTitle');
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
			if (this.showImage(ele)) return;

			if (tag !== 'li') return;
			if (!ele.classList.contains('history-item')) return;
			var id = ele.getAttribute('article');
			var history = ele.getAttribute('name');
			eventBus.emit('loadStart');
			net.emit('GetArticleByID', {
				channel: 'ArticleMarket',
				id: id,
				ipfs: history
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
.article-container > article {
	display: block;
	box-sizing: border-box;
	max-width: 850px;
	padding-right: 10px;
	height: 100%;
	margin-left: auto;
	margin-right: auto;
	overflow: auto;
}
.article-container > article ul,
.article-container > article ol {
	margin-block-start: 1em;
	margin-block-end: 1em;
	margin-inline-start: 0px;
	margin-inline-end: 0px;
	padding-inline-start: 40px;
}
.article-container > article ul {
	list-style-type: disc;
}
.article-container > article ul ul {
	list-style-type: circle;
}
.article-container > article ul ul ul {
	list-style-type: square;
}
.article-container > article ul ul ul ul {
	list-style-type: square;
}
.article-container > article ol {
	list-style-type: decimal;
}
.article-container > article ol ol {
	list-style-type: upper-roman;
}
.article-container > article ol ol ol {
	list-style-type: lower-alpha;
}
.article-container > article ol ol ol ol {
	list-style-type: lower-greek;
}
.article-container > article > header.article-info {
	margin-top: 10px;
	margin-bottom: 50px;
	font-size: 14px;
	text-align: right;
	color: rgb(224, 240, 233);
	cursor: default;
}
.article-container > article > header.article-info .article-publisher {
	margin-left: 20px;
}
.article-container > article p {
	word-break: break-word;
}
.article-container > article > section.history-versions {
	margin-top: 50px;
}
.article-container > article > section.history-versions h1 {
	margin-top: 50px;
	margin-bottom: 40px;
	font-size: 30px;
	font-weight: bolder;
	line-height: 36px;
}
.article-container > article > section.history-versions li {
	cursor: pointer;
	user-select: none;
}
.article-container > article div.resource.image {
	cursor: pointer;
}
.article-container > article div.image-wall div.resource.image {
	width: 100%;
}
</style>