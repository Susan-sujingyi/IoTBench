# 当前驱动迁移实验测试报告

统计读取窗口：2026-10-29T08:58:32+08:00 至 2026-10-29T08:58:41+08:00（Asia/Shanghai）。这是固定快照，后台续跑不受影响。

## 统计范围与去重规则

题库共 44 道任务、16 种传感器；RIOT→Tock 10 题、Zephyr→NuttX 17 题、Zephyr→Tock 17 题。四个实验臂共 176 个计划单元，每单元重复次数为 1。SPI 模式、总线和迁移方向分别作为任务身份，不合并成传感器成功率。

主统计沿 r8-comparison-001 → r9 → r10 → r11 → r12 的已批准恢复计划选择结果。重复尝试只按恢复关系取有效后继，不按成绩选最好候选。r12 的两个保留候选以独立收尾结果替代未评分视图，原始生成超时和清理失败仍可追溯。

题目与评分固定为 r8（`059f2d8a535858015476ec6db1bde4cdf35b2144d1f24641121cb88f49a62c7b`），执行层跨 r8–r12，不能描述为全部在同一执行层下完成。算法、公开输入和评分的兼容性依据在 snapshot.json 中绑定。旧 codex-overall-001、pilot、旧候选复评/恢复记录只在 historical_batches.csv 列出，不与主实验拼接，不把复评算成新的一次生成。

模型为 gpt-5.6-luna；每题配置上限 1800 秒、64 次请求、20 元（以原批次配置为准）。本报告不重新运行模型、编译、评分或硬件验证。

## 当前全量进度（各臂分母均为 44）

| 实验臂 | 已开始 | 已有封存报告 | 编译通过 | 行为通过 | 编译失败 | 行为失败 | 模型未覆盖 | 观察未完成 | 基础设施错误 | 提交拒绝 | 进行中 | 未开始 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Codex CLI / S | 30 | 29 | 24 | 2 | 4 | 20 | 1 | 1 | 1 | 0 | 1 | 14 |
| Codex CLI / D | 44 | 44 | 40 | 3 | 4 | 32 | 3 | 2 | 0 | 0 | 0 | 0 |
| Codex CLI / SD | 43 | 42 | 37 | 5 | 3 | 25 | 4 | 3 | 1 | 1 | 1 | 1 |
| AutoEmbed / S | 44 | 44 | 13 | 1 | 31 | 12 | 0 | 0 | 0 | 0 | 0 | 0 |

“已有封存报告”包含失败和待修复报告，不等于成功。编译通过只采用原生目标构建的 pass；软件行为通过只采用 software_status=pass，不能用固件打包或编译成功替代。编译失败的行为测试通常未执行，因此 behavior_test_pass 留空，但端到端成功率中仍计为失败。参考固件的真机验证不转移到方法候选；当前所选候选无已导入的真机通过报告。

## 可用于当前 leaderboard 的共同子集

这些是**中期、按可评测性筛选的子集**，不是全 44 题最终排名；缺失和未覆盖的排除会造成选择偏差，特别是候选相关的 model_unsupported。必须同时展示子集名称、分母、任务清单、版本与排除数，不能把未覆盖记成普通驱动失败，也不能隐藏它们。最终论文仍需全题库汇总、覆盖率和独立重复实验。

严格子集只收录各参与臂均已封存、评分身份一致且结果属于 pass / behavior_failed / compile_failed / submission_rejected 的任务。not_completed 即使是不可重试终态，也在全表保留并从严格子集中排除；这是保守展示口径，不修改原评分或恢复判断。编译失败和拒绝提交不会被筛掉。

- `method_S_strict.csv`：Codex CLI S 与 AutoEmbed S 的相同输入条件比较，建议作为当前方法 leaderboard 的主入口。
- `codex_conditions_strict.csv`：Codex CLI 的 S/D/SD 共同任务，用于输入条件比较。
- `four_arms_strict.csv`：四臂共同任务，适合一个固定任务集合的展示；D/SD 与 AutoEmbed S 输入信息不同，不能解释为同条件方法优劣。

| 子集 | 实验臂 | 任务数 | 传感器数 | 编译通过 | 端到端通过 | 端到端通过率 |
| --- | --- | --- | --- | --- | --- | --- |
| method_S_strict | Codex CLI / S | 26 | 16 | 22 | 2 | 7.69% |
| method_S_strict | AutoEmbed / S | 26 | 16 | 12 | 1 | 3.85% |
| codex_conditions_strict | Codex CLI / S | 21 | 14 | 19 | 1 | 4.76% |
| codex_conditions_strict | Codex CLI / D | 21 | 14 | 18 | 2 | 9.52% |
| codex_conditions_strict | Codex CLI / SD | 21 | 14 | 18 | 1 | 4.76% |
| four_arms_strict | Codex CLI / S | 21 | 14 | 19 | 1 | 4.76% |
| four_arms_strict | Codex CLI / D | 21 | 14 | 18 | 2 | 9.52% |
| four_arms_strict | Codex CLI / SD | 21 | 14 | 18 | 1 | 4.76% |
| four_arms_strict | AutoEmbed / S | 21 | 14 | 11 | 1 | 4.76% |

端到端通过率 = 该共同子集内原生构建及软件行为均通过的任务数 / 同一子集任务数。不是“仅在已编译通过任务中”的通过率；也不是硬件通过率。所有表中 0、空值与未执行保持区分。

## 逐题状态

下表每格格式为“总状态 / 编译 / 行为”。全部逐项字段、来源路径与哈希见 results.csv；适合网页宽表展示的版本见 task_matrix.csv。

| 任务 ID | Codex CLI / S | Codex CLI / D | Codex CLI / SD | AutoEmbed / S |
| --- | --- | --- | --- | --- |
| riot-tock-adt7310-spi-mode0 | behavior_failed / pass / fail | model_unsupported / pass / unsupported | pass / pass / pass | compile_failed / compile_failed / not_run |
| riot-tock-apds9960-i2c | infrastructure_error / not_run / not_run | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| riot-tock-bh1750-i2c | behavior_failed / pass / fail | not_completed / pass / incomplete | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| riot-tock-bme280-i2c | not_completed / pass / incomplete | behavior_failed / pass / fail | not_completed / pass / incomplete | compile_failed / compile_failed / not_run |
| riot-tock-bme280-spi-mode0 | behavior_failed / pass / fail | behavior_failed / pass / fail | submission_rejected / not_run / not_run | compile_failed / compile_failed / not_run |
| riot-tock-ccs811-i2c | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| riot-tock-dht11-gpio | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| riot-tock-lps22hb-i2c | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| riot-tock-lsm303dlhc-i2c | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| riot-tock-sht3x-i2c | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| zephyr-nuttx-adt7310-spi-mode3 | compile_failed / compile_failed / not_run | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail |
| zephyr-nuttx-apds9960-i2c | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run | behavior_failed / pass / fail |
| zephyr-nuttx-bh1750-i2c | pass / pass / pass | pass / pass / pass | pass / pass / pass | pass / pass / pass |
| zephyr-nuttx-bme280-i2c | behavior_failed / pass / fail | compile_failed / compile_failed / not_run | behavior_failed / pass / fail | behavior_failed / pass / fail |
| zephyr-nuttx-bme280-spi-mode3 | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail |
| zephyr-nuttx-bmm150-i2c | compile_failed / compile_failed / not_run | compile_failed / compile_failed / not_run | infrastructure_error / not_run / not_run | compile_failed / compile_failed / not_run |
| zephyr-nuttx-bmp388-i2c | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| zephyr-nuttx-ccs811-i2c | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail |
| zephyr-nuttx-dht11-gpio | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail |
| zephyr-nuttx-dht20-i2c | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail |
| zephyr-nuttx-dps310-i2c | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail |
| zephyr-nuttx-isl29035-i2c | behavior_failed / pass / fail | compile_failed / compile_failed / not_run | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| zephyr-nuttx-lps22hb-i2c | behavior_failed / pass / fail | compile_failed / compile_failed / not_run | compile_failed / compile_failed / not_run | behavior_failed / pass / fail |
| zephyr-nuttx-lsm303dlhc-i2c | compile_failed / compile_failed / not_run | pass / pass / pass | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| zephyr-nuttx-lsm6dso-i2c | compile_failed / compile_failed / not_run | behavior_failed / pass / fail | model_unsupported / pass / unsupported | compile_failed / compile_failed / not_run |
| zephyr-nuttx-mpu6050-i2c | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| zephyr-nuttx-sht3x-i2c | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail | behavior_failed / pass / fail |
| zephyr-tock-adt7310-spi-mode3 | pass / pass / pass | model_unsupported / pass / unsupported | pass / pass / pass | behavior_failed / pass / fail |
| zephyr-tock-apds9960-i2c | model_unsupported / pass / unsupported | behavior_failed / pass / fail | model_unsupported / pass / unsupported | compile_failed / compile_failed / not_run |
| zephyr-tock-bh1750-i2c | in_progress / not_run / not_run | behavior_failed / pass / fail | pass / pass / pass | compile_failed / compile_failed / not_run |
| zephyr-tock-bme280-i2c | not_started / not_run / not_run | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| zephyr-tock-bme280-spi-mode3 | not_started / not_run / not_run | not_completed / pass / incomplete | model_unsupported / pass / unsupported | compile_failed / compile_failed / not_run |
| zephyr-tock-bmm150-i2c | not_started / not_run / not_run | model_unsupported / pass / unsupported | model_unsupported / pass / unsupported | compile_failed / compile_failed / not_run |
| zephyr-tock-bmp388-i2c | not_started / not_run / not_run | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| zephyr-tock-ccs811-i2c | not_started / not_run / not_run | behavior_failed / pass / fail | not_completed / pass / incomplete | compile_failed / compile_failed / not_run |
| zephyr-tock-dht11-gpio | not_started / not_run / not_run | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| zephyr-tock-dht20-i2c | not_started / not_run / not_run | behavior_failed / pass / fail | compile_failed / compile_failed / not_run | compile_failed / compile_failed / not_run |
| zephyr-tock-dps310-i2c | not_started / not_run / not_run | behavior_failed / pass / fail | not_completed / pass / incomplete | compile_failed / compile_failed / not_run |
| zephyr-tock-isl29035-i2c | not_started / not_run / not_run | pass / pass / pass | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| zephyr-tock-lps22hb-i2c | not_started / not_run / not_run | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| zephyr-tock-lsm303dlhc-i2c | not_started / not_run / not_run | behavior_failed / pass / fail | pass / pass / pass | compile_failed / compile_failed / not_run |
| zephyr-tock-lsm6dso-i2c | not_started / not_run / not_run | behavior_failed / pass / fail | behavior_failed / pass / fail | compile_failed / compile_failed / not_run |
| zephyr-tock-mpu6050-i2c | not_started / not_run / not_run | behavior_failed / pass / fail | in_progress / not_run / not_run | behavior_failed / pass / fail |
| zephyr-tock-sht3x-i2c | not_started / not_run / not_run | behavior_failed / pass / fail | not_started / not_run / not_run | compile_failed / compile_failed / not_run |

