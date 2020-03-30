# ArticlePort

与 ArticleUtils 配套使用的个人后端，也支持 HTTP 接入。

- **版本**： 0.0.1
- **作者**： [LostAbaddon](mailto:lostabaddon@gmail.com)
- **网址**： [GitHub](https://github.com/LostAbaddon/ArticlePort)

**开源协议：** GPLv3

## 说明

本应用会使用 IPFS 作为数据存储层。

**之所以使用 IPFS，完全是为了学习与研究，任何人使用本应用时都必须注意由此带来的风险与危害，所有责任由自己承担，本作者概不负责！**

## TODO

-	启动后从网上获取当前节点的最新数据，因为本地数据未必是最新的
-	在文章频道外增加回复频道
-	频道历史数据支持分页保存，避免单个文件过大
-	虫洞网络：基于 IPFS DHT 的 PEER 查询与直连功能，从而避免 IPNS 过慢的问题