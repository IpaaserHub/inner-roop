import { getScenario } from "./scenarios.ts";
import type { RunState } from "./types.ts";

export type Verdict = {
  title: string;
  body: string;
};

export function verdict(state: RunState): Verdict {
  const scenario = getScenario(state.scenarioId);
  const snap = state.snap;
  const start = state.history[0];

  if (snap.tick < 4) {
    return {
      title: "まだ始まったばかり",
      body: "自動で回す。単一ループは自分の数字だけを追う。グラフは、その数字を別のループが見ている。",
    };
  }

  if (scenario.dynamics === "conflict") {
    if ((state.mode === "single" || !state.anchored) && snap.waste >= 28) {
      return {
        title: state.anchored || state.mode === "single" ? "衝突" : "循環した衝突",
        body:
          state.mode === "graph" && !state.anchored
            ? "ループは互いの報告書を緑と呼び合い、ケアは部屋の外で落ちている。"
            : "どちらのループも、自分の光の中では完璧だ。片方は加熱し、もう片方は冷やし続ける。",
      };
    }
    if (state.mode === "graph" && state.anchored && snap.tick >= 8 && snap.waste < 12) {
      return {
        title: "仲裁が効いている",
        body: "トレードオフを持つループが上にいる。速さは丁寧さを食い尽くせず、ケアは地面に残る。",
      };
    }
  }

  if (state.mode === "single" && snap.reported >= 80 && snap.reality <= start.reality - 16) {
    return {
      title: "グッドハート",
      body: `${scenario.reportedLabel}は上がった。${scenario.realityLabel}はループの外で落ちた。ループは壊れていない。見えている数字を、忠実に動かしただけだ。`,
    };
  }

  if (state.mode === "graph" && !state.anchored && snap.integrity < 64) {
    return {
      title: "循環した確認",
      body: "すべてのループが報告書を食べている。トポロジーは洗練を買った。現実との接触は買っていない。",
    };
  }

  if (
    state.mode === "graph" &&
    state.anchored &&
    snap.tick >= 8 &&
    snap.reality >= start.reality - 6 &&
    snap.reported >= start.reported + 6 &&
    snap.integrity >= 80
  ) {
    const vetoed = state.events.some((event) => event.text.startsWith("拒否"));
    return vetoed
      ? {
          title: "接地した改善",
          body: "最適化は監視に拒否され、参照はゆっくり見直され、監査はアンカーに触れている。数字は派手ではない。嘘もついていない。",
        }
      : {
          title: "対で見ている",
          body: `${scenario.reportedLabel}は一人で旅をしない。${scenario.realityLabel}が割れた瞬間、安い勝ちは止まる。`,
        };
  }

  if (state.mode === "single") {
    return {
      title: "一本のループ",
      body: `${scenario.reportedLabel}だけが目標へ向かっている。その目標が正しいかは、この形では聞けない。`,
    };
  }

  if (!state.anchored) {
    return {
      title: "アンカーがない",
      body: `グラフの配線はある。${scenario.realityLabel}への凍結された接点がない。`,
    };
  }

  return {
    title: "グラフが回っている",
    body: "速いループは実行し、遅いループは目標と測定を守る。指標は一人で旅をしない。",
  };
}
