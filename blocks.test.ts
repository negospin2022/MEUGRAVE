import { describe, expect, it } from "vitest";
import { getTrainingBlockLabel, getTrainingBlockRoutine, getTrainingBlockStart } from "./blocks";

describe("rótulos dos blocos", () => {
  it("mantém rótulos distintos ao alternar entre as duas áreas de treino", () => {
    expect(getTrainingBlockLabel("bloco-1")).toBe("BLOCO 01 · ROTINA SEMANAL");
    expect(getTrainingBlockLabel("bloco-2")).toBe("BLOCO 02 · LIBERAÇÃO DOS GRAVES");
  });

  it("carrega a rotina correspondente e reinicia a seleção com segurança ao trocar de bloco", () => {
    const firstBlock = getTrainingBlockStart("bloco-1");
    const secondBlock = getTrainingBlockStart("bloco-2");
    expect(getTrainingBlockRoutine("bloco-1")).toHaveLength(72);
    expect(getTrainingBlockRoutine("bloco-2")).toHaveLength(120);
    expect(firstBlock).toMatchObject({ dayId: "segunda", levelId: "iniciante", exerciseId: 1, part: "A" });
    expect(secondBlock).toMatchObject({ dayId: "bocejo", levelId: "iniciante", exerciseId: 1001, part: "A" });
  });
});
