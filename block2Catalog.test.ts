import { describe, expect, it } from "vitest";
import { block2Fronts, block2Routine } from "./block2Catalog";
import { block2SourceMetadata } from "./block2SourceMetadata";

describe("catálogo do Bloco 2", () => {
  it("mantém as dez frentes estruturadas separadas do bloco semanal", () => {
    expect(block2Fronts).toHaveLength(10);
    expect(block2Routine).toHaveLength(120);
    expect(new Set(block2Routine.map((exercise) => exercise.id)).size).toBe(120);
    expect(block2Routine.every((exercise) => exercise.blockId === "bloco-2")).toBe(true);
    expect(block2Routine.every((exercise) => exercise.id > 1000)).toBe(true);
  });

  it("mantém quatro níveis e três exercícios por nível em cada frente", () => {
    for (const front of block2Fronts) {
      const exercises = block2Routine.filter((exercise) => exercise.frontId === front.id);
      expect(exercises).toHaveLength(12);
      for (const level of ["iniciante", "medio", "profissional", "expert"]) {
        expect(exercises.filter((exercise) => exercise.levelId === level)).toHaveLength(3);
      }
    }
  });

  it("preserva duração ou repetição sempre que a instrução estruturada fornece esse dado", () => {
    const exercisesWithOperationalCue = block2Routine.filter((exercise) => exercise.sourceMetadataEvidence !== null);
    expect(exercisesWithOperationalCue.length).toBeGreaterThan(10);
    expect(exercisesWithOperationalCue.every((exercise) => exercise.durationSeconds !== null || exercise.repetitions !== null)).toBe(true);
  });

  it("confere o catálogo contra o fixture extraído diretamente do documento-fonte", () => {
    expect(block2SourceMetadata.length).toBeGreaterThan(10);
    for (const expected of block2SourceMetadata) {
      const exercise = block2Routine.find((item) => item.id === expected.id);
      expect(exercise, expected.title).toBeDefined();
      expect(exercise?.durationSeconds).toBe(expected.durationSeconds);
      expect(exercise?.repetitions).toBe(expected.repetitions);
      expect(exercise?.sourceMetadataEvidence).toBe(expected.sourceEvidence);
    }
  });
});
