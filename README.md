# Contverse StarPort

与 ArticleUtils 配套使用的个人后端，也支持 HTTP 接入。

- **版本**： 0.0.1
- **作者**： [LostAbaddon](mailto:lostabaddon@gmail.com)
- **网址**： [GitHub](https://github.com/LostAbaddon/ArticlePort)

**开源协议：** GPLv3

## 声明

本应用会使用 IPFS 作为数据存储层。

**之所以使用 IPFS，完全是为了学习与研究，任何人使用本应用时都必须注意由此带来的风险与危害，所有责任由自己承担，本作者概不负责！**

## 使用说明

1.	请安装 0.4.23 或以上版本的 IPFS
2.	请安装 13.0.0 或以上版本的 Node.js
3.	在 config.json 中的 cmd 字段设置 IPFS 的执行路径
4.	执行 index.js，开始使用本系统（执行 node index.js -h 可查看所有可用命令与说明）
5.	配合 [ArticleUtils 浏览器插件](https://github.com/LostAbaddon/ArticleUtils)可进行本地文章的编写与修改，并能发布到本系统中
6.	打开 localhost:8001（具体端口号可在 config.json 中配置）可查看内容并进行设置

## TODO

-	启动后从网上获取当前节点的最新数据，因为本地数据未必是最新的
-	引入历史版本
-	在文章频道外增加回复频道
-	虫洞网络：基于 IPFS DHT 的 PEER 查询与直连功能，从而避免 IPNS 过慢的问题
-	频道历史数据支持分页保存，避免单个文件过大
-	私人信道