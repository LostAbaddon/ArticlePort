# Contverse StarPort

与 ArticleUtils 配套使用的个人后端，也支持 HTTP 接入。

- **版本**： 0.2.0
- **作者**： [LostAbaddon](mailto:lostabaddon@gmail.com)
- **网址**： [GitHub](https://github.com/LostAbaddon/ArticlePort)

**开源协议：** GPLv3

## 声明

本系统会使用 IPFS 作为数据存储层。

**之所以使用 IPFS，完全是为了学习与研究，任何人使用本系统时都必须注意由此带来的风险与危害，所有责任由自己承担，本作者概不负责！**

## 如何使用

1.	请安装 0.4.23 或以上版本的 IPFS
2.	请安装 12.0.0 或以上版本的 Node.js
3.	执行 npm install 进行项目依赖安装
4.	在 config.json 中的 cmd 字段设置 IPFS 的执行路径
5.	执行 index.js，开始使用本系统（执行 node index.js -h 可查看所有可用命令与说明）
6.	配合 [ArticleUtils 浏览器插件](https://github.com/LostAbaddon/ArticleUtils)可进行本地文章的编写与修改，并能发布到本系统中
7.	打开 localhost:8001（具体端口号可在 config.json 中配置）可查看内容并进行设置

## 说明

本系统可将文件上传到 IPFS 中，并在 IPNS 上挂在当前 IPFS 账号的相关数据信息，以“房间”为单位将不同类别的信息统一在一起进行管理。

用户及房间信息（统称为*索引信息*）与上传的文件分开，因此更新的时候只更新索引信息，只有当用户在前端站点（默认为 http://localhost:8001）点选文件时才会将文件下载到本地。

索引信息中包含了文件的历史版本信息、指纹数据、根版本 ID 等必要信息。

### 文件指纹

文件指纹基于相似 Hash 算法。

对文件的小修改，其指纹会保持不变或只发生很微小的改变，而只有大规模的改动才会彻底改变文件的指纹。

这是用来判断两篇文章是否是同一篇文章的一个依据。

## 虫洞网络

利用 IPFS 的 DHT 建立的 TCP 通讯网络。

## TODO

+	前端工作
+	后端工作
+	链端工作
	-	IPFS
		*	在文章频道外增加回复频道
		*	支持上传图片的频道
		*	通过 HTTP 调用 IPFS
	-	虫洞网络
		基于 IPFS DHT 的 PEER 查询与直连功能，从而避免 IPNS 过慢的问题
		*	增加虫洞星门 Bootstrap 功能
		*	传输数据签名以验证身份
+	重要功能
	-	私人信道	
	-	频道历史数据支持分页保存，避免单个文件过大
	-	链上数据操作在线程中完成