## 已通过软件行为测试的任务

| 实验臂 | 任务 | 结果路径 |
| --- | --- | --- |
| Codex CLI / SD | riot-tock-adt7310-spi-mode0 | result/codex_cli/overall/r8-comparison-001-codex-sd/trials/riot-tock-adt7310-spi-mode0/SD/0 |
| Codex CLI / S | zephyr-nuttx-bh1750-i2c | result/codex_cli/overall/r10-continuation-001-codex-s/trials/zephyr-nuttx-bh1750-i2c/S/0 |
| Codex CLI / D | zephyr-nuttx-bh1750-i2c | result/codex_cli/overall/r8-comparison-001-codex-d/trials/zephyr-nuttx-bh1750-i2c/D/0 |
| Codex CLI / SD | zephyr-nuttx-bh1750-i2c | result/codex_cli/overall/r8-comparison-001-codex-sd/trials/zephyr-nuttx-bh1750-i2c/SD/0 |
| AutoEmbed / S | zephyr-nuttx-bh1750-i2c | result/autoembed/overall/r10-continuation-001-autoembed-s/trials/zephyr-nuttx-bh1750-i2c/S/0 |
| Codex CLI / D | zephyr-nuttx-lsm303dlhc-i2c | result/codex_cli/overall/r10-continuation-001-codex-d/trials/zephyr-nuttx-lsm303dlhc-i2c/D/0 |
| Codex CLI / S | zephyr-tock-adt7310-spi-mode3 | result/codex_cli/overall/r11-continuation-001-codex-s/trials/zephyr-tock-adt7310-spi-mode3/S/0 |
| Codex CLI / SD | zephyr-tock-adt7310-spi-mode3 | result/codex_cli/overall/r11-continuation-001-codex-sd/trials/zephyr-tock-adt7310-spi-mode3/SD/0 |
| Codex CLI / SD | zephyr-tock-bh1750-i2c | result/codex_cli/overall/r11-continuation-001-codex-sd/trials/zephyr-tock-bh1750-i2c/SD/0 |
| Codex CLI / D | zephyr-tock-isl29035-i2c | result/codex_cli/overall/r11-continuation-001-codex-d/trials/zephyr-tock-isl29035-i2c/D/0 |
| Codex CLI / SD | zephyr-tock-lsm303dlhc-i2c | result/codex_cli/overall/r11-continuation-001-codex-sd/trials/zephyr-tock-lsm303dlhc-i2c/SD/0 |

