<template>
	<div class="article-container" :shown="show ? 'true' : 'false'">
	</div>
</template>

<script>
import eventBus from './eventbus.js';

var testContent = '';
var xhr = new XMLHttpRequest();
xhr.open('get', './markup/demo.mu', true);
xhr.onreadystatechange = () => {
	if (xhr.readyState == 4) {
		if (xhr.status === 0 || xhr.response === '') return;
		testContent = xhr.responseText;
	}
};
xhr.send();

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

export default {
	name: "articleContainer",
	data () {
		return {
			show: false
		}
	},
	mounted () {
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
			if (Math.random() > 0.5) data.content = testContent;
			var content = MarkUp.fullParse(data.content, {
				toc: true,
				showtitle: false,
				resources: true,
				reference: true
			});
			this.$el.innerHTML = content.content;
			var article = this.$el.querySelector('article');
			article.classList.add('scroller');
			var info = newEle('header', 'article-info');
			var inner = '<div class="article-author-publisher"><span class="article-author">作者：';
			if (!!content.meta.email) inner += '<a href="' + content.meta.email + '">';
			inner += content.meta.author;
			if (!!content.meta.email) inner += '</a>';
			inner += '</span><span class="article-publisher">发布者：' + data.publisher + '</span></div>';
			inner += '<div class="article-fingerprint">本文指纹：<span>' + data.fingerprint + '</span></div>'
			info.innerHTML = inner;
			article.insertBefore(info, article.firstChild);

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
	list-style-type: disc;
	margin-block-start: 1em;
	margin-block-end: 1em;
	margin-inline-start: 0px;
	margin-inline-end: 0px;
	padding-inline-start: 40px;
}
.article-container > article > header.article-info {
	margin-top: 10px;
	margin-bottom: 50px;
	font-size: 14px;
	text-align: right;
	color: rgb(224, 240, 233);
}
.article-container > article > header.article-info .article-publisher {
	margin-left: 20px;
}
.article-container > article p {
	word-break: break-word;
}
</style>