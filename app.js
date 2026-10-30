"use strict";

const SOURCES = {
  applications: "data/ioteval-paper.json",
  drivers: "data/driver-four-arms-results.json",
};
const METRICS = [
  { key: "rate_at_pass", label: "Compile success", heading: "Compile<br>success (%)" },
  { key: "acc_api", label: "API accuracy", heading: "API<br>accuracy (%)" },
  { key: "acc_header", label: "Header accuracy", heading: "Header<br>accuracy (%)" },
];
const METHOD_ORDER = ["IoTPilot", "Direct", "Auto-CoT", "MapCoder"];
const ARM_ORDER = ["codex-s", "codex-d", "codex-sd", "autoembed-s"];
const cache = new Map();
let paperSort = null;
let driverSort = null;
let activeScene = null;
const dialog = document.querySelector("#task-dialog");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function requireData(condition, message) {
  if (!condition) throw new Error(message);
}

function isPercent(value) {
  return value === null || (Number.isFinite(value) && value >= 0 && value <= 100);
}

function validatePaper(data) {
  requireData(data.evidence_type === "paper_reported", "Expected paper-reported IoTEval data.");
  for (const key of ["benchmarks", "models", "methods", "results"]) {
    requireData(Array.isArray(data[key]) && data[key].length > 0, `Missing ${key}.`);
  }
  const osKeys = data.benchmarks.map((os) => os.key);
  for (const list of [osKeys, data.models, data.methods]) {
    requireData(new Set(list).size === list.length, "Duplicate benchmark, model or method.");
  }
  const seen = new Set();
  for (const row of data.results) {
    const id = JSON.stringify([row.benchmark, row.model, row.method]);
    requireData(osKeys.includes(row.benchmark) && data.models.includes(row.model) && data.methods.includes(row.method) && !seen.has(id), "Invalid or duplicate paper result.");
    seen.add(id);
    requireData(METRICS.every((metric) => isPercent(row.metrics?.[metric.key])), "Invalid paper metric.");
  }
  requireData(seen.size === osKeys.length * data.models.length * data.methods.length, "Incomplete paper result matrix.");
}

function validateDrivers(data) {
  requireData(data.subset === "four_arms_strict" && data.score_format === "strict_software", "Expected strict software evaluation results.");
  requireData(Array.isArray(data.tasks) && data.tasks.length === data.subset_cases && data.subset_cases > 0, "Invalid driver task subset.");
  const taskIds = new Set(data.tasks.map((task) => task.id));
  requireData(taskIds.size === data.subset_cases && data.excluded_cases === data.total_cases - data.subset_cases, "Driver coverage metadata is inconsistent.");
  requireData(Array.isArray(data.results) && data.results.length === ARM_ORDER.length && new Set(data.results.map((r) => r.id)).size === ARM_ORDER.length, "Expected four distinct experiment arms.");
  for (const row of data.results) {
    requireData(ARM_ORDER.includes(row.id) && Array.isArray(row.scores) && row.scores.length === data.subset_cases, "Invalid experiment arm.");
    const seen = new Set();
    for (const score of row.scores) {
      requireData(taskIds.has(score.task_id) && !seen.has(score.task_id), "Invalid or duplicate task result.");
      seen.add(score.task_id);
      requireData([null, 0, 1].includes(score.native_compile_pass) && [null, 0, 1].includes(score.behavior_test_pass), "Invalid task measurement.");
      requireData(score.end_to_end_success === Number(score.native_compile_pass === 1 && score.behavior_test_pass === 1), "Software pass must include native compilation and behavior.");
    }
    const compile = row.scores.filter((s) => s.native_compile_pass === 1).length;
    const software = row.scores.filter((s) => s.end_to_end_success === 1).length;
    requireData(row.counts.tasks === data.subset_cases && row.counts.compile_pass === compile && row.counts.software_e2e_pass === software, "Driver counts do not match task results.");
    requireData(row.metrics.compile_rate === Math.round(10000 * compile / data.subset_cases) / 100 && row.metrics.software_e2e_rate === Math.round(10000 * software / data.subset_cases) / 100, "Driver rates do not match their common denominator.");
  }
}

