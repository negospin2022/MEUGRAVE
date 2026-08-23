import { block2Exercises } from "./block2";
import type { VocalExercise } from "./routine";

export const block2Routine: VocalExercise[] = block2Exercises.map((exercise) => ({
  ...exercise,
  dayId: exercise.frontId,
  dayName: exercise.frontName,
  dayFocus: exercise.frontGroup,
}));

export const block2Fronts = Array.from(new Map(block2Routine.map((exercise) => [exercise.frontId!, {
  id: exercise.frontId!,
  code: exercise.frontCode ?? "",
  label: exercise.frontName ?? "",
  group: exercise.frontGroup ?? "",
}])).values());

export const voiceThunderLibrary = [
  { category: "Firmeza e autoridade", prompts: ["Você tem duas escolhas. Só duas.", "A decisão já foi tomada.", "Não é uma sugestão. É um aviso.", "O tempo acabou. Agora é ação.", "Cada palavra tem consequência."] },
  { category: "Mistério e suspense", prompts: ["Nem tudo é o que parece…", "Ele sabia… mas não contou.", "Há segredos que não suportam a luz.", "O silêncio… foi a resposta mais alta.", "Eles estavam lá… mesmo sem serem vistos."] },
  { category: "Desilusão e frieza", prompts: ["Eu esperei demais por quase nada.", "Nada me surpreende mais.", "O que restou… não me importa.", "Você já não tem mais poder sobre mim.", "O fim chegou… e foi silencioso."] },
  { category: "Sombra e poder", prompts: ["Eu comando tudo… mesmo calado.", "Eles obedecem… sem saber por quê.", "Quando a noite cai, eu desperto.", "A escuridão… me protege.", "O poder está no controle da palavra."] },
  { category: "Calma tensa", prompts: ["Não grite. Eu escuto até o silêncio.", "Respire. Pense. Depois aja.", "As palavras pesam. Cuidado com as suas.", "Tudo está sob controle. Por enquanto.", "Não se precipite. Isso tem um preço."] },
] as const;

export const massageGuide = {
  title: "Massagem Laríngea com Emissão Suave",
  instructions: "Massageie suavemente os lados do pescoço, emita sons confortáveis como “mmm” e “ahh”, respire entre os ciclos e relaxe a mandíbula. Interrompa em caso de dor ou desconforto.",
  notice: "Prática guiada: o aplicativo registra apenas a auto-observação e não atribui pontuação automática enquanto a rotina estruturada não for definida.",
};
