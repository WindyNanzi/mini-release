## 描述
这是根据学习 [Vue 3.2 发布了，那尤雨溪是怎么发布 Vue.js 的？](https://juejin.cn/post/6997943192851054606) 之后，为了仿造发布 vue3 的基本流程而做的一个最小复现流程的项目。这套流程经修改也可以试用于大多数项目中。

由于 vue3 中使用了 `monorepo` 管理，本项目进行了阉割

## node 版本
建议使用 `nvm` 作为 node 版本管理工具
```
node -v

v17.1.0
```

## 启动
```
yarn release
```

## dry 模式
在 package.json 中做如下修改:
```
- "release": "node scripts/release.js"
+ "release": "node scripts/release.js --dry"
```