function sortedByValue(rows, valueFor, ascending) {
  return [...rows].sort((a, b) => {
    const av = valueFor(a);
    const bv = valueFor(b);
    if (av === bv) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return ascending ? av - bv : bv - av;
  });
}

function renderPaper(data) {
  const table = document.querySelector("#application-table");
  const resultMap = new Map(data.results.map((row) => [JSON.stringify([row.model, row.method, row.benchmark]), row.metrics]));
  const valueFor = (model, method, os, metric) => resultMap.get(JSON.stringify([model, method, os]))?.[metric] ?? null;
  const osHeaders = data.benchmarks.map((os) => `<th class="os-heading group-start" colspan="3" scope="colgroup">${escapeHtml(os.label)}</th>`).join("");
  const metricHeaders = data.benchmarks.map((os) => METRICS.map((metric, index) => {
    const selected = paperSort?.os === os.key && paperSort.metric === metric.key;
    const state = selected ? (paperSort.ascending ? "ascending" : "descending") : "none";
    return `<th class="metric-heading${index === 0 ? " group-start" : ""}" scope="col" aria-sort="${state}"><button class="sort-button" type="button" data-os="${escapeHtml(os.key)}" data-metric="${metric.key}" aria-label="Sort ${escapeHtml(os.label)} ${metric.label} within each model">${metric.heading} <span class="sort-arrow" aria-hidden="true">${selected ? (paperSort.ascending ? "↑" : "↓") : "↕"}</span></button></th>`;
  }).join("")).join("");
  const bodies = data.models.map((model) => {
    let methods = [...data.methods].sort((a, b) => METHOD_ORDER.indexOf(a) - METHOD_ORDER.indexOf(b));
    if (paperSort) methods = sortedByValue(methods, (method) => valueFor(model, method, paperSort.os, paperSort.metric), paperSort.ascending);
    const best = new Map();
    for (const os of data.benchmarks) for (const metric of METRICS) {
      const values = methods.map((method) => valueFor(model, method, os.key, metric.key)).filter((value) => value !== null);
      best.set(`${os.key}:${metric.key}`, values.length ? Math.max(...values) : null);
    }
    const rows = methods.map((method) => {
      const cells = data.benchmarks.map((os) => METRICS.map((metric, index) => {
        const value = valueFor(model, method, os.key, metric.key);
        const isBest = value !== null && value === best.get(`${os.key}:${metric.key}`);
        return `<td class="${index === 0 ? "group-start " : ""}${isBest ? "metric-best" : ""}${value === null ? " empty-cell" : ""}" title="${escapeHtml(`${model} · ${method} · ${os.label} · ${metric.label}${isBest ? " · Best within this model" : ""}`)}"><span class="metric-value">${value === null ? "—" : value.toFixed(1)}</span></td>`;
      }).join("")).join("");
      return `<tr class="result-row" data-method="${escapeHtml(method)}"><th class="method-cell" scope="row">${escapeHtml(method)}</th>${cells}</tr>`;
    }).join("");
    return `<tbody aria-label="${escapeHtml(model)}"><tr class="model-track"><th scope="rowgroup" colspan="${1 + data.benchmarks.length * 3}"><span class="track-label">MODEL TRACK</span><span class="track-name">${escapeHtml(model)}</span></th></tr>${rows}</tbody>`;
  }).join("");
  table.innerHTML = `<caption class="sr-only">IoTEval paper results. Models group methods vertically; operating systems group three metrics horizontally. All values are percentages.</caption><thead><tr><th class="method-heading" scope="col" rowspan="2">Method</th>${osHeaders}</tr><tr>${metricHeaders}</tr></thead>${bodies}`;
}