## 共同子集清单与排除说明

### method_S_strict

共 26 题。纳入任务：

- `riot-tock-adt7310-spi-mode0`
- `riot-tock-bh1750-i2c`
- `riot-tock-bme280-spi-mode0`
- `riot-tock-ccs811-i2c`
- `riot-tock-dht11-gpio`
- `riot-tock-lps22hb-i2c`
- `riot-tock-lsm303dlhc-i2c`
- `riot-tock-sht3x-i2c`
- `zephyr-nuttx-adt7310-spi-mode3`
- `zephyr-nuttx-apds9960-i2c`
- `zephyr-nuttx-bh1750-i2c`
- `zephyr-nuttx-bme280-i2c`
- `zephyr-nuttx-bme280-spi-mode3`
- `zephyr-nuttx-bmm150-i2c`
- `zephyr-nuttx-bmp388-i2c`
- `zephyr-nuttx-ccs811-i2c`
- `zephyr-nuttx-dht11-gpio`
- `zephyr-nuttx-dht20-i2c`
- `zephyr-nuttx-dps310-i2c`
- `zephyr-nuttx-isl29035-i2c`
- `zephyr-nuttx-lps22hb-i2c`
- `zephyr-nuttx-lsm303dlhc-i2c`
- `zephyr-nuttx-lsm6dso-i2c`
- `zephyr-nuttx-mpu6050-i2c`
- `zephyr-nuttx-sht3x-i2c`
- `zephyr-tock-adt7310-spi-mode3`

| 排除任务 | 原因 |
| --- | --- |
| riot-tock-apds9960-i2c | Codex CLI / S: pending_infrastructure_recovery |
| riot-tock-bme280-i2c | Codex CLI / S: not_completed |
| zephyr-tock-apds9960-i2c | Codex CLI / S: model_unsupported |
| zephyr-tock-bh1750-i2c | Codex CLI / S: in_progress |
| zephyr-tock-bme280-i2c | Codex CLI / S: not_started |
| zephyr-tock-bme280-spi-mode3 | Codex CLI / S: not_started |
| zephyr-tock-bmm150-i2c | Codex CLI / S: not_started |
| zephyr-tock-bmp388-i2c | Codex CLI / S: not_started |
| zephyr-tock-ccs811-i2c | Codex CLI / S: not_started |
| zephyr-tock-dht11-gpio | Codex CLI / S: not_started |
| zephyr-tock-dht20-i2c | Codex CLI / S: not_started |
| zephyr-tock-dps310-i2c | Codex CLI / S: not_started |
| zephyr-tock-isl29035-i2c | Codex CLI / S: not_started |
| zephyr-tock-lps22hb-i2c | Codex CLI / S: not_started |
| zephyr-tock-lsm303dlhc-i2c | Codex CLI / S: not_started |
| zephyr-tock-lsm6dso-i2c | Codex CLI / S: not_started |
| zephyr-tock-mpu6050-i2c | Codex CLI / S: not_started |
| zephyr-tock-sht3x-i2c | Codex CLI / S: not_started |

### codex_conditions_strict

共 21 题。纳入任务：

