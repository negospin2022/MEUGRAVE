import type { VocalExercise } from "@/data/routine";

export type PartCode = "A" | "B";

export type SyncState = "local" | "pending" | "syncing" | "confirmed" | "failed";

export type SignalFeatures = {
  durationSeconds: number;
  averageAmplitude: number;
  stability: number;
  lowFrequencyRatio: number;
  samples: number;
};

export type VocalMetricName = "IES" | "CET" | "IRL" | "EAC" | "FTR";

export type MetricReading = {
  value: number | null;
  source: "estimativa_local" | "analisado_ia" | "aguardando_ia";
};

export type WordDifference = {
  type: "omitted" | "inserted" | "substituted";
  expected?: string;
  received?: string;
};

export type PartAnalysis = {
  score: number;
  reliability: number;
  metrics: Record<VocalMetricName, MetricReading>;
  feedback: string;
  wordDifferences: WordDifference[];
  f0Average: number | null;
};

export type LocalAttempt = {
  id: string;
  sessionId: string;
  part: PartCode;
  completedAt: number;
  durationSeconds: number;
  transcript?: string | null;
  analysis: PartAnalysis;
  syncState: SyncState;
};

const clamp = (value: number, min = 0, max = 10) => Math.min(max, Math.max(min, value));

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function compareWords(expected: string, received: string): WordDifference[] {
  const target = normalize(expected).split(" ").filter(Boolean);
  const actual = normalize(received).split(" ").filter(Boolean);
  const differences: WordDifference[] = [];
  const length = Math.max(target.length, actual.length);

  for (let index = 0; index < length; index += 1) {
    const expectedWord = target[index];
    const receivedWord = actual[index];
    if (!expectedWord && receivedWord) differences.push({ type: "inserted", received: receivedWord });
    else if (expectedWord && !receivedWord) differences.push({ type: "omitted", expected: expectedWord });
    else if (expectedWord !== receivedWord) {
      differences.push({ type: "substituted", expected: expectedWord, received: receivedWord });
    }
  }
  return differences;
}

export function getCriterionWeights(exercise: VocalExercise, part: PartCode) {
  const title = normalize(exercise.title);
  const front = exercise.frontId ?? "";
  const isTransition = /glissando|curva|descendente|subindo|descendo/.test(title);
  const isArticulation = /leitura|texto|trava|consoante|articulacao|monologo|improvisacao/.test(title);

  if (front === "glissando" || front === "escala-descendente" || front === "narracao-grave") return part === "A" ? { IES: 24, CET: 18, IRL: 18, EAC: 8, FTR: 32 } : { IES: 18, CET: 20, IRL: 18, EAC: 18, FTR: 26 };
  if (front === "leitura-encorpada" || front === "palavras-graves") return { IES: 16, CET: 24, IRL: 16, EAC: 28, FTR: 16 };
  if (front === "sussurro-grave" || front === "vibracao-labial") return { IES: 32, CET: 18, IRL: 24, EAC: 12, FTR: 14 };
  if (front === "bocejo" || front === "espreguicamento") return { IES: 22, CET: 18, IRL: 34, EAC: 8, FTR: 18 };
  if (front === "u-o-peito") return { IES: 22, CET: 34, IRL: 22, EAC: 8, FTR: 14 };

  if (part === "A" && isTransition) return { IES: 22, CET: 16, IRL: 18, EAC: 8, FTR: 36 };
  if (part === "A") return { IES: 34, CET: 24, IRL: 26, EAC: 6, FTR: 10 };
  if (isArticulation) return { IES: 18, CET: 17, IRL: 20, EAC: 32, FTR: 13 };
  return { IES: 22, CET: 22, IRL: 22, EAC: 20, FTR: 14 };
}

