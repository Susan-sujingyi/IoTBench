# IoTBench Leaderboard

独立、无构建依赖的静态榜单。仅包含应用层代码生成和驱动代码迁移两个入口。

## 本地查看

在项目根目录执行：

```bash
python3 -m http.server 8765
```

打开 `http://localhost:8765/`。需要通过 HTTP 服务访问，不能直接双击 HTML。

- `?scene=applications`：应用层代码生成，默认入口。横向为 OS → 三项指标，纵向为后端模型 → 方法。
- `?scene=drivers`：驱动迁移的四个实验配置；点击方法查看逐题结果。

仅需将本目录的 HTML、CSS、JavaScript 和 `data/` 放入静态托管目录。不需要 Node、后端、数据库或 API 密钥。

## 数据来源与口径

- `data/ioteval-paper.json`：IoTPilot 论文的 32 组方法／模型／OS 聚合结果，三个指标共 96 个值。仅含 Direct、Auto-CoT、MapCoder、IoTPilot；没有使用旧 RIOT CSV 的 12 组历史成绩。
- `data/ioteval-app.csv`：直接复制官方仓库 `datasets/app.csv`，未做去重或改写。官方提交为 `614e4e5e17039e38167d602d9534ec71ebb04821`。原文件 42 行、40 个唯一任务 ID；该数量不自动构成论文成绩的评测分母。
- `data/driver-four-arms-results.json`：2026-10-29 的 `four_arms_strict` 快照，21 道共同任务、四个实验配置。配套原始 CSV 和报告保留，以便核对逐题结果、排除项和版本。

IoTEval 的编译指标沿用论文 Rate@Pass；API 与头文件指标同样来自论文。最佳值只在相同模型、OS 和指标内标注。

驱动软件通过要求原生编译与软件行为测试同时通过，分母为全部 21 道共同任务。未执行与失败在详情中分别展示。四个配置的输入条件不同，不计算总分或统一冠军。

Driver Migration 页提供两个独立入口：**Download benchmark** 下载用户提供的 `benchmark.zip` 原样副本（保存为 `data/driver-benchmark.zip`），**Download results** 下载实验结果 CSV。压缩包不解压、不改写。没有导入旧综合题库、旧驱动成绩、`judge/jobs/` 或运行环境。

## 校验

```bash
python3 scripts/verify_data.py
```

校验论文矩阵完整性、四臂共同任务及分母、编译和软件指标、原始 CSV／报告哈希以及官方任务 CSV 格式。

界面入口为 `index.html`，渲染逻辑为 `app.js`，样式为 `styles.css`。源码通过原生浏览器 API 运行，没有构建产物或第三方前端依赖。