function renderDrivers(data) {
  const table = document.querySelector("#driver-table");
  document.querySelector("#driver-subtitle").textContent = `${data.results.length} configurations · ${data.subset_cases} common tasks · ${data.subset_sensors} sensors`;
  const models = [...new Set(data.results.map((row) => row.model))];
  document.querySelector("#driver-context").innerHTML = `<span>Model<strong>${escapeHtml(models.join(" / "))}</strong></span><span>Task subset<strong>${data.subset_cases} / ${data.total_cases}</strong></span><span>Snapshot<strong>${escapeHtml(data.snapshot_window_display.slice(0, 10))}</strong></span>`;
  document.querySelector("#driver-context").hidden = false;
  const directions = new Map();
  for (const task of data.tasks) {
    const key = `${task.source_stack} → ${task.target_stack}`;
    directions.set(key, (directions.get(key) || 0) + 1);
  }
  document.querySelector("#driver-protocol").innerHTML = `<p>The four_arms_strict subset contains ${data.subset_cases} shared tasks from a pool of ${data.total_cases}; ${data.excluded_cases} tasks are excluded. This is an interim subset selected by evaluability, not a final ranking over the full task pool.</p><p>Included directions: ${escapeHtml([...directions].map(([label, count]) => `${label} (${count} tasks)`).join("; "))}. One run per task and configuration. Scoring: ${escapeHtml(data.benchmark_revision)}; execution: ${escapeHtml(data.report_execution_range)}.</p><p>Per-task limits: ${data.budget.seconds_per_task / 60} minutes, ${data.budget.request_limit} requests, CNY ${data.budget.cost_limit_cny}. Snapshot: ${escapeHtml(data.snapshot_window_display)}.</p><div class="source-links"><a href="data/driver-four-arms-REPORT.md" download>Experiment report ↓</a><a href="data/driver-four-arms-strict.csv" download>Task results CSV ↓</a><a href="data/driver-four-arms-results.json" download>Full results JSON ↓</a></div>`;
  const heading = (metric, label) => {
    const selected = driverSort?.metric === metric;
    const state = selected ? (driverSort.ascending ? "ascending" : "descending") : "none";
    return `<th scope="col" aria-sort="${state}"><button class="sort-button" type="button" data-driver-metric="${metric}">${label} (%) <span class="sort-arrow" aria-hidden="true">${selected ? (driverSort.ascending ? "↑" : "↓") : "↕"}</span></button></th>`;
  };
  let rows = [...data.results].sort((a, b) => ARM_ORDER.indexOf(a.id) - ARM_ORDER.indexOf(b.id));
  if (driverSort) rows = sortedByValue(rows, (row) => row.metrics[driverSort.metric], driverSort.ascending);
  table.innerHTML = `<caption class="sr-only">Driver migration compile and software end-to-end rates. All four configurations use ${data.subset_cases} shared tasks.</caption><thead><tr><th scope="col">Method</th><th scope="col">Input condition</th>${heading("compile_rate", "Compile pass")}${heading("software_e2e_rate", "Software test pass")}</tr></thead><tbody>${rows.map((row) => `<tr class="result-row"><th scope="row"><button class="method-link" data-arm="${escapeHtml(row.id)}" type="button" aria-label="View task results for ${escapeHtml(row.method)}">${escapeHtml(row.system)}</button></th><td><span class="condition">${escapeHtml(row.condition)}</span></td><td>${row.metrics.compile_rate.toFixed(2)}<span class="metric-count">${row.counts.compile_pass}/${data.subset_cases}</span></td><td>${row.metrics.software_e2e_rate.toFixed(2)}<span class="metric-count">${row.counts.software_e2e_pass}/${data.subset_cases}</span></td></tr>`).join("")}</tbody>`;
}

function resultStatus(value, status) {
  const label = value === 1 ? "Pass" : value === 0 ? "Fail" : (status || "Not run").replaceAll("_", " ");
  return `<span class="status-${value === 1 ? "pass" : value === 0 ? "fail" : "muted"}">${escapeHtml(label)}</span>`;
}

