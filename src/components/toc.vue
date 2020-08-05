<template>
	<div class="toc-frame scroller">
		<div class="toc-container" :gone="gone ? 'true' : 'false'">
			<div v-for="item in list" :class="'toc-item level-'+item.level">
				<a :href="item.link" :readed="item.readed ? 'true' : 'false'">{{item.title}}</a>
			</div>
		</div>
	</div>
</template>

<script>
import eventBus from './eventbus.js';

export default {
	name: "toc",
	data () {
		return {
			gone: true,
			index: -1
		}
	},
	props: {
		list: {
			type: Array,
			default: () => []
		}
	},
	mounted () {
		eventBus.on('TOC:Scroll', container => {
			var percent = container.scrollHeight - container.offsetHeight;
			if (percent < 1) percent = 1;
			else percent = 1 - container.scrollTop / percent;
			percent *= container.offsetHeight;
			var index = -1;
			var base = container.getBoundingClientRect().top;
			this.list.some((item, i) => {
				var link = item.link.substring(1, item.link.length);
				link = 'a[name="' + link + '"]';
				link = container.querySelector(link);
				var top = link.getBoundingClientRect().top - base;
				if (top < percent) {
					index = i;
					return false;
				}
				return true;
			});
			if (index < 0) this.gone = true;
			else this.gone = false;
			this.list.forEach((item, i) => this.$set(this.list[i], "readed", i <= index));
			this.index = index;
		});
		eventBus.on('TOC:Go:Prev', container => {
			var index = this.index - 1;
			if (index < 0) {
				eventBus.emit('Article:Go:Top');
				return;
			}
			var target = this.list[index];
			target = target.link.substring(1, target.link.length);
			target = 'a[name="' + target + '"]';
			target = container.querySelector(target);
			var base = container.getBoundingClientRect().top;
			target = target.getBoundingClientRect().top - base;
			target += container.scrollTop;
			eventBus.emit('Article:Go:Position', target);
		});
		eventBus.on('TOC:Go:Next', container => {
			var index = this.index + 1;
			if (index > this.list.length) {
				eventBus.emit('Article:Go:Bottom');
				return;
			}
			var target = this.list[index];
			target = target.link.substring(1, target.link.length);
			target = 'a[name="' + target + '"]';
			target = container.querySelector(target);
			var base = container.getBoundingClientRect().top;
			target = target.getBoundingClientRect().top - base;
			target += container.scrollTop;
			eventBus.emit('Article:Go:Position', target);
		});
	}
};
</script>

<style scoped>
.toc-frame {
	position: absolute;
	box-sizing: border-box;
	top: 10px;
	bottom: 10px;
	left: 5px;
	right: 50%;
	margin-right: 450px;
	padding-right: 20px;
	z-index: 1;
	background-color: transparent;
	text-align: right;
	overflow-y: auto;
	opacity: 1;
	transition: all 250ms ease-in-out;
}
@media(max-width: 1200px) {
	.toc-frame {
		opacity: 0;
		pointer-events: none;
	}
}
.toc-frame .toc-container {
	display: inline-block;
	text-align: left;
	transform: translateX(0px);
	opacity: 1;
	transition: all ease-in-out 250ms;
}
.toc-frame .toc-container[gone="true"] {
	transform: translateX(-100px);
	opacity: 0;
}
.toc-frame .toc-item.level-1 {
	margin-top: 15px;
	font-size: 16px;
	font-weight: bolder;
}
.toc-frame .toc-item.level-2 {
	margin-top: 5px;
	padding-left: 10px;
	font-size: 14px;
}
.toc-frame .toc-item a,
.toc-frame .toc-item a:hover,
.toc-frame .toc-item a:visited {
	text-decoration: none;
	transition: all ease-in-out 250ms;
}
.toc-frame .toc-item a,
.toc-frame .toc-item a:visited {
	color: rgb(175, 175, 175);
}
.toc-frame .toc-item a[readed="true"],
.toc-frame .toc-item a[readed="true"]:visited {
	color: rgb(127, 127, 127);
}
.toc-frame .toc-item a:hover {
	color: rgb(245, 245, 245);
}
</style>