export function analyseLocalCapture(
  exercise: VocalExercise,
  part: PartCode,
  features: SignalFeatures,
  transcript = ""
): PartAnalysis {
  const transitionExercise = /glissando|curva|descendente|subindo|descendo/i.test(exercise.title);
  const spokenPart = part === "B";
  const wordDifferences = spokenPart && transcript ? compareWords(exercise.partB, transcript) : [];
  const totalExpectedWords = normalize(exercise.partB).split(" ").filter(Boolean).length || 1;
  const articulationPrecision = transcript
    ? clamp(10 - (wordDifferences.length / totalExpectedWords) * 10)
    : null;

  const metrics: Record<VocalMetricName, MetricReading> = {
    IES: { value: Math.round(clamp(2.2 + features.stability * 7.6) * 10) / 10, source: "estimativa_local" },
    CET: {
      value: Math.round(clamp(1.5 + features.lowFrequencyRatio * 13.5) * 10) / 10,
      source: "estimativa_local",
    },
    IRL: {
      value: Math.round(clamp(3.4 + features.stability * 4.8 + features.averageAmplitude * 2.2) * 10) / 10,
      source: "estimativa_local",
    },
    EAC: {
      value: articulationPrecision === null ? null : Math.round(articulationPrecision * 10) / 10,
      source: articulationPrecision === null ? "aguardando_ia" : "estimativa_local",
    },
    FTR: {
      value: transitionExercise
        ? Math.round(clamp(2.6 + features.stability * 7.0) * 10) / 10
        : null,
      source: transitionExercise ? "estimativa_local" : "aguardando_ia",
    },
  };

  const weights = getCriterionWeights(exercise, part);
  const availableMetrics = (Object.entries(metrics) as [VocalMetricName, MetricReading][]).filter(
    ([, metric]) => metric.value !== null
  );
  const availableWeight = availableMetrics.reduce((sum, [name]) => sum + weights[name], 0) || 1;
  const score = availableMetrics.reduce(
    (sum, [name, metric]) => sum + (metric.value ?? 0) * (weights[name] / availableWeight),
    0
  );
  const reliability = Math.round(
    clamp(25 + features.samples * 0.7 + features.averageAmplitude * 28 + features.durationSeconds * 1.2, 20, 96)
  );
  const lowest = availableMetrics.sort(([, a], [, b]) => (a.value ?? 0) - (b.value ?? 0))[0]?.[0];
  const partLabel = part === "A" ? "na execução técnica" : "na aplicação vocal";
  const feedbackByMetric: Record<VocalMetricName, string> = {
    IES: `O sinal indica variação de fluxo ${partLabel}. Procure sustentar a saída de ar de forma mais regular.`,
    CET: "A concentração de energia grave pode ganhar mais consistência. Mantenha a emissão confortável, sem pressionar a garganta.",
    IRL: "O sinal apresentou oscilação de estabilidade. Faça uma nova tentativa com volume confortável e sem esforço percebido.",
    EAC: "A clareza da fala ficará mais precisa com análise online da transcrição. Articule sem acelerar as consoantes.",
    FTR: "A transição pode ficar mais contínua. Execute a curva de som sem saltos bruscos e sem forçar o limite vocal.",
  };
  const metricOrder: VocalMetricName[] = ["IES", "CET", "IRL", "EAC", "FTR"];
  const contextualName = exercise.criteria?.[metricOrder.indexOf(lowest ?? "IES")];

  return {
    score: Math.round(score * 10) / 10,
    reliability,
    metrics,
    feedback: contextualName ? `${contextualName}: ${feedbackByMetric[lowest ?? "IES"]}` : feedbackByMetric[lowest ?? "IES"],
    wordDifferences,
    f0Average: null,
  };
}

export function createAttempt(sessionId: string, part: PartCode, durationSeconds: number, analysis: PartAnalysis): LocalAttempt {
  return {
    id: crypto.randomUUID(),
    sessionId,
    part,
    completedAt: Date.now(),
    durationSeconds,
    analysis,
    syncState: navigator.onLine ? "pending" : "local",
  };
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function getNavigationBlocker(status: "idle" | "requesting" | "recording" | "error", hasPartA: boolean, hasPartB: boolean) {
  if (status === "recording" || status === "requesting") return "capture_active" as const;
  if (!hasPartA || !hasPartB) return "exercise_incomplete" as const;
  return null;
}

export function getSyncableAttempts<T extends { syncState: SyncState }>(attempts: T[]) {
  return attempts.filter((attempt) => attempt.syncState !== "confirmed");
}