async function showTaskResults(arm) {
  const data = await cache.get("drivers");
  const row = data?.results.find((item) => item.id === arm);
  if (!row) return;
  const tasks = new Map(data.tasks.map((task) => [task.id, task]));
  document.querySelector("#task-dialog-title").textContent = row.method;
  document.querySelector("#task-dialog-summary").textContent = `${row.model} · ${data.subset_cases} tasks · Software test pass: ${row.counts.software_e2e_pass}/${data.subset_cases}`;
  document.querySelector("#task-table").innerHTML = `<caption class="sr-only">Individual compilation and software behavior results for ${escapeHtml(row.method)}</caption><thead><tr><th scope="col">Task</th><th scope="col">Compile</th><th scope="col">Behavior test</th><th scope="col">Software E2E</th></tr></thead><tbody>${row.scores.map((score) => {
    const task = tasks.get(score.task_id);
    const direction = `${task.source_stack} → ${task.target_stack} · ${task.bus.toUpperCase()}${task.spi_mode !== null && task.spi_mode !== undefined ? ` mode ${task.spi_mode}` : ""}`;
    return `<tr><th scope="row">${escapeHtml(score.task_id)}<span class="task-direction">${escapeHtml(direction)}</span></th><td>${resultStatus(score.native_compile_pass, score.native_build_status)}</td><td>${resultStatus(score.behavior_test_pass, score.behavior_test_status)}</td><td>${resultStatus(score.end_to_end_success)}</td></tr>`;
  }).join("")}</tbody>`;
  dialog.showModal();
  dialog.querySelector(".close-button").focus();
}

async function loadScene(scene) {
  const prefix = scene === "applications" ? "application" : "driver";
  const status = document.querySelector(`#${prefix}-status`);
  const wrapper = document.querySelector(`#${prefix}-table-wrap`);
  if (!cache.has(scene)) {
    const promise = fetch(SOURCES[scene]).then(async (response) => {
      if (!response.ok) throw new Error(`Could not load results (HTTP ${response.status}).`);
      const data = await response.json();
      (scene === "applications" ? validatePaper : validateDrivers)(data);
      return data;
    });
    cache.set(scene, promise);
  }
  try {
    const data = await cache.get(scene);
    (scene === "applications" ? renderPaper : renderDrivers)(data);
    wrapper.hidden = false;
    status.hidden = true;
  } catch (error) {
    cache.delete(scene);
    wrapper.hidden = true;
    status.hidden = false;
    status.innerHTML = `${escapeHtml(error.message)} <button type="button" data-retry="${scene}">Retry</button>`;
  }
}

function sceneFromLocation() {
  return new URLSearchParams(location.search).get("scene") === "drivers" ? "drivers" : "applications";
}

function showScene(scene) {
  activeScene = scene;
  if (dialog.open) dialog.close();
  for (const key of Object.keys(SOURCES)) document.getElementById(key).hidden = key !== scene;
  document.querySelectorAll("[data-scene]").forEach((link) => {
    if (link.dataset.scene === scene) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.title = `IoTBench · ${scene === "applications" ? "Application Code Generation" : "Driver Migration"}`;
  loadScene(scene);
}

document.querySelector(".scene-nav").addEventListener("click", (event) => {
  const link = event.target.closest("[data-scene]");
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const scene = link.dataset.scene;
  if (scene === activeScene) return;
  const url = new URL(location.href);
  url.searchParams.set("scene", scene);
  history.pushState({}, "", url);
  showScene(scene);
});

document.addEventListener("click", async (event) => {
  const retry = event.target.closest("[data-retry]");
  if (retry) return loadScene(retry.dataset.retry);
  const paperButton = event.target.closest("[data-os][data-metric]");
  if (paperButton) {
    const { os, metric } = paperButton.dataset;
    paperSort = { os, metric, ascending: paperSort?.os === os && paperSort.metric === metric ? !paperSort.ascending : false };
    renderPaper(await cache.get("applications"));
    document.querySelector(`[data-os="${os}"][data-metric="${metric}"]`).focus({ preventScroll: true });
  }
  const driverButton = event.target.closest("[data-driver-metric]");
  if (driverButton) {
    const metric = driverButton.dataset.driverMetric;
    driverSort = { metric, ascending: driverSort?.metric === metric ? !driverSort.ascending : false };
    renderDrivers(await cache.get("drivers"));
    document.querySelector(`[data-driver-metric="${metric}"]`).focus({ preventScroll: true });
  }
  const armButton = event.target.closest("[data-arm]");
  if (armButton) showTaskResults(armButton.dataset.arm);
});

dialog.querySelector(".close-button").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
window.addEventListener("popstate", () => showScene(sceneFromLocation()));
showScene(sceneFromLocation());