- `riot-tock-bme280-spi-mode0`
- `riot-tock-ccs811-i2c`
- `riot-tock-dht11-gpio`
- `riot-tock-lps22hb-i2c`
- `riot-tock-lsm303dlhc-i2c`
- `riot-tock-sht3x-i2c`
- `zephyr-nuttx-adt7310-spi-mode3`
- `zephyr-nuttx-apds9960-i2c`
- `zephyr-nuttx-bh1750-i2c`
- `zephyr-nuttx-bme280-i2c`
- `zephyr-nuttx-bme280-spi-mode3`
- `zephyr-nuttx-bmp388-i2c`
- `zephyr-nuttx-ccs811-i2c`
- `zephyr-nuttx-dht11-gpio`
- `zephyr-nuttx-dht20-i2c`
- `zephyr-nuttx-dps310-i2c`
- `zephyr-nuttx-isl29035-i2c`
- `zephyr-nuttx-lps22hb-i2c`
- `zephyr-nuttx-lsm303dlhc-i2c`
- `zephyr-nuttx-mpu6050-i2c`
- `zephyr-nuttx-sht3x-i2c`

| 排除任务 | 原因 |
| --- | --- |
| riot-tock-adt7310-spi-mode0 | Codex CLI / D: model_unsupported |
| riot-tock-apds9960-i2c | Codex CLI / S: pending_infrastructure_recovery |
| riot-tock-bh1750-i2c | Codex CLI / D: not_completed |
| riot-tock-bme280-i2c | Codex CLI / S: not_completed; Codex CLI / SD: not_completed |
| zephyr-nuttx-bmm150-i2c | Codex CLI / SD: pending_infrastructure_recovery |
| zephyr-nuttx-lsm6dso-i2c | Codex CLI / SD: model_unsupported |
| zephyr-tock-adt7310-spi-mode3 | Codex CLI / D: model_unsupported |
| zephyr-tock-apds9960-i2c | Codex CLI / S: model_unsupported; Codex CLI / SD: model_unsupported |
| zephyr-tock-bh1750-i2c | Codex CLI / S: in_progress |
| zephyr-tock-bme280-i2c | Codex CLI / S: not_started |
| zephyr-tock-bme280-spi-mode3 | Codex CLI / S: not_started; Codex CLI / D: not_completed; Codex CLI / SD: model_unsupported |
| zephyr-tock-bmm150-i2c | Codex CLI / S: not_started; Codex CLI / D: model_unsupported; Codex CLI / SD: model_unsupported |
| zephyr-tock-bmp388-i2c | Codex CLI / S: not_started |
| zephyr-tock-ccs811-i2c | Codex CLI / S: not_started; Codex CLI / SD: not_completed |
| zephyr-tock-dht11-gpio | Codex CLI / S: not_started |
| zephyr-tock-dht20-i2c | Codex CLI / S: not_started |
| zephyr-tock-dps310-i2c | Codex CLI / S: not_started; Codex CLI / SD: not_completed |
| zephyr-tock-isl29035-i2c | Codex CLI / S: not_started |
| zephyr-tock-lps22hb-i2c | Codex CLI / S: not_started |
| zephyr-tock-lsm303dlhc-i2c | Codex CLI / S: not_started |
| zephyr-tock-lsm6dso-i2c | Codex CLI / S: not_started |
| zephyr-tock-mpu6050-i2c | Codex CLI / S: not_started; Codex CLI / SD: in_progress |
| zephyr-tock-sht3x-i2c | Codex CLI / S: not_started; Codex CLI / SD: not_started |

### four_arms_strict

共 21 题。纳入任务：

- `riot-tock-bme280-spi-mode0`
- `riot-tock-ccs811-i2c`
- `riot-tock-dht11-gpio`
- `riot-tock-lps22hb-i2c`
- `riot-tock-lsm303dlhc-i2c`
- `riot-tock-sht3x-i2c`
- `zephyr-nuttx-adt7310-spi-mode3`
- `zephyr-nuttx-apds9960-i2c`
- `zephyr-nuttx-bh1750-i2c`
- `zephyr-nuttx-bme280-i2c`
- `zephyr-nuttx-bme280-spi-mode3`
- `zephyr-nuttx-bmp388-i2c`
- `zephyr-nuttx-ccs811-i2c`
- `zephyr-nuttx-dht11-gpio`
- `zephyr-nuttx-dht20-i2c`
- `zephyr-nuttx-dps310-i2c`
- `zephyr-nuttx-isl29035-i2c`
- `zephyr-nuttx-lps22hb-i2c`
- `zephyr-nuttx-lsm303dlhc-i2c`
- `zephyr-nuttx-mpu6050-i2c`
- `zephyr-nuttx-sht3x-i2c`

