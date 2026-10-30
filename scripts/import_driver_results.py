"""Import a checked export ZIP into the standalone leaderboard (standard library only)."""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
ARMS = {"codex-s": ("Codex CLI", "S"), "codex-d": ("Codex CLI", "D"),
        "codex-sd": ("Codex CLI", "SD"), "autoembed-s": ("AutoEmbed", "S")}
OS = {"riot": "RIOT", "tock": "Tock", "zephyr": "Zephyr", "nuttx": "NuttX"}


def build(archive):
    with ZipFile(archive) as package:
        names = [n for n in package.namelist() if n.endswith('/checksums.json')]
        if len(names) != 1:
            raise ValueError("Expected one checksummed export")
        prefix = names[0].removesuffix('checksums.json')
        hashes = json.loads(package.read(names[0]))
        for name, digest in hashes.items():
            if hashlib.sha256(package.read(prefix + name)).hexdigest() != digest:
                raise ValueError(f"Checksum mismatch: {name}")
        snapshot = json.loads(package.read(prefix + 'snapshot.json'))
        validation = json.loads(package.read(prefix + 'validation.json'))
        strict = list(csv.DictReader(io.StringIO(package.read(prefix + 'four_arms_strict.csv').decode('utf-8-sig'))))
    if validation['status'] != 'pass' or snapshot['schema'] != 'autodriver.leaderboard-snapshot/v1':
        raise ValueError('Unvalidated or unsupported export')
    rows = snapshot['rows']
    ids = set(snapshot['subsets']['four_arms_strict'])
    if len({(r['task_id'], r['slot']) for r in rows}) != len(rows):
        raise ValueError('Duplicate task/configuration records')
    selected = [r for r in rows if r['task_id'] in ids]
    csv_map = {(r['task_id'], r['slot']): r for r in strict}
    if len(csv_map) != len(strict) or set(csv_map) != {(r['task_id'], r['slot']) for r in selected}:
        raise ValueError('Strict CSV and snapshot tasks differ')
    for row in selected:
        for key, value in row.items():
            if csv_map[(row['task_id'], row['slot'])][key] != ('' if value is None else str(value)):
                raise ValueError(f'CSV and snapshot disagree: {row["task_id"]}/{key}')
    universe = []
    for task_id in sorted({r['task_id'] for r in rows}):
        task_rows = [r for r in rows if r['task_id'] == task_id]
        if {r['slot'] for r in task_rows} != set(ARMS):
            raise ValueError('Missing configuration')
        r = task_rows[0]
        task = {k: r[k] for k in ['sensor', 'source_os', 'target_os', 'bus', 'spi_mode']}
        task.update(id=task_id, source_stack=OS[r['source_os']], target_stack=OS[r['target_os']],
                    in_strict_subset=task_id in ids)
        task['arm_statuses'] = {row['slot']: row['status'] for row in task_rows}
        task['exclusion_reason'] = '; '.join(f'{ARMS[row["slot"]][0]} / {row["condition"]}: {row["status"]}'
                                            for row in task_rows if not row['strict_result_eligible'])
        universe.append(task)
    results = []
    score_fields = ['task_id', 'native_compile_pass', 'behavior_test_pass', 'end_to_end_success',
                    'native_build_status', 'behavior_test_status', 'status', 'hardware_status',
                    'evaluation_sha256']
    for arm_id, (system, condition) in ARMS.items():
        scores = [r for r in selected if r['slot'] == arm_id]
        if len(scores) != len(ids) or any(not r['strict_result_eligible'] for r in scores):
            raise ValueError('Invalid common subset')
        compile_count = sum(r['native_compile_pass'] == 1 for r in scores)
        software_count = sum(r['end_to_end_success'] == 1 for r in scores)
        summary = next(s for s in snapshot['leaderboard_summary'] if s['subset'] == 'four_arms_strict'
                       and s['label'] == f'{system} / {condition}')
        if (len(scores), compile_count, software_count) != (summary['task_count'], summary['native_compile_pass_count'], summary['end_to_end_pass_count']):
            raise ValueError('Source summary mismatch')
        models = {r['model'] for r in scores}
        if len(models) != 1:
            raise ValueError('Mixed models in configuration')
        results.append(dict(id=arm_id, method=f'{system} / {condition}', system=system, condition=condition,
                            model=models.pop(), counts=dict(tasks=len(ids), compile_pass=compile_count, software_e2e_pass=software_count),
                            metrics=dict(compile_rate=round(100 * compile_count / len(ids), 2), software_e2e_rate=round(100 * software_count / len(ids), 2)),
                            scores=[{k: (None if k in ['native_compile_pass', 'behavior_test_pass'] and r[k] == '' else r[k])
                                     for k in score_fields} for r in scores]))
    tasks = [t for t in universe if t['in_strict_subset']]
    return dict(schema_version=2, subset='four_arms_strict', score_format='strict_software',
                total_cases=len(universe), subset_cases=len(tasks), excluded_cases=len(universe)-len(tasks),
                subset_sensors=len({t['sensor'] for t in tasks}), samples_per_task=1,
                snapshot_window=dict(start=snapshot['snapshot_start'], end=snapshot['snapshot_end']),
                snapshot_window_display=f"{snapshot['snapshot_start']} – {snapshot['snapshot_end']}",
                benchmark_revision='r8', benchmark_release_identity=snapshot['benchmark_release_identity'],
                report_execution_range='r8–r12', budget=dict(seconds_per_task=1800, request_limit=64, cost_limit_cny=20),
                source=dict(archive=archive.name, sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
                            member_sha256={k: hashes[k] for k in ['snapshot.json', 'four_arms_strict.csv', 'leaderboard_summary.csv', 'validation.json']},
                            summary=[s for s in snapshot['leaderboard_summary'] if s['subset'] == 'four_arms_strict']),
                tasks=tasks, task_universe=universe, results=results)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    args = parser.parse_args()
    data = build(args.archive)
    output = ROOT / 'data/driver-results.json'
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported {data["subset_cases"]}/{data["total_cases"]} common tasks, {len(data["results"])} configurations into {output}')
