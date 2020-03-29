<template>
	<van-popup v-model="show">
		<div class="popup-title">{{title}}</div>
		<div class="popup-content">{{msg}}</div>
	</van-popup>
</template>

<script>
import eventBus from './eventbus.js';

export default {
	name: "popup",
	data () {
		return {
			show: false,
			title: '',
			msg: ''
		}
	},
	mounted () {
		eventBus.on('popupShow', (title, msg) => {
			this.show = true;
			this.title = title || '';
			this.msg = msg;
		});
		eventBus.on('popupHide', () => {
			this.show = false;
		});
	}
};
</script>

<style scoped>
.van-overlay {
	background-color: rgba(22, 24, 35, 0.3);
}
.van-popup {
	padding: 5px 10px;
	min-width: 300px;
	background-color: rgba(65, 85, 93, 1);
	box-shadow: 3px 3px 5px rgba(117, 138, 153, 0.6);
}
.van-popup .popup-title {
	margin-bottom: 10px;
	padding-bottom: 5px;
	border-bottom: 1px solid rgb(117, 138, 153);
	font-size: 20px;
	font-weight: bolder;
	text-align: center;
}
.van-popup .popup-content {
	font-size: 16px;
	font-weight: normal;
}
</style>