## stalker-server

这是一个实时分析数据的打点服务器~

分析数据分四个阶段：parser/processor/prestorer/storer，每个阶段都可以做插件化开发~

目前集成插件：

* processor： detector/ipfinder
* storer: csv
