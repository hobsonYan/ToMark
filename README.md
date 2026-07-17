# ToMark - 轻量网页批注工具

一款简洁的 Chrome 扩展，让你可以轻松地在任何网页上高亮文本、添加批注，并保存在本地。

## 功能特性

- ✅ **划词高亮** - 选中文字即可高亮，支持4种颜色
- ✅ **添加批注** - 为高亮添加笔记说明
- ✅ **本地存储** - 数据保存在本地，无需注册登录
- ✅ **快捷键** - `Ctrl+Shift+H` 快速高亮
- ✅ **导出功能** - 一键导出所有批注

## 安装方式

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `ToMark` 文件夹

## 项目结构

```
ToMark/
├── manifest.json      # 扩展配置
├── content.js         # 内容脚本（注入网页）
├── content.css        # 内容样式
├── background.js      # 后台脚本
├── popup/
│   ├── popup.html     # 弹窗界面
│   └── popup.js       # 弹窗逻辑
└── icons/
    └── icon.svg       # 图标
```

## 开发

代码使用原生 JavaScript，无额外依赖。

## 许可证

MIT
