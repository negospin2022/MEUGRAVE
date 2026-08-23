import { describe, expect, it } from "vitest";
import { calculateUnlockedLevels, EMPTY_LEVEL_AVERAGES } from "@shared/vocalProgress";
import { getNavigationBlocker, getSyncableAttempts } from "./vocal";

describe("progressão por nível", () => {
  it("libera o Profissional apenas com IES e IRL iguais ou superiores a 8,5 no Médio", () => {
    const belowTarget = structuredClone(EMPTY_LEVEL_AVERAGES);
    belowTarget.medio = { ies: 8.6, irl: 8.4, samples: 3 };
    expect(calculateUnlockedLevels(belowTarget)).not.toContain("profissional");
    const ready = structuredClone(EMPTY_LEVEL_AVERAGES);
    ready.medio = { ies: 8.5, irl: 8.5, samples: 3 };
    expect(calculateUnlockedLevels(ready)).toContain("profissional");
  });
});

describe("guardas de navegação", () => {
  it("bloqueia a navegação durante captura e alerta exercício incompleto", () => {
    expect(getNavigationBlocker("recording", true, true)).toBe("capture_active");
    expect(getNavigationBlocker("idle", true, false)).toBe("exercise_incomplete");
    expect(getNavigationBlocker("idle", true, true)).toBeNull();
  });
});

describe("fila de sincronização", () => {
  it("seleciona somente gravações que ainda não foram confirmadas", () => {
    const pending = getSyncableAttempts([{ syncState: "local", id: "a" }, { syncState: "confirmed", id: "b" }, { syncState: "failed", id: "c" }]);
    expect(pending.map((item) => item.id)).toEqual(["a", "c"]);
  });
});
