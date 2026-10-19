# Hit Clicker

中英双语点击游戏。点击空白区域获得 hit，在商店解锁手动点击、小帮手、幸运、大额、组合技和运势技能。累计收益推动波浪交替换色，点击速度影响翻腾速度。

仓库：[Chubeiliang233/hit-clicker](https://github.com/Chubeiliang233/hit-clicker)

## 运行

直接用现代浏览器打开 `index.html` 即可游玩，无需安装依赖或构建。开发和浏览器测试建议在项目根目录启动静态服务器：

```sh
python -m http.server 3000 --bind 127.0.0.1
```

打开 <http://127.0.0.1:3000>。游戏只使用本地字体、图片和浏览器合成音效；仅带 Figma capture 参数的编辑链接会加载 Figma 捕获工具。

进度自动存储在当前浏览器的 localStorage，语言偏好独立保存。刷新恢复进度，重置保留语言和声音设置。暂停、切到后台时停止计息，不计算离线收入。不同浏览器或访问地址的存档不互通。

## 文件导航

| 位置                             | 内容                                                 |
| -------------------------------- | ---------------------------------------------------- |
| `index.html`                     | 页面结构与脚本、样式入口                             |
| `js/`                            | 游戏状态、数值规则、技能、商店、音效与视觉效果       |
| `styles/`                        | 基础外观、Figma 布局、动效、中英排版、波浪和运势样式 |
| `assets/`                        | 正在使用的 SVG、字体及字体授权                       |
| `locales/`                       | 从最终 Excel 生成的两种语言与浏览器文案包            |
| `outputs/localization-20261019/` | 创作者审阅后的最终中英文文案表                       |
| `scripts/`                       | 文案生成、字体裁剪、资源检查与测试入口               |
| `tests/`                         | 游戏规则和真实浏览器回归检查                         |
| `docs/`                          | 当前规则、维护说明、Figma 对应关系及效果参数         |

## 修改和验证

修改规则先看 [游戏规则](docs/GAMEPLAY.md)；修改代码先看 [维护指南](docs/MAINTENANCE.md)。

文案请编辑最终 Excel，再运行 `python scripts/build_locales.py`，详见 [本地化](docs/LOCALIZATION.md)。Figma 修改需要手动同步，见 [Figma 工作流程](docs/FIGMA_WORKFLOW.md)。

安装 Node.js 后，无需 npm 即可运行代码语法、资源引用和数值测试：

```sh
node scripts/check.cjs
```

启动静态服务器、准备 Playwright 和 Edge 后，运行完整浏览器检查：

```sh
node scripts/check.cjs --browser
```

测试环境配置见 [tests/README.md](tests/README.md)。第三方资源和协作署名见 [CREDITS.md](CREDITS.md)。

## 单文件发行版

`main` 分支提供可独立打开的 [index.html](https://github.com/Chubeiliang233/hit-clicker/blob/main/index.html)。开发时保留分文件源码，用以下命令重新生成：

```sh
python scripts/build_standalone.py
```

打包器仅依赖 Python 标准库，内嵌脚本、样式、所有图片、字体、中英文文案及字体授权；不包含 Figma 编辑捕获工具，也不改动源文件。生成文件在开发分支被忽略；发布到 `main` 时命名为 `index.html`，作为唯一游戏入口。可用 `--output` 指定其他 HTML 输出路径。

生成后执行 `node tests/standalone-browser.test.cjs` 验证独立文件。测试将它复制到没有配套文件的临时目录，并在浏览器断网模式下检查游戏功能和资源加载。
