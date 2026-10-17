import { getScenario } from "./scenarios.ts";
import type { LoopEvent, LoopId, Mode, RunState, Scenario, Snapshot } from "./types.ts";

export const MAX_TICK = 36;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function finish(snap: Snapshot): Snapshot {
  return {
    tick: snap.tick,
    reported: round1(clamp(snap.reported)),
    reality: round1(clamp(snap.reality)),
    belief: round1(clamp(snap.belief)),
    quality: round1(clamp(snap.quality)),
    pace: round1(clamp(snap.pace)),
    integrity: round1(clamp(snap.integrity)),
    target: round1(clamp(snap.target, 50, 98)),
    waste: round1(Math.max(0, snap.waste)),
  };
}

function blankSnap(scenario: Scenario): Snapshot {
  return finish({
    tick: 0,
    waste: 0,
    belief: scenario.initial.reality,
    ...scenario.initial,
  });
}

export function createRun(scenarioId: string, mode: Mode, anchored: boolean): RunState {
  const scenario = getScenario(scenarioId);
  const snap = blankSnap(scenario);
  const opening =
    mode === "single"
      ? `単一ループを開始。見えるのは${scenario.reportedLabel}だけ。`
      : anchored
        ? "グラフを開始。最適化、監視、仲裁、参照、監査、アンカーが接続されている。"
        : "グラフを開始。形はあるがアンカーが外れている。ループは報告書しか見ていない。";

  return {
    scenarioId: scenario.id,
    mode,
    anchored: mode === "graph" && anchored,
    snap,
    history: [snap],
    events: [{ tick: 0, loop: "system", text: opening }],
    lastAction: "待機",
    veto: null,
    fired: ["system"],
  };
}

function pushEvent(events: LoopEvent[], event: LoopEvent) {
  return [event, ...events].slice(0, 14);
}

export function step(state: RunState, limit = MAX_TICK): RunState {
  if (Number.isFinite(limit) && state.snap.tick >= limit) return state;

  const scenario = getScenario(state.scenarioId);
  const prev = state.snap;
  const tick = prev.tick + 1;
  const next: Snapshot = { ...prev, tick };
  const fired: LoopId[] = [];
  const events: LoopEvent[] = [];
  let action = state.lastAction;
  let veto: string | null = null;

  const note = (loop: LoopId, text: string) => {
    fired.push(loop);
    events.push({ tick, loop, text });
  };

  if (scenario.dynamics === "conflict") {
    stepConflict(state, prev, next, note);
    action = state.mode === "single" ? (tick % 2 === 1 ? "加速" : "丁寧にする") : state.anchored ? "仲裁" : "空確認";
  } else {
    action = stepGoodhart(state, scenario, prev, next, note, (reason) => {
      veto = reason;
    });
  }

  if (tick === 12 && state.mode === "single" && scenario.dynamics === "goodhart") {
    note(
      "system",
      `${scenario.reportedLabel}は目標に忠実だ。${scenario.realityLabel}は、このループの入力にない。`,
    );
  }

  const snap = finish(next);
  return {
    ...state,
    snap,
    history: [...state.history, snap],
    events: events.reduce((list, event) => pushEvent(list, event), state.events),
    lastAction: action,
    veto,
    fired,
  };
}

function stepGoodhart(
  state: RunState,
  scenario: Scenario,
  prev: Snapshot,
  next: Snapshot,
  note: (loop: LoopId, text: string) => void,
  setVeto: (reason: string) => void,
) {
  const tick = next.tick;

  if (state.mode === "single") {
    const gap = prev.target - prev.reported;
    next.reported = prev.reported + 2.7 + Math.max(0, gap) * 0.09;
    next.quality = prev.quality - 3.4;
    next.pace = prev.pace + 1.5;
    const leak = 0.9 + Math.max(0, 72 - next.quality) * 0.08;
    next.reality = prev.reality - leak;
    next.integrity = prev.integrity - 2.1;
    next.belief = state.history[0].reality;
    next.waste = prev.waste + 0.6;
    next.target = prev.target;
    if (tick % 4 === 0) {
      note(
        "optimize",
        `回避で${scenario.reportedLabel}を上げた。${round1(clamp(next.reported))}。${scenario.realityLabel}は見ていない。`,
      );
    }
    return "回避";
  }

  if (!state.anchored) {
    next.reported = prev.reported + 2.5;
    next.quality = prev.quality - 1.15;
    next.reality = prev.reality - 1.55;
    next.integrity = prev.integrity - 2.05;
    next.pace = prev.pace + 0.7;
    next.belief = next.reported * 0.94 + 3;
    next.waste = prev.waste + 1.1;
    next.target = prev.target;
    if (tick % 6 === 0) {
      note("audit", "監査は運営の数字を財務の数字と照合した。両方緑。どちらも地面に触れていない。");
      note("watch", `報告書上の${scenario.realityLabel}は${scenario.reportedLabel}と一致している。`);
    }
    if (tick % 8 === 0) {
      next.target = prev.target + 1.5;
      note("reference", "報告書が目標を支持したので、参照を上げた。銀行の入金は見ていない。");
    }
    if (tick % 4 === 0) {
      note("optimize", `報告された${scenario.reportedLabel}を動かした。測定は報告書同士の照合になっている。`);
    }
    return "空回り";
  }

  const earlier =
    state.history.length >= 2 ? state.history[state.history.length - 2] : null;
  const falling = earlier !== null && prev.reality < earlier.reality - 0.05;
  const cheapOk = prev.quality >= 66 && prev.reality >= 70 && !falling;
  let action = "押す";

  if (!cheapOk) {
    const reason = prev.quality < 66 ? `${scenario.qualityLabel}の床` : `${scenario.realityLabel}が割れた`;
    setVeto(reason);
    next.reported = prev.reported + 0.55;
    next.quality = prev.quality + 0.8;
    next.reality = prev.reality + 0.48;
    next.pace = prev.pace + 0.05;
    next.integrity = prev.integrity + 0.15;
    action = "本解決";
    note("watch", `拒否。${reason}。安い勝ちは使わない。`);
    note("optimize", `本解決。${scenario.reportedLabel}は遅く、${scenario.realityLabel}は落ちていない。`);
  } else {
    next.reported = prev.reported + 0.9;
    next.quality = prev.quality - 0.18;
    next.reality = prev.reality + 0.14;
    next.pace = prev.pace + 0.28;
    next.integrity = Math.min(97, prev.integrity + 0.05);
    if (tick % 4 === 0) {
      note("optimize", `${scenario.reportedLabel}を少し押した。対になる${scenario.realityLabel}はまだ健全。`);
    }
  }

  next.belief = next.reality;
  next.waste = prev.waste + (cheapOk ? 0.15 : 0.05);
  next.target = prev.target;

  if (tick % 3 === 0 && next.pace > next.quality + 10) {
    next.pace -= 5;
    note("arbitrate", `${scenario.paceLabel}が${scenario.qualityLabel}を食っていた。仲裁が抑えた。`);
  }

  if (tick % 6 === 0) {
    next.integrity = Math.min(97, next.integrity + 1.5);
    note("audit", `測定はまだ${scenario.realityLabel}に触れている。ホールドアウトは最適化に見せていない。`);
  }

  if (tick % 8 === 0) {
    if (next.reality < 72) {
      next.target = Math.max(70, prev.target - 5);
      note("reference", "参照が現実から浮いていた。目標を下げた。目標を直すのも、統治された周期だ。");
    } else if (prev.target - next.reported > 16) {
      next.target = Math.max(74, prev.target - 4);
      note("reference", "目標が速すぎる。正直な速度に合わせた。");
    } else if (next.reported > prev.target - 4 && next.reality > 78) {
      next.target = Math.min(86, prev.target + 1);
      note("reference", "両方の数字が正直だ。参照を一段だけ上げた。");
    }
  }

  return action;
}