| 排除任务 | 原因 |
| --- | --- |
| riot-tock-adt7310-spi-mode0 | Codex CLI / D: model_unsupported |
| riot-tock-apds9960-i2c | Codex CLI / S: pending_infrastructure_recovery |
| riot-tock-bh1750-i2c | Codex CLI / D: not_completed |
| riot-tock-bme280-i2c | Codex CLI / S: not_completed; Codex CLI / SD: not_completed |
| zephyr-nuttx-bmm150-i2c | Codex CLI / SD: pending_infrastructure_recovery |
| zephyr-nuttx-lsm6dso-i2c | Codex CLI / SD: model_unsupported |
| zephyr-tock-adt7310-spi-mode3 | Codex CLI / D: model_unsupported |
| zephyr-tock-apds9960-i2c | Codex CLI / S: model_unsupported; Codex CLI / SD: model_unsupported |
| zephyr-tock-bh1750-i2c | Codex CLI / S: in_progress |
| zephyr-tock-bme280-i2c | Codex CLI / S: not_started |
| zephyr-tock-bme280-spi-mode3 | Codex CLI / S: not_started; Codex CLI / D: not_completed; Codex CLI / SD: model_unsupported |
| zephyr-tock-bmm150-i2c | Codex CLI / S: not_started; Codex CLI / D: model_unsupported; Codex CLI / SD: model_unsupported |
| zephyr-tock-bmp388-i2c | Codex CLI / S: not_started |
| zephyr-tock-ccs811-i2c | Codex CLI / S: not_started; Codex CLI / SD: not_completed |
| zephyr-tock-dht11-gpio | Codex CLI / S: not_started |
| zephyr-tock-dht20-i2c | Codex CLI / S: not_started |
| zephyr-tock-dps310-i2c | Codex CLI / S: not_started; Codex CLI / SD: not_completed |
| zephyr-tock-isl29035-i2c | Codex CLI / S: not_started |
| zephyr-tock-lps22hb-i2c | Codex CLI / S: not_started |
| zephyr-tock-lsm303dlhc-i2c | Codex CLI / S: not_started |
| zephyr-tock-lsm6dso-i2c | Codex CLI / S: not_started |
| zephyr-tock-mpu6050-i2c | Codex CLI / S: not_started; Codex CLI / SD: in_progress |
| zephyr-tock-sht3x-i2c | Codex CLI / S: not_started; Codex CLI / SD: not_started |

## 历史与待办

r8 原始批次仍有两项基础设施中断后待离线收尾：`riot-tock-apds9960-i2c / S` 与 `zephyr-nuttx-bmm150-i2c / SD`。本次仅统计，不补跑、不修订评分，亦不借用其他批次的同名题结果填补。

r12 正在运行的结果只按上述读取窗口展示。其余历史批次的报告数量见 historical_batches.csv；rescore 是同一候选的再次评分，不能与原生成叠加样本量。AutoDriver 尚无纳入本轮正式对比的结果，不以参考实现充当 AutoDriver 成绩。

## 文件与字段

- `results.csv`：176 行主实验明细；`native_compile_pass` 与 `behavior_test_pass` 的空值表示未获得该二值测量，不能填成通过。`end_to_end_success` 仅对严格可用结果给出 0/1。
- `task_matrix.csv`：44 行，每题四臂并列，并带三个共同子集标记。
- `leaderboard_summary.csv`：共同分母上的汇总，可直接作为榜单数据源。
- 三个 `*_strict.csv`：可直接导入对应榜单的逐题长表。
- `snapshot.json`：固定读取结果、恢复链、输入证据哈希和子集成员。
- `historical_batches.csv`：独立历史批次清单，不自动合并。
- `validation.json`：导出结构、一致性和分母检查。
- CSV 采用 UTF-8 BOM，便于 Windows Excel 打开；所有材料路径相对 artifacts 根目录。

如需刷新，使用本目录 export_report.py 的 --output 指向一个新的 result/reports 子目录；不会修改当前快照或任何正在运行的实验代码。
