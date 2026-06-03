# jmcomic-build

本仓库用于构建 `@jmcomic` 的平台二进制分发，将 [hect0x7/JMComic-Crawler-Python](https://github.com/hect0x7/JMComic-Crawler-Python) 打包分发至npm。

## 项目简介

`jmcomic-build` 将一个 Python 项目打包为平台特定的可执行文件，并通过 npm 包发布。

- 使用 `PyInstaller` 对 Python 程序进行二进制打包
- 生成 `linux-gnu`、`windows-x64`、`macos-arm64` 等平台包
- 让用户无需手工安装 Python 及其依赖即可使用
- 适合想要把该 Python 项目嵌入 Node.js 的开发者
- 支持全局命令行使用，同时也可作为 Node.js 模块 `import` 导入

## 为什么这样做

这个仓库的目标是把原始 Python 程序打包成“开箱即用”的 npm 包，从而实现：

- 终端用户无需安装 Python
- 终端用户无需安装 Python 依赖库
- 直接通过 npm 安装并执行
- Node.js 开发者可以直接 `import` 并调用封装好的执行方法

## 当前分发平台

目前构建并发布的目标平台：

- `@jmcomic/jmcomic-linux-gnu`
- `@jmcomic/jmcomic-windows-x64`
- `@jmcomic/jmcomic-macos-arm64`

> 后续不会再分发 `musl` 版本。如果你确实需要 `musl`，请自行从源代码编译。

## 目录结构

- `packages/`
  - `core/` - 构建规范、发布控制脚本和生成逻辑
  - `jmcomic/` - `@jmcomic/jmcomic` 主包定义及 Node.js 接口
- `scripts/`
  - `inject-version.js` - 将 `VERSION` 注入 `packages/jmcomic/package.json`
  - `package.js` - 生成平台包、发布 npm、触发镜像同步

## 使用方式

### 全局安装并命令行使用

```bash
npm install -g @jmcomic/jmcomic
jmcomic 123456
```

或者安装平台包：

```bash
npm install -g @jmcomic/jmcomic-windows-x64
jmcomic 123456
```

### 在 Node.js 中导入使用

```js
import jmcomic, { getBinaryPath, spawnProcess, run, runSync, exec } from "@jmcomic/jmcomic"

console.log(getBinaryPath())

await run(["123456"])

runSync(["123456"])
```

## 模块导出接口说明

`packages/jmcomic/index.js` 当前导出的主要方法：

- `getBinaryPath()`
  - 返回当前平台对应可执行文件的绝对路径
- `spawnProcess(input, options)`
  - 启动子进程并继承标准输入输出，适合直接把命令输出打到终端
- `run(input, options)`
  - 异步执行，返回 `Promise`，退出码为 0 时 resolve，非 0 时 reject
- `runSync(input, options)`
  - 同步执行，当前线程会阻塞直到程序退出
- `exec(input, options)`
  - `run` 的别名
- 默认导出函数 `jmcomic(input, options)`
  - 等价于 `run(input, options)`

## 构建与发布流程

1. 准备平台二进制产物到 `release-assets`
2. 注入版本号：

```bash
VERSION=1.2.3 node scripts/inject-version.js
```

3. 执行构建发布：

```bash
VERSION=1.2.3 node scripts/package.js
```

如果需要发布 `img2pdf` 变体：

```bash
VERSION=1.2.3 IMG2PDF=true IMG2PDF_SUFFIX=img2pdf NPM_TAG=img2pd node scripts/package.js
```

### 发布脚本会做什么

`packages/js/package.js` 会：

- 枚举 `jmcomic` 和 `jmv` 两个 CLI 包
- 根据平台生成独立 npm 包目录
- 复制对应平台的二进制到 `bin/`
- 生成 `index.js` 和 `package.json`
- 执行 `npm publish --access public`
- 发布后调用 npm 镜像同步接口 `PUT https://registry-direct.npmmirror.com/-/package/$PACKAGE_NAME/syncs`

## 运行环境要求

- Node.js 需要支持全局 `fetch`
- `packages/jmcomic/package.json` 中包含版本占位符 `__VERSION__`
- 发布前必须先执行 `inject-version.js`

## 开源与构建安全

本项目的构建流程全部在 GitHub Actions 中完成，公开透明，开源且无后门。
你可以直接查看 Action 配置、构建脚本和发布逻辑，放心使用。

## 免责声明

- 本仓库提供的是二进制分发和 npm 包构建工具链，并非项目功能保证。
- 由于平台差异、系统环境、依赖变更等原因，可能出现兼容性问题。
- 如果你在特殊平台（例如 `musl`）上需要运行，请自行编译对应版本。
- 本项目不对第三方内容、爬虫目标站点或使用结果承担法律责任。
- 使用前请确保符合当地法律法规和目标站点的使用政策。
