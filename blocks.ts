import { block2Routine } from "@/data/block2Catalog";
import { weeklyRoutine, type VocalExercise } from "@/data/routine";

export type TrainingBlockId = "bloco-1" | "bloco-2";

export const trainingBlockLabels: Record<TrainingBlockId, string> = {
  "bloco-1": "BLOCO 01 · ROTINA SEMANAL",
  "bloco-2": "BLOCO 02 · LIBERAÇÃO DOS GRAVES",
};

export function getTrainingBlockLabel(blockId: TrainingBlockId) {
  return trainingBlockLabels[blockId];
}

export function getTrainingBlockRoutine(blockId: TrainingBlockId): VocalExercise[] {
  return blockId === "bloco-1" ? weeklyRoutine : block2Routine;
}

export function getTrainingBlockStart(blockId: TrainingBlockId) {
  const first = getTrainingBlockRoutine(blockId)[0];
  if (!first) throw new Error(`O catálogo ${blockId} está vazio.`);
  return { dayId: first.dayId, levelId: first.levelId, exerciseId: first.id, part: "A" as const };
}
