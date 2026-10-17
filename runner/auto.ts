import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRun, disturb, step } from "../src/lib/roop/engine.ts";
import { getScenario } from "../src/lib/roop/scenarios.ts";
import { verdict } from "../src/lib/roop/verdict.ts";
import type { Mode, RunState } from "../src/lib/roop/types.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function arg(name: string, fallback: string) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

async function loadState(path: string, scenarioId: string, mode: Mode, anchored: boolean) {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as RunState;
    if (parsed?.snap && parsed.scenarioId === scenarioId && parsed.mode === mode && parsed.anchored === anchored) {
      return parsed;
    }
  } catch {
    // fresh loop
  }
  return createRun(scenarioId, mode, anchored);
}

function renderStatus(state: RunState) {
  const scenario = getScenario(state.scenarioId);
  const snap = state.snap;
  const reading = verdict(state);
  const lines = [
    "# STATUS",
    "",
    `更新: 自動ループ tick ${snap.tick}`,
    "",
    `- 場面: ${scenario.name} (${state.scenarioId})`,
    `- 形: ${state.mode === "graph" ? "ループのグラフ" : "単一ループ"}`,
    `- アンカー: ${state.anchored ? "接地" : "切断"}`,
    `- ${scenario.reportedLabel}: ${snap.reported}（目標 ${snap.target}）`,
    `- ${scenario.realityLabel}: ${snap.reality}`,
    `- 報告書が見ている現実: ${snap.belief}`,
    `- ${scenario.qualityLabel}: ${snap.quality}`,
    `- ${scenario.paceLabel}: ${snap.pace}`,
    `- 測定の健全さ: ${snap.integrity}`,
    `- 無駄: ${snap.waste}`,
    `- 直前の動作: ${state.lastAction}`,
    state.veto ? `- 拒否: ${state.veto}` : "- 拒否: なし",
    "",
    `## 判定`,
    "",
    `**${reading.title}**`,
    "",
    reading.body,
    "",
    "## 直近",
    "",
    ...state.events.slice(0, 8).map((event) => `- t${event.tick} ${event.loop}: ${event.text}`),
    "",
  ];
  return lines.join("\n");
}

async function main() {
  const scenarioId = arg("scenario", "support");
  const mode = (arg("mode", "graph") === "single" ? "single" : "graph") as Mode;
  const anchored = arg("anchored", "true") !== "false";
  const ticks = Math.max(1, Math.min(200, Number(arg("ticks", "12")) || 12));
  const work = resolve(root, "work");
  const statePath = resolve(work, "STATE.json");

  await mkdir(work, { recursive: true });
  let state = await loadState(statePath, scenarioId, mode, anchored);
  const started = state.snap.tick;
  const fresh: RunState["events"] = [];

  for (let i = 0; i < ticks; i++) {
    if (state.mode === "graph" && state.anchored && state.snap.tick > 0 && state.snap.tick % 18 === 0) {
      state = disturb(state);
      fresh.push(state.events[0]);
    }
    const before = state.snap.tick;
    state = step(state, Number.POSITIVE_INFINITY);
    if (state.snap.tick === before) break;
    fresh.push(...state.events.filter((event) => event.tick === state.snap.tick));
  }

  state.history = state.history.slice(-80);
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await writeFile(resolve(work, "STATUS.md"), renderStatus(state));
  const trace = fresh
    .map((event) => JSON.stringify({ scenario: state.scenarioId, mode: state.mode, anchored: state.anchored, ...event }))
    .join("\n");
  if (trace) await appendFile(resolve(work, "TRACE.jsonl"), `${trace}\n`);

  process.stdout.write(
    `inner-roop ${state.scenarioId} ${state.mode} anchored=${state.anchored} ${started} → ${state.snap.tick}\n${verdict(state).title}\n`,
  );
}

await main();
