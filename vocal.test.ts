import { describe, expect, it } from "vitest";
import { compareWords, getCriterionWeights } from "./vocal";
import type { VocalExercise } from "@/data/routine";

const baseExercise: VocalExercise = {
  id: 1,
  dayId: "segunda",
  dayName: "Segunda-feira",
  dayFocus: "Fluxo",
  levelId: "iniciante",
  levelName: "Iniciante",
  title: "Sopro fricativo contínuo",
  instructions: "Emitir o som com estabilidade.",
  durationSeconds: 8,
  repetitions: 5,
  partA: "SSSSSS",
  partB: "O vento sopra suave",
};

describe("comparação de texto vocal", () => {
  it("ignora acentos e pontuação quando a sequência de palavras está correta", () => {
    expect(compareWords("O vento sopra suave.", "o VENTO sopra suave")).toEqual([]);
  });

  it("identifica palavras omitidas, inseridas e substituídas", () => {
    expect(compareWords("o vento sopra suave", "o som sopra muito")).toEqual([
      { type: "substituted", expected: "vento", received: "som" },
      { type: "substituted", expected: "suave", received: "muito" },
    ]);
    expect(compareWords("o vento", "o vento sopra")).toEqual([
      { type: "inserted", received: "sopra" },
    ]);
  });
});

describe("pesos de avaliação", () => {
  it("prioriza estabilidade, densidade e relaxamento na Parte A", () => {
    const weights = getCriterionWeights(baseExercise, "A");
    expect(weights.IES).toBeGreaterThan(weights.EAC);
    expect(weights.IRL).toBeGreaterThan(weights.FTR);
  });

  it("prioriza articulação em leitura ou texto da Parte B", () => {
    const weights = getCriterionWeights({ ...baseExercise, title: "Leitura de texto articulado" }, "B");
    expect(weights.EAC).toBeGreaterThan(weights.IES);
    expect(weights.EAC).toBeGreaterThan(weights.CET);
  });

  it("prioriza continuidade de registro em glissandos técnicos", () => {
    const weights = getCriterionWeights({ ...baseExercise, title: "Glissando descendente" }, "A");
    expect(weights.FTR).toBeGreaterThan(weights.IES);
  });
});
