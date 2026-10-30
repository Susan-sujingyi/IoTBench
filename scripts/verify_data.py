"""Check source integrity and leaderboard scoring contracts without running models."""
import csv
import hashlib
import json
import zipfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def check(condition, message):
    if not condition:
        raise SystemExit(f"FAIL: {message}")


paper = json.loads((DATA / "ioteval-paper.json").read_text())
check(paper["evidence_type"] == "paper_reported", "paper evidence type")
os_keys = {entry["key"] for entry in paper["benchmarks"]}
check(os_keys == {"riot", "zephyr", "contiki", "freertos"}, "paper OSes")
check(set(paper["methods"]) == {"Direct", "Auto-CoT", "MapCoder", "IoTPilot"}, "paper methods")
expected = {(os, model, method) for os in os_keys for model in paper["models"] for method in paper["methods"]}
keys = [(r["benchmark"], r["model"], r["method"]) for r in paper["results"]]
check(len(keys) == len(set(keys)) == 32 and set(keys) == expected, "paper result matrix")
for row in paper["results"]:
    for key in ["rate_at_pass", "acc_api", "acc_header"]:
        value = row["metrics"][key]
        check(value is None or isinstance(value, (int, float)) and 0 <= value <= 100, f"paper metric {key}")

with (DATA / "ioteval-app.csv").open(encoding="utf-8-sig", newline="") as stream:
    reader = csv.DictReader(stream)
    check(reader.fieldnames == ["code_name", "problem"], "official task CSV columns")
    tasks = list(reader)
check(len(tasks) == 42 and len({t["code_name"] for t in tasks}) == 40, "official CSV snapshot")
check(all(t["code_name"] and t["problem"] for t in tasks), "official task content")

driver = json.loads((DATA / "driver-results.json").read_text())
check(driver["subset"] == "four_arms_strict", "driver subset")
check(driver["score_format"] == "strict_software", "driver protocol")
task_ids = {t["id"] for t in driver["tasks"]}
check(len(task_ids) == len(driver["tasks"]) == driver["subset_cases"] == 34, "shared driver tasks")
check(driver["total_cases"] == 44 and driver["excluded_cases"] == 10, "driver pool size")
check(Counter((t['source_os'], t['target_os']) for t in driver['tasks']) == {('riot', 'tock'): 7, ('zephyr', 'nuttx'): 16, ('zephyr', 'tock'): 11}, 'direction denominators')
universe = driver['task_universe']
check(len(universe) == len({t['id'] for t in universe}) == 44, 'full task universe')
check({t['id'] for t in universe if t['in_strict_subset']} == task_ids, 'subset membership')
check(all(t['exclusion_reason'] for t in universe if not t['in_strict_subset']), 'excluded task reasons')
arms = driver["results"]
check(len(arms) == 4 and {r["id"] for r in arms} == {"codex-s", "codex-d", "codex-sd", "autoembed-s"}, "driver configurations")
for arm in arms:
    scores = arm["scores"]
    check(len(scores) == len(task_ids) and {s["task_id"] for s in scores} == task_ids, "same denominator for all arms")
    for score in scores:
        check(score["native_compile_pass"] in [None, 0, 1], "compile tri-state")
        check(score["behavior_test_pass"] in [None, 0, 1], "behavior tri-state")
        check(score["end_to_end_success"] == int(score["native_compile_pass"] == 1 and score["behavior_test_pass"] == 1), "software E2E definition")
        check(score["hardware_status"] == "not_run", "hardware scope")
    compile_pass = sum(s["native_compile_pass"] == 1 for s in scores)
    software_pass = sum(s["end_to_end_success"] == 1 for s in scores)
    check(arm["counts"] == {"tasks": 34, "compile_pass": compile_pass, "software_e2e_pass": software_pass}, "aggregate counts")
    check(arm["metrics"]["compile_rate"] == round(100 * compile_pass / 34, 2), "compile rate")
    check(arm["metrics"]["software_e2e_rate"] == round(100 * software_pass / 34, 2), "software rate")
    source = next(s for s in driver['source']['summary'] if s['label'] == arm['method'])
    check((source['task_count'], source['native_compile_pass_count'], source['end_to_end_pass_count']) == (34, compile_pass, software_pass), 'matches imported source summary')
check(driver['source']['archive'] == 'leaderboard-20261029-complete.zip', 'current source')
check(not list(DATA.glob('driver-four-arms-*')), 'obsolete driver files removed')
check(zipfile.is_zipfile(DATA / "driver-benchmark.zip"), "driver benchmark download is a valid ZIP")
check(hashlib.sha256((DATA / 'driver-benchmark.zip').read_bytes()).hexdigest() == '0e624083bef4c7fa26b2cea85781c52a866a4b1efac18b5c6efc2150f0587109', 'benchmark unchanged')
print("PASS: 96 paper metrics, 42 official CSV rows, 136 driver task results across 3 directions, 10 exclusions, and unchanged benchmark ZIP.")
