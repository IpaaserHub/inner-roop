export type Mode = "single" | "graph";

export type Dynamics = "goodhart" | "conflict";

export type LoopId =
  | "optimize"
  | "watch"
  | "arbitrate"
  | "reference"
  | "audit"
  | "anchor"
  | "system";

export type Snapshot = {
  tick: number;
  reported: number;
  reality: number;
  belief: number;
  quality: number;
  pace: number;
  integrity: number;
  target: number;
  waste: number;
};

export type LoopEvent = {
  tick: number;
  loop: LoopId;
  text: string;
};

export type Scenario = {
  id: string;
  name: string;
  kicker: string;
  summary: string;
  dynamics: Dynamics;
  reportedLabel: string;
  realityLabel: string;
  qualityLabel: string;
  paceLabel: string;
  initial: {
    reported: number;
    reality: number;
    quality: number;
    pace: number;
    integrity: number;
    target: number;
  };
};

export type RunState = {
  scenarioId: string;
  mode: Mode;
  anchored: boolean;
  snap: Snapshot;
  history: Snapshot[];
  events: LoopEvent[];
  lastAction: string;
  veto: string | null;
  fired: LoopId[];
};