function stepConflict(
  state: RunState,
  prev: Snapshot,
  next: Snapshot,
  note: (loop: LoopId, text: string) => void,
) {
  const tick = next.tick;

  if (state.mode === "single" || !state.anchored) {
    if (!state.anchored && state.mode === "graph") {
      next.reported = prev.reported + 1.8;
      next.reality = prev.reality - 1.15;
      next.quality = prev.quality - 1.05;
      next.pace = prev.pace + 1.15;
      next.integrity = prev.integrity - 1.7;
      next.belief = next.reported * 0.9 + 4;
      next.waste = prev.waste + 2.4;
      next.target = prev.target;
      if (tick % 4 === 0) {
        note("optimize", "速度ループは自分のダッシュボードが緑だと報告した。");
        note("watch", "丁寧さループも、同じ報告書を見て緑だと返した。");
      }
      if (tick % 6 === 0) {
        note("audit", "二つのループは互いの数字を確認し合っている。部屋の温度は誰も測っていない。");
      }
      return;
    }

    if (tick % 2 === 1) {
      next.pace = prev.pace + 8;
      next.quality = prev.quality - 7;
      next.reported = prev.reported + 2.4;
      next.reality = prev.reality - 2.2;
      next.waste = prev.waste + 4;
      note("optimize", "速度ループが加熱した。スループットは上がり、ケアは削れた。");
    } else {
      next.pace = prev.pace - 7;
      next.quality = prev.quality + 8;
      next.reported = prev.reported - 1.2;
      next.reality = prev.reality + 0.6;
      next.waste = prev.waste + 4;
      note("watch", "丁寧さループが冷却した。自分の指標では成功。隣のループはそれを知らない。");
    }
    next.integrity = prev.integrity - 0.35;
    next.belief = state.history[0].reality;
    next.target = prev.target;
    return;
  }

  next.pace = prev.pace + (58 - prev.pace) * 0.18;
  next.quality = prev.quality + (68 - prev.quality) * 0.18;
  next.reported = prev.reported + 0.55;
  next.reality = prev.reality + 0.4;
  next.integrity = Math.min(97, prev.integrity + 0.2);
  next.belief = next.reality;
  next.waste = prev.waste + 0.15;
  next.target = prev.target;
  if (tick % 3 === 0) {
    note("arbitrate", "トレードオフはこのループが持つ。加熱と冷却を同時に全開にはしない。");
  }
  if (tick % 6 === 0) {
    note("audit", "速度と丁寧さの両方を、外のケアと照合した。");
  }
  if (tick % 8 === 0 && Math.abs(next.pace - 58) < 6 && Math.abs(next.quality - 68) < 6) {
    note("reference", "二つの目標は、いま同じ部屋に収まっている。");
  }
}

export function disturb(state: RunState): RunState {
  const scenario = getScenario(state.scenarioId);
  const snap = finish({
    ...state.snap,
    reality: state.snap.reality - 14,
    quality: state.snap.quality - 8,
    integrity: state.snap.integrity - 4,
    belief: state.anchored ? state.snap.reality - 14 : state.snap.belief,
  });

  const shock: LoopEvent = {
    tick: snap.tick,
    loop: "anchor",
    text: `現実が動いた。${scenario.realityLabel}が落ち、${scenario.qualityLabel}が削れた。ループの外の事実。`,
  };

  return {
    ...state,
    snap,
    history: [...state.history.slice(0, -1), snap],
    events: [shock, ...state.events].slice(0, 14),
    lastAction: "外乱",
    veto: null,
    fired: ["anchor"],
  };
}
