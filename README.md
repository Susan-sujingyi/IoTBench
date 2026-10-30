# IoTBench Leaderboard

独立、无构建依赖的静态榜单。仅包含应用层代码生成和驱动代码迁移两个入口。

## 本地查看

在项目根目录执行：

```bash
python3 -m http.server 8765
```

打开 `http://localhost:8765/`。需要通过 HTTP 服务访问，不能直接双击 HTML。

- `?scene=applications`：应用层代码生成，默认入口。横向为 OS → 三项指标，纵向为后端模型 → 方法。
- `?scene=drivers`：驱动迁移的四个实验配置，按 RIOT → Tock、Zephyr → NuttX、Zephyr → Tock 分组展示编译成功率和软件测试通过率；点击方法查看逐题结果。

仅需将本目录的 HTML、CSS、JavaScript 和 `data/` 放入静态托管目录。不需要 Node、后端、数据库或 API 密钥。

## 数据来源与口径

- `data/ioteval-paper.json`：IoTPilot 论文的 32 组方法／模型／OS 聚合结果，三个指标共 96 个值。仅含 Direct、Auto-CoT、MapCoder、IoTPilot；没有使用旧 RIOT CSV 的 12 组历史成绩。
- `data/ioteval-app.csv`：直接复制官方仓库 `datasets/app.csv`，未做去重或改写。官方提交为 `614e4e5e17039e38167d602d9534ec71ebb04821`。原文件 42 行、40 个唯一任务 ID；该数量不自动构成论文成绩的评测分母。
- `data/driver-results.json`：从 `leaderboard-20261029-complete.zip` 导入的 2026-10-29 21:00（UTC+8）快照。结果包共 44 题、176 条记录；榜单沿用 `four_arms_strict`，保留四组共同可评测的 34 题、136 条结果。三个方向的分母分别为 7、16、11；对应完整题库分别为 10、17、17 题。10 道排除任务及原因在页面协议说明中列出。

IoTEval 的编译指标沿用论文 Rate@Pass；API 与头文件指标同样来自论文。最佳值只在相同模型、OS 和指标内标注。

驱动软件通过要求原生编译与软件行为测试同时通过，分母为每个方向内的共同任务数。未执行与失败在详情中分别展示。四个配置的输入条件不同，不计算总分或统一冠军。完整导出不代表全部 44 题都进入严格共同子集；模型未覆盖或观察未完成的任务保持排除。

Driver Migration 页仅提供 **Download benchmark**，下载用户提供的 `benchmark.zip` 原样副本（保存为 `data/driver-benchmark.zip`）。没有报告、CSV 或结果 JSON 下载按钮；JSON 仅供前端读取。旧结果 JSON、CSV、报告已删除，也未导入结果包中的历史批次。项目仍可独立部署。

## 导入结果

```bash
python3 scripts/import_driver_results.py /path/to/leaderboard-20261029-complete.zip
```

导入脚本使用 Python 标准库，先核对包内所有文件的 SHA-256，再交叉核对 snapshot、严格子集 CSV 和汇总计数，生成唯一的当前驱动数据文件。数据中保留来源 ZIP 与相关成员哈希、当前成绩和排除说明，不依赖原项目路径。读取新导出包即可重新生成数据，查看网页无需导出包或 Python。

## 校验

```bash
python3 scripts/verify_data.py
```

校验论文矩阵完整性、四组共同任务及分方向分母、编译和软件指标、来源汇总、排除项、benchmark 哈希以及官方任务 CSV 格式。

界面入口为 `index.html`，渲染逻辑为 `app.js`，样式为 `styles.css`。源码通过原生浏览器 API 运行，没有构建产物或第三方前端依赖。
