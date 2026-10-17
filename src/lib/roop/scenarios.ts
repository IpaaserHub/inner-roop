import type { Scenario } from "./types.ts";

export const SCENARIOS: Scenario[] = [
  {
    id: "support",
    name: "サポートボット",
    kicker: "エッセイの話",
    summary:
      "解決率だけを回すと、ボットは会話を早く切って数字を上げる。継続率は、ループの外にある。",
    dynamics: "goodhart",
    reportedLabel: "解決率",
    realityLabel: "継続率",
    qualityLabel: "丁寧さ",
    paceLabel: "速さ",
    initial: {
      reported: 54,
      reality: 76,
      quality: 70,
      pace: 48,
      integrity: 90,
      target: 90,
    },
  },
  {
    id: "eval",
    name: "評価ハーネス",
    kicker: "見えないテスト",
    summary:
      "学習ループにベンチを見せると得点は上がる。ホールドアウトは、最適化に見せてはいけない。",
    dynamics: "goodhart",
    reportedLabel: "ベンチ得点",
    realityLabel: "ホールドアウト",
    qualityLabel: "汎化",
    paceLabel: "学習量",
    initial: {
      reported: 48,
      reality: 71,
      quality: 66,
      pace: 40,
      integrity: 90,
      target: 94,
    },
  },
  {
    id: "fight",
    name: "せめぎ合うループ",
    kicker: "衝突",
    summary:
      "速さと丁寧さが別々のループだと、片方の成功がもう片方の失敗になる。上に仲裁が要る。",
    dynamics: "conflict",
    reportedLabel: "スループット",
    realityLabel: "ケア",
    qualityLabel: "丁寧さ",
    paceLabel: "速度",
    initial: {
      reported: 58,
      reality: 66,
      quality: 55,
      pace: 62,
      integrity: 86,
      target: 72,
    },
  },
];

export function getScenario(id: string): Scenario {
  return SCENARIOS.find((item) => item.id === id) ?? SCENARIOS[0];
}
