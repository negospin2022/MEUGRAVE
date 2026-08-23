import { AudioCapturePanel } from "@/components/AudioCapturePanel";
import { Button } from "@/components/ui/button";
import { levels, weeklyRoutine, weekDays, type VocalExercise } from "@/data/routine";
import { block2Fronts, block2Routine, massageGuide, voiceThunderLibrary } from "@/data/block2Catalog";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { analyseLocalCapture, createAttempt, getSyncableAttempts, type LocalAttempt, type PartCode, type VocalMetricName } from "@/lib/vocal";
import { audioAsBase64, readLocalAudio, removeLocalAudio, saveLocalAudio } from "@/lib/localAudio";
import { cn } from "@/lib/utils";
import { getTrainingBlockLabel, getTrainingBlockRoutine, getTrainingBlockStart } from "@/lib/blocks";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BarChart3,
  ChevronRight,
  CircleUserRound,
  Cloud,
  CloudOff,
  Compass,
  Gauge,
  Info,
  LockKeyhole,
  Menu,
  Mic2,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Volume2,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

type AppView = "inicio" | "treino" | "evolucao" | "perfil";
type SessionMap = Record<number, Partial<Record<PartCode, LocalAttempt>>>;
type BlockId = "bloco-1" | "bloco-2";

const metricNames: Record<VocalMetricName, string> = {
  IES: "Fluxo",
  CET: "Densidade",
  IRL: "Relaxamento",
  EAC: "Articulação",
  FTR: "Elasticidade",
};

function storageKey() {
  return "meu-grave:sessao-atual:v1";
}

function loadAttempts(): SessionMap {
  try {
    return JSON.parse(localStorage.getItem(storageKey()) ?? "{}");
  } catch {
    return {};
  }
}

function ExercisePicker({
  selectedSection,
  selectedLevel,
  selectedId,
  onSectionChange,
  onLevelChange,
  onExerciseChange,
  disabled,
  unlockedLevels,
  routine,
  sections,
  sectionLabel,
}: {
  selectedSection: string;
  selectedLevel: string;
  selectedId: number;
  onSectionChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onExerciseChange: (value: number) => void;
  disabled?: boolean;
  unlockedLevels: string[];
  routine: VocalExercise[];
  sections: { id: string; label: string; short: string }[];
  sectionLabel: string;
}) {
  const exercises = routine.filter((exercise) => exercise.dayId === selectedSection && exercise.levelId === selectedLevel);
  return (
    <aside className="hidden w-[19.5rem] shrink-0 xl:block">
      <div className="sticky top-6 space-y-5">
        <section className="glass-card rounded-[1.6rem] p-4">
          <p className="text-[0.67rem] font-bold tracking-[0.18em] text-[#c89967]">{sectionLabel.toUpperCase()}</p>
          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)} disabled={disabled}
                className={cn("rounded-xl px-1 py-2.5 text-center transition-colors", selectedSection === section.id ? "bg-[#d48655] text-[#17121a]" : "bg-white/[.035] text-white/52 hover:bg-white/[.08] hover:text-white")}
              >
                <span className="block truncate text-[0.64rem] font-bold tracking-wide">{section.short}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-1.5">
            {levels.map((level, index) => {
              const unlocked = unlockedLevels.includes(level.id);
              return <button key={level.id} onClick={() => onLevelChange(level.id)} disabled={disabled || !unlocked} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40", selectedLevel === level.id ? "bg-[#f4d7b9]/10 text-[#f7dfc8]" : "text-white/48 hover:bg-white/[.045] hover:text-white/85")}>
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[0.67rem] font-bold", selectedLevel === level.id ? "bg-[#d48655] text-[#15111a]" : "bg-white/[.06] text-white/45")}>{index + 1}</span>
                <span className="min-w-0"><span className="block text-sm font-semibold">{level.label} {!unlocked ? "· bloqueado" : ""}</span><span className="block text-[0.66rem] text-white/40">{level.description}</span></span>
              </button>;
            })}
          </div>
        </section>
        <section className="glass-card rounded-[1.6rem] p-3">
          <div className="flex items-center justify-between px-2 pb-3"><span className="text-xs font-bold tracking-[0.12em] text-white/65">EXERCÍCIOS</span><span className="text-xs text-white/35">{exercises.length} etapas</span></div>
          <div className="space-y-1.5">
            {exercises.map((exercise) => (
              <button key={exercise.id} onClick={() => onExerciseChange(exercise.id)} disabled={disabled} className={cn("w-full rounded-xl px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40", selectedId === exercise.id ? "bg-[#21334b] ring-1 ring-[#d48655]/40" : "hover:bg-white/[.045]")}>
                <span className={cn("text-xs font-semibold", selectedId === exercise.id ? "text-[#eeb887]" : "text-white/38")}>EXERCÍCIO {exercise.id.toString().padStart(2, "0")}</span>
                <span className="mt-1 block line-clamp-2 text-sm leading-snug text-white/80">{exercise.title}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

function PartResult({ attempt, part, criteria }: { attempt?: LocalAttempt; part: PartCode; criteria?: [string, string, string, string, string] }) {
  if (!attempt) return null;
  const entries = Object.entries(attempt.analysis.metrics) as [VocalMetricName, LocalAttempt["analysis"]["metrics"][VocalMetricName]][];
  return (
    <section className="glass-card mt-5 rounded-[1.6rem] p-5" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[0.67rem] font-bold tracking-[0.18em] text-[#7bd6a6]">RESULTADO ATUAL · PARTE {part}</p><h3 className="mt-1 font-display text-xl font-semibold text-white">Leitura inicial do sinal</h3></div>
        <div className="rounded-2xl bg-[#78cf9f]/10 px-4 py-2 text-right"><span className="text-2xl font-bold text-[#b6edcb]">{attempt.analysis.score.toFixed(1)}</span><span className="ml-1 text-xs text-[#b6edcb]/70">/ 10</span></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {entries.map(([metric, reading], index) => (
          <div className="rounded-xl border border-white/[.07] bg-[#071225]/55 px-3 py-3" key={metric}>
            <p className="text-[0.62rem] font-bold tracking-[0.12em] text-white/42">{metric}</p>
            <p className="mt-1 text-lg font-semibold text-white">{reading.value === null ? "—" : reading.value.toFixed(1)}</p>
            <p className="mt-0.5 text-[0.62rem] text-white/35">{reading.value === null ? "Aguardar IA" : criteria?.[index] ?? metricNames[metric]}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-3 rounded-xl border border-[#d48655]/15 bg-[#d48655]/[.06] p-3.5"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#eab07d]" /><p className="text-sm leading-relaxed text-white/65">{attempt.analysis.feedback} <span className="text-white/35">Confiabilidade do sinal: {attempt.analysis.reliability}%.</span></p></div>
      {part === "B" && (attempt.transcript || attempt.analysis.wordDifferences.length > 0) ? <div className="mt-4 rounded-xl border border-white/[.07] bg-[#071225]/55 p-3.5"><p className="text-[0.67rem] font-bold tracking-[.14em] text-[#e7b27f]">TEXTO RECONHECIDO E AJUSTES</p>{attempt.transcript ? <p className="mt-2 text-sm leading-relaxed text-white/65">“{attempt.transcript}”</p> : null}{attempt.analysis.wordDifferences.length ? <div className="mt-3 flex flex-wrap gap-2">{attempt.analysis.wordDifferences.map((difference, index) => <span key={`${difference.type}-${index}`} className={cn("rounded-lg px-2.5 py-1.5 text-xs", difference.type === "omitted" ? "bg-[#b84757]/16 text-[#ffb8c0]" : difference.type === "inserted" ? "bg-[#4c83b7]/16 text-[#b8d9f8]" : "bg-[#d48655]/15 text-[#f3c493]")}>{difference.type === "omitted" ? `Omitida: ${difference.expected}` : difference.type === "inserted" ? `Acrescentada: ${difference.received}` : `Troca: ${difference.expected} → ${difference.received}`}</span>)}</div> : <p className="mt-3 text-xs text-[#a6e3c3]">Nenhuma troca de palavra identificada na transcrição disponível.</p>}</div> : null}
    </section>
  );
}

function EvolutionPanel({ attempts, weekly }: { attempts: SessionMap; weekly?: { metrics: { ies: number; cet: number; irl: number; eac: number; ftr: number; samples: number }; f0Timeline: { date: string; f0: number }[] } }) {
  const lastAttempt = Object.values(attempts).flatMap((record) => Object.values(record)).filter(Boolean).sort((a, b) => (b?.completedAt ?? 0) - (a?.completedAt ?? 0))[0];
  const data = weekly?.metrics.samples
    ? [{ metric: "Fluxo", value: weekly.metrics.ies }, { metric: "Densidade", value: weekly.metrics.cet }, { metric: "Relaxamento", value: weekly.metrics.irl }, { metric: "Articulação", value: weekly.metrics.eac }, { metric: "Elasticidade", value: weekly.metrics.ftr }]
    : lastAttempt
      ? (Object.entries(lastAttempt.analysis.metrics) as [VocalMetricName, LocalAttempt["analysis"]["metrics"][VocalMetricName]][]).map(([name, reading]) => ({ metric: metricNames[name], value: reading.value ?? 0 }))
      : [];
  return (
    <section className="space-y-5">
      <div className="glass-card rounded-[1.8rem] p-6 sm:p-8"><p className="text-[0.68rem] font-bold tracking-[0.18em] text-[#c89967]">EVOLUÇÃO SEMANAL</p><h2 className="mt-2 font-display text-3xl font-semibold text-white">Taxa de Encorpamento Vocal</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-white/52">O gráfico passa a refletir a última leitura disponível de cada critério. O histórico comparativo será liberado quando as sessões forem sincronizadas em um perfil online.</p></div>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <section className="glass-card min-h-[25rem] rounded-[1.8rem] p-5">
          {data.length ? <ResponsiveContainer width="100%" height={360}><RadarChart data={data} outerRadius="70%"><PolarGrid stroke="#385371" /><PolarAngleAxis dataKey="metric" tick={{ fill: "#d9e5f5", fontSize: 12 }} /><Radar dataKey="value" stroke="#e3a370" fill="#b84757" fillOpacity={0.35} /></RadarChart></ResponsiveContainer> : <div className="flex h-[22rem] flex-col items-center justify-center text-center"><Compass className="h-10 w-10 text-[#d48655]" /><h3 className="mt-4 font-display text-xl text-white">Seu mapa vocal começa aqui</h3><p className="mt-2 max-w-xs text-sm leading-relaxed text-white/45">Conclua uma captura para ver a leitura atual dos cinco critérios.</p></div>}
        </section>
        <div className="space-y-5"><section className="glass-card rounded-[1.6rem] p-5"><div className="flex items-center gap-2 text-[#e7b27f]"><Gauge className="h-4 w-4" /><span className="text-xs font-bold tracking-[0.14em]">F0 MÉDIA · 7 DIAS</span></div><p className="mt-3 font-display text-3xl text-white">{weekly?.f0Timeline.at(-1)?.f0 ? `${weekly.f0Timeline.at(-1)?.f0} Hz` : lastAttempt?.analysis.f0Average ? `${lastAttempt.analysis.f0Average.toFixed(0)} Hz` : "Aguardando"}</p>{weekly?.f0Timeline.length ? <ResponsiveContainer width="100%" height={125}><LineChart data={weekly.f0Timeline}><XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} tick={{ fill: "#8799b0", fontSize: 10 }} /><YAxis hide domain={["dataMin - 10", "dataMax + 10"]} /><Tooltip contentStyle={{ background: "#0e1d34", border: "1px solid #294768", borderRadius: 10 }} labelFormatter={(value) => `Data: ${value}`} formatter={(value) => [`${value} Hz`, "F0"]} /><Line type="monotone" dataKey="f0" stroke="#d48655" strokeWidth={2} dot={{ r: 3, fill: "#d48655" }} /></LineChart></ResponsiveContainer> : <p className="mt-1 text-sm text-white/42">A frequência fundamental será mostrada após análise online compatível.</p>}</section><section className="glass-card rounded-[1.6rem] p-5"><div className="flex items-center gap-2 text-[#e7b27f]"><LockKeyhole className="h-4 w-4" /><span className="text-xs font-bold tracking-[0.14em]">PROGRESSÃO</span></div><p className="mt-3 text-sm leading-relaxed text-white/64">O nível seguinte é liberado ao manter média de <strong className="text-white">8,5</strong> em IES e IRL no histórico online.</p></section></div>
      </div>
    </section>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [view, setView] = useState<AppView>("treino");
  const [online, setOnline] = useState(() => navigator.onLine);
  const [activeBlock, setActiveBlock] = useState<BlockId>("bloco-1");
  const [day, setDay] = useState("segunda");
  const [level, setLevel] = useState("iniciante");
  const [exerciseId, setExerciseId] = useState(1);
  const [part, setPart] = useState<PartCode>("A");
  const [attempts, setAttempts] = useState<SessionMap>(() => loadAttempts());
  const [mobileMenu, setMobileMenu] = useState(false);
  const [analysisProvider, setAnalysisProvider] = useState<"gemini" | "manus">("gemini");
  const [showThunder, setShowThunder] = useState(false);
  const [showMassage, setShowMassage] = useState(false);
  const syncMutation = trpc.vocal.syncSession.useMutation();
  const routine = getTrainingBlockRoutine(activeBlock);
  const sections = activeBlock === "bloco-1"
    ? weekDays.map((item) => ({ id: item.id, label: item.label, short: item.short }))
    : block2Fronts.map((item) => ({ id: item.id, label: item.label, short: item.code }));
  const exercise = useMemo(() => routine.find((item) => item.id === exerciseId) ?? routine[0], [exerciseId, routine]);
  const currentAttempts = attempts[exercise.id] ?? {};
  const historyQuery = trpc.vocal.history.useQuery({ exerciseId: exercise.id, blockId: activeBlock }, { enabled: isAuthenticated && online });
  const progressQuery = trpc.vocal.progress.useQuery({ blockId: activeBlock, frontId: activeBlock === "bloco-2" ? exercise.frontId : undefined }, { enabled: isAuthenticated && online });
  const weeklyQuery = trpc.vocal.weekly.useQuery({ blockId: activeBlock }, { enabled: isAuthenticated && online });
  const unlockedLevels = activeBlock === "bloco-1" ? progressQuery.data?.unlocked ?? ["iniciante", "medio"] : levels.map((item) => item.id);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => {
    const retained = Object.fromEntries(Object.entries(attempts).filter(([id, record]) => Number(id) === exercise.id || getSyncableAttempts(Object.values(record).filter(Boolean) as LocalAttempt[]).length > 0));
    localStorage.setItem(storageKey(), JSON.stringify(retained));
  }, [attempts, exercise.id]);

  const onCapture = async (capture: { blob: Blob; durationSeconds: number; features: Parameters<typeof analyseLocalCapture>[2] }) => {
    const analysis = analyseLocalCapture(exercise, part, capture.features);
    const sessionId = currentAttempts.A?.sessionId ?? currentAttempts.B?.sessionId ?? crypto.randomUUID();
    const attempt = createAttempt(sessionId, part, capture.durationSeconds, analysis);
    await saveLocalAudio(attempt.id, capture.blob);
    setAttempts((current) => ({ ...current, [exercise.id]: { ...current[exercise.id], [part]: attempt } }));
    toast.success(`Resultado atual da Parte ${part} salvo neste dispositivo.`);
  };
  const recorder = useAudioRecorder(onCapture);
  const blocked = recorder.status === "recording" || recorder.status === "requesting";

  const confirmExerciseChange = () => {
    if (blocked) {
      toast.error("Conclua ou cancele a gravação antes de mudar de exercício.");
      return false;
    }
    if (!currentAttempts.A || !currentAttempts.B) {
      return window.confirm("Uma das partes deste exercício ainda não foi concluída. Deseja navegar mesmo assim? O resultado atual já salvo será preservado.");
    }
    return true;
  };
  const selectDay = (nextDay: string, skipConfirm = false) => {
    if (nextDay === day) return;
    if (!skipConfirm && !confirmExerciseChange()) return;
    setDay(nextDay); const first = routine.find((item) => item.dayId === nextDay && item.levelId === level) ?? routine.find((item) => item.dayId === nextDay)!; setLevel(first.levelId); setExerciseId(first.id); setPart("A");
  };
  const selectBlock = (nextBlock: BlockId) => {
    if (nextBlock === activeBlock) return;
    if (!confirmExerciseChange()) return;
    const nextStart = getTrainingBlockStart(nextBlock);
    setActiveBlock(nextBlock);
    setDay(nextStart.dayId);
    setLevel(nextStart.levelId);
    setExerciseId(nextStart.exerciseId);
    setPart(nextStart.part);
    setShowThunder(false);
    setShowMassage(false);
  };
  const selectLevel = (nextLevel: string, skipConfirm = false) => {
    if (nextLevel === level) return;
    if (!unlockedLevels.includes(nextLevel as (typeof unlockedLevels)[number])) { toast.message("Este nível será liberado ao alcançar média 8,5 em IES e IRL no nível anterior."); return; }
    if (!skipConfirm && !confirmExerciseChange()) return;
    setLevel(nextLevel); const first = routine.find((item) => item.dayId === day && item.levelId === nextLevel) ?? routine[0]; setExerciseId(first.id); setPart("A");
  };
  const selectExercise = (id: number, skipConfirm = false) => {
    if (id === exercise.id) return;
    if (!skipConfirm && !confirmExerciseChange()) return;
    setExerciseId(id); const next = routine.find((item) => item.id === id)!; setDay(next.dayId); setLevel(next.levelId); setPart("A");
  };
  const navigateExercise = (direction: number) => {
    if (!confirmExerciseChange()) return;
    const next = routine[routine.findIndex((item) => item.id === exercise.id) + direction];
    if (!next) { toast.message(direction > 0 ? "Você chegou ao último exercício desta rotina." : "Você está no primeiro exercício desta rotina."); return; }
    selectExercise(next.id, true);
  };
  const selectPart = (nextPart: PartCode) => {
    if (blocked) return;
    if (nextPart === "B" && !currentAttempts.A) { toast.error("Conclua ou grave a Parte A antes de seguir para a Parte B."); return; }
    setPart(nextPart);
  };
  const clearPart = () => setAttempts((current) => ({ ...current, [exercise.id]: { ...current[exercise.id], [part]: undefined } }));
  const activeAttempt = currentAttempts[part];
  const partContent = part === "A" ? exercise.partA : exercise.partB;
  const syncCurrentExercise = async () => {
    const allParts = Object.values(currentAttempts).filter(Boolean) as LocalAttempt[];
    const parts = getSyncableAttempts(allParts);
    if (!isAuthenticated) { toast.message("Vincule um perfil online para sincronizar suas gravações."); return; }
    if (!online) { toast.message("A sincronização será retomada quando a conexão voltar."); return; }
    if (!allParts.length) { toast.message("Ainda não há uma gravação concluída para sincronizar."); return; }
    if (!parts.length) { toast.message("Esta sessão já foi sincronizada."); return; }
    const sessionId = allParts[0].sessionId;
    setAttempts((current) => ({ ...current, [exercise.id]: { ...current[exercise.id], ...Object.fromEntries(parts.map((item) => [item.part, { ...item, syncState: "syncing" }])) } }));
    try {
      for (const item of parts) {
        const audio = await readLocalAudio(item.id);
        if (!audio) throw new Error(`O áudio da Parte ${item.part} não está disponível neste dispositivo.`);
        const mimeType = (["audio/webm", "audio/wav", "audio/mpeg", "audio/ogg", "audio/mp4"] as const).includes(audio.type as "audio/webm" | "audio/wav" | "audio/mpeg" | "audio/ogg" | "audio/mp4")
          ? audio.type as "audio/webm" | "audio/wav" | "audio/mpeg" | "audio/ogg" | "audio/mp4"
          : "audio/webm";
        const response = await syncMutation.mutateAsync({ sessionId, exerciseId: exercise.id, blockId: activeBlock, frontId: exercise.frontId ?? "rotina-semanal", dayId: exercise.dayId, levelId: exercise.levelId, exerciseTitle: exercise.title, provider: analysisProvider, criteria: exercise.criteria ?? ["Estabilidade do fluxo", "Densidade grave", "Relaxamento acústico", "Articulação", "Transição vocal"], partBMode: exercise.partBMode ?? "texto", parts: [{
          id: item.id,
          part: item.part,
          attemptNumber: 1,
          mimeType,
          audioBase64: await audioAsBase64(audio),
          durationSeconds: item.durationSeconds,
          expectedText: item.part === "A" ? exercise.partA : exercise.partB,
          instructions: exercise.instructions,
          transcript: undefined,
          metrics: {
            ies: item.analysis.metrics.IES.value ?? 0,
            cet: item.analysis.metrics.CET.value ?? 0,
            irl: item.analysis.metrics.IRL.value ?? 0,
            eac: item.analysis.metrics.EAC.value,
            ftr: item.analysis.metrics.FTR.value,
            f0Average: item.analysis.f0Average,
          },
          score: item.analysis.score,
          reliability: item.analysis.reliability,
          feedback: item.analysis.feedback,
          wordDifferences: item.analysis.wordDifferences,
        }] });
        await removeLocalAudio(item.id);
        const remote = response.parts[0]?.analysis;
        setAttempts((current) => ({ ...current, [exercise.id]: { ...current[exercise.id], [item.part]: remote ? {
          ...item,
          syncState: "confirmed",
          transcript: remote.transcript,
          analysis: {
            score: remote.score,
            reliability: remote.reliability,
            feedback: remote.feedback,
            wordDifferences: remote.wordDifferences,
            f0Average: remote.metrics.f0Average ?? null,
            metrics: {
              IES: { value: remote.metrics.ies, source: "analisado_ia" },
              CET: { value: remote.metrics.cet, source: "analisado_ia" },
              IRL: { value: remote.metrics.irl, source: "analisado_ia" },
              EAC: { value: remote.metrics.eac, source: remote.metrics.eac === null ? "aguardando_ia" : "analisado_ia" },
              FTR: { value: remote.metrics.ftr, source: remote.metrics.ftr === null ? "aguardando_ia" : "analisado_ia" },
            },
          },
        } : { ...item, syncState: "confirmed" } } }));
      }
      toast.success("Sessão sincronizada. O histórico online será atualizado.");
    } catch (error) {
      setAttempts((current) => ({ ...current, [exercise.id]: { ...current[exercise.id], ...Object.fromEntries(parts.map((item) => [item.part, { ...item, syncState: "failed" }])) } }));
      toast.error(error instanceof Error ? error.message : "Não foi possível sincronizar a sessão.");
    }
  };
  useEffect(() => {
    const hasPendingSession = Object.values(currentAttempts).some((item) => item && (item.syncState === "local" || item.syncState === "pending" || item.syncState === "failed"));
    if (!online || !isAuthenticated || !hasPendingSession || syncMutation.isPending) return;
    const timer = window.setTimeout(() => { void syncCurrentExercise(); }, 800);
    return () => window.clearTimeout(timer);
  }, [online, isAuthenticated, exercise.id, attempts]);
  const navItems: { id: AppView; label: string; icon: typeof Compass }[] = [{ id: "inicio", label: "Visão geral", icon: Compass }, { id: "treino", label: "Treino", icon: Mic2 }, { id: "evolucao", label: "Evolução", icon: BarChart3 }, { id: "perfil", label: "Perfil", icon: CircleUserRound }];
  const blockLabel = getTrainingBlockLabel(activeBlock);
  const exerciseCode = activeBlock === "bloco-1" ? exercise.id.toString().padStart(2, "0") : `${exercise.frontCode ?? ""}${exercise.order ?? ""}`;

  const mainContent = view === "evolucao" ? <EvolutionPanel attempts={attempts} weekly={weeklyQuery.data} /> : view === "perfil" ? <section className="glass-card rounded-[1.8rem] p-7"><p className="text-[0.68rem] font-bold tracking-[0.18em] text-[#c89967]">PERFIL & SINCRONIZAÇÃO</p><h2 className="mt-2 font-display text-3xl text-white">{isAuthenticated ? `Olá, ${user?.name ?? "vocalista"}` : "Perfil local ativo"}</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">No modo local, apenas o resultado atual fica neste dispositivo. Ao vincular um perfil online, as sessões pendentes poderão ser sincronizadas e o histórico com os três últimos resultados do mesmo exercício será habilitado.</p><div className="mt-6"><p className="text-[.67rem] font-bold tracking-[.14em] text-[#e7b27f]">PROVEDOR DE ANÁLISE ONLINE</p><div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setAnalysisProvider("gemini")} className={cn("border-white/15", analysisProvider === "gemini" && "border-[#d48655] bg-[#d48655]/15 text-[#f3c493]")}>Gemini</Button><Button type="button" variant="outline" onClick={() => setAnalysisProvider("manus")} className={cn("border-white/15", analysisProvider === "manus" && "border-[#d48655] bg-[#d48655]/15 text-[#f3c493]")}>IA Manus</Button></div><p className="mt-2 text-xs text-white/38">A escolha é usada na próxima sincronização. A chave pessoal do Gemini não é exibida nem armazenada no navegador.</p></div><div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => isAuthenticated ? void syncCurrentExercise() : startLogin()} disabled={syncMutation.isPending} className="bg-[#d48655] text-[#16101a] hover:bg-[#eda674]">{isAuthenticated ? syncMutation.isPending ? "Sincronizando…" : "Sincronizar sessões pendentes" : "Vincular perfil online"}</Button>{isAuthenticated ? <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm text-white/55"><ShieldCheck className="h-4 w-4 text-[#a6e3c3]" /> Perfil online vinculado</span> : null}</div></section> : <section className="space-y-5"><div className="rounded-[1.8rem] border border-[#d48655]/15 bg-[linear-gradient(125deg,rgba(212,134,85,.11),rgba(28,43,67,.72)_42%,rgba(8,18,37,.84))] p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[0.68rem] font-bold tracking-[0.2em] text-[#e7b27f]">{blockLabel} · {exercise.dayName.toUpperCase()}</p><h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{activeBlock === "bloco-1" ? "Construa profundidade com controle, não com força." : "Liberte o grave com presença, fluidez e conforto."}</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">{exercise.dayFocus}. Trabalhe uma parte por vez e avance no seu próprio ritmo.</p></div><div className="rounded-2xl border border-white/10 bg-[#081225]/60 px-4 py-3 text-right"><span className="text-xs font-semibold text-white/45">EXERCÍCIO ATUAL</span><p className="mt-1 font-display text-2xl text-[#f1c69e]">{exerciseCode} <span className="text-base text-white/45">/ {activeBlock === "bloco-1" ? 72 : 120}</span></p></div></div></div>
    <div className="xl:hidden"><div className="rounded-2xl border border-white/[.08] bg-[#09172b]/75 p-3"><p className="mb-2 text-[0.65rem] font-bold tracking-[.15em] text-[#c89967]">SELEÇÃO DE TREINO</p><div className="grid gap-2 sm:grid-cols-3"><select aria-label="Escolher frente ou dia" value={day} disabled={blocked} onChange={(event) => selectDay(event.target.value)} className="h-10 rounded-xl border border-white/[.1] bg-[#102039] px-3 text-sm text-white disabled:opacity-45">{sections.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select><select aria-label="Escolher nível" value={level} disabled={blocked} onChange={(event) => selectLevel(event.target.value)} className="h-10 rounded-xl border border-white/[.1] bg-[#102039] px-3 text-sm text-white disabled:opacity-45">{levels.map((item) => <option disabled={!unlockedLevels.includes(item.id)} value={item.id} key={item.id}>{item.label}{!unlockedLevels.includes(item.id) ? " · bloqueado" : ""}</option>)}</select><select aria-label="Escolher exercício" value={exercise.id} disabled={blocked} onChange={(event) => selectExercise(Number(event.target.value))} className="h-10 rounded-xl border border-white/[.1] bg-[#102039] px-3 text-sm text-white disabled:opacity-45">{routine.filter((item) => item.dayId === day && item.levelId === level).map((item) => <option value={item.id} key={item.id}>Ex. {activeBlock === "bloco-1" ? item.id.toString().padStart(2, "0") : `${item.frontCode ?? ""}${item.order ?? ""}`} · {item.title}</option>)}</select></div></div></div>
    <div className="glass-card rounded-[1.8rem] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[0.7rem] font-bold tracking-[0.16em] text-[#c89967]">{exercise.levelName.toUpperCase()} · EXERCÍCIO {exerciseCode}</p><h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">{exercise.title}</h2></div><div className="flex gap-2 text-xs text-white/50"><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2">{exercise.durationSeconds ? `${exercise.durationSeconds}s` : "Ritmo livre"}</span><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2">{exercise.repetitions ? `${exercise.repetitions} rep.` : "Foco livre"}</span></div></div>
      <div className="mt-6 grid grid-cols-2 rounded-2xl border border-white/[.08] bg-[#071225]/75 p-1" role="tablist" aria-label="Partes do exercício"><button role="tab" aria-selected={part === "A"} aria-controls="painel-parte" onClick={() => selectPart("A")} className={cn("rounded-xl px-4 py-3 text-left transition-colors", part === "A" ? "bg-[#d48655] text-[#17121a]" : "text-white/58 hover:text-white")}> <span className="text-[0.65rem] font-bold tracking-[0.16em]">PARTE A</span><span className="mt-1 block text-sm font-semibold">Execução técnica</span></button><button role="tab" aria-selected={part === "B"} aria-controls="painel-parte" onClick={() => selectPart("B")} disabled={!currentAttempts.A || blocked} className={cn("rounded-xl px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40", part === "B" ? "bg-[#d48655] text-[#17121a]" : "text-white/58 hover:text-white")}> <span className="text-[0.65rem] font-bold tracking-[0.16em]">PARTE B</span><span className="mt-1 block text-sm font-semibold">Aplicação vocal</span></button></div>
      <div id="painel-parte" role="tabpanel" className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl border border-white/[.07] bg-[#071225]/55 p-5"><div className="flex items-center gap-2 text-[#e7b27f]"><Target className="h-4 w-4" /><span className="text-xs font-bold tracking-[0.14em]">COMO FAZER</span></div><p className="mt-3 text-sm leading-relaxed text-white/72">{exercise.instructions}</p></div><div className="rounded-2xl border border-[#d48655]/18 bg-[#d48655]/[.055] p-5"><div className="flex items-center gap-2 text-[#e7b27f]"><AudioLines className="h-4 w-4" /><span className="text-xs font-bold tracking-[0.14em]">{part === "A" ? "SEQUÊNCIA TÉCNICA" : "APLICAÇÃO VOCAL"}</span></div><p className={cn("mt-3 whitespace-pre-line leading-relaxed text-white", part === "A" ? "font-display text-xl tracking-wide" : "text-sm")}>{partContent}</p></div></div>
      <div className="mt-5"><AudioCapturePanel part={part} status={recorder.status} elapsed={recorder.elapsed} error={recorder.error} attempt={activeAttempt} onStart={recorder.start} onFinish={recorder.finish} onCancel={recorder.cancel} onRedo={clearPart} /></div>
      <PartResult attempt={activeAttempt} part={part} criteria={exercise.criteria} />
      {isAuthenticated && online ? <section className="glass-card mt-5 rounded-[1.6rem] p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[0.67rem] font-bold tracking-[0.18em] text-[#c89967]">HISTÓRICO ONLINE</p><h3 className="mt-1 font-display text-xl text-white">Três sessões anteriores</h3></div><span className="text-xs text-white/38">Mesmo exercício</span></div>{historyQuery.isLoading ? <p className="mt-4 text-sm text-white/45">Buscando resultados sincronizados…</p> : historyQuery.data?.filter((entry) => entry.sessionId !== activeAttempt?.sessionId).length ? <div className="mt-4 grid gap-3 sm:grid-cols-3">{historyQuery.data.filter((entry) => entry.sessionId !== activeAttempt?.sessionId).slice(0, 3).map((entry) => <div key={entry.sessionId} className="rounded-xl border border-white/[.07] bg-[#071225]/55 p-3"><p className="text-[0.64rem] font-bold tracking-[.12em] text-[#e5aa75]">SESSÃO COMPLETA</p><p className="mt-2 text-2xl font-semibold text-white">{entry.score?.toFixed(1) ?? "—"}</p><p className="mt-1 text-xs text-white/40">{new Date(entry.createdAt).toLocaleDateString("pt-BR")}{entry.f0Average ? ` · F0 ${entry.f0Average} Hz` : ""}</p>{entry.metrics ? <div className="mt-3 grid grid-cols-5 gap-1 text-center text-[.59rem] text-white/60">{(["ies", "cet", "irl", "eac", "ftr"] as const).map((metric, index) => <span key={metric} className="rounded-md bg-white/[.05] px-1 py-1"><strong className="block text-[#f1c69e]">{entry.metrics?.[metric].toFixed(1)}</strong>{exercise.criteria?.[index] ?? metric.toUpperCase()}</span>)}</div> : null}</div>)}</div> : <p className="mt-4 text-sm leading-relaxed text-white/45">Ainda não há três sessões anteriores sincronizadas para comparar. Ao concluir novas sessões online, elas aparecerão aqui.</p>}</section> : null}
      <div className="mt-6 flex flex-col justify-between gap-3 border-t border-white/[.07] pt-5 sm:flex-row"><Button variant="outline" onClick={() => navigateExercise(-1)} disabled={blocked} className="h-11 rounded-xl border-white/12 bg-transparent text-white/70 hover:bg-white/[.07] hover:text-white"><ArrowLeft className="mr-2 h-4 w-4" /> Exercício anterior</Button>{part === "A" ? <Button onClick={() => selectPart("B")} disabled={!currentAttempts.A || blocked} className="h-11 rounded-xl bg-[#d48655] text-[#17121a] hover:bg-[#eda674]">Ir para Parte B <ChevronRight className="ml-2 h-4 w-4" /></Button> : <Button onClick={() => navigateExercise(1)} disabled={blocked} className="h-11 rounded-xl bg-[#d48655] text-[#17121a] hover:bg-[#eda674]">Próximo exercício <ArrowRight className="ml-2 h-4 w-4" /></Button>}</div>
    </div></section>;

  return <div className="min-h-screen overflow-x-hidden bg-[#071020] text-white"><div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(103,42,70,.28),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(43,83,117,.22),transparent_26%),linear-gradient(180deg,#071020_0%,#09162a_100%)]" />
    <div className="relative mx-auto flex min-h-screen max-w-[1680px]"><aside className="hidden w-[15.75rem] shrink-0 border-r border-white/[.06] bg-[#071020]/75 px-4 py-6 lg:flex lg:flex-col"><div className="flex items-center gap-3 px-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#d48655] to-[#8c3147] shadow-[0_8px_25px_rgba(184,71,87,.35)]"><Volume2 className="h-5 w-5 text-white" /></div><div><p className="font-display text-lg font-bold tracking-tight">MEU <span className="text-[#e4a875]">GRAVE</span></p><p className="text-[0.6rem] font-bold tracking-[0.17em] text-white/32">TREINO VOCAL</p></div></div><nav className="mt-10 space-y-1.5">{navItems.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors", view === item.id ? "bg-[#243952] text-white" : "text-white/45 hover:bg-white/[.045] hover:text-white/80")}><item.icon className={cn("h-4 w-4", view === item.id && "text-[#e5aa75]")} />{item.label}</button>)}</nav><div className="mt-auto rounded-2xl border border-[#d48655]/15 bg-[#d48655]/[.055] p-4"><div className="flex items-center gap-2 text-[#f0c699]"><Sparkles className="h-4 w-4" /><span className="text-xs font-bold tracking-wide">SEU RITMO</span></div><p className="mt-2 text-sm leading-relaxed text-white/52">A técnica evolui quando o corpo encontra consistência.</p></div></aside>
      <div className="min-w-0 flex-1"><header className="flex h-[4.75rem] items-center justify-between border-b border-white/[.06] px-4 sm:px-7"><div className="flex items-center gap-3 lg:hidden"><button onClick={() => setMobileMenu(!mobileMenu)} className="rounded-lg p-2 text-white/70 hover:bg-white/[.06]" aria-label="Abrir menu"><Menu className="h-5 w-5" /></button><span className="font-display font-bold">MEU <span className="text-[#e4a875]">GRAVE</span></span></div><div className="hidden lg:block"><p className="text-xs font-semibold tracking-[0.14em] text-white/32">{blockLabel}</p></div><div className="flex items-center gap-3"><span className={cn("hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:inline-flex", online ? "border-[#6bc79d]/25 bg-[#6bc79d]/8 text-[#a6e3c3]" : "border-white/10 bg-white/[.04] text-white/48")}>{online ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}{online ? "Online · aguardando perfil" : "Modo offline"}</span><button onClick={() => isAuthenticated ? setView("perfil") : startLogin()} className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 text-xs text-white/68 transition-colors hover:bg-white/[.09]"><CircleUserRound className="h-4 w-4 text-[#e7b27f]" /><span className="hidden sm:inline">{isAuthenticated ? user?.name ?? "Perfil" : "Perfil local"}</span></button></div></header>
        {mobileMenu ? <div className="border-b border-white/[.06] bg-[#0b172a] px-4 py-3 lg:hidden"><div className="grid grid-cols-2 gap-2">{navItems.map((item) => <button key={item.id} onClick={() => { setView(item.id); setMobileMenu(false); }} className={cn("rounded-xl px-3 py-2.5 text-left text-sm", view === item.id ? "bg-[#243952] text-white" : "bg-white/[.04] text-white/55")}><item.icon className="mr-2 inline h-4 w-4" />{item.label}</button>)}</div></div> : null}
        <main className="space-y-5 px-4 py-6 sm:px-7 sm:py-8"><section className="glass-card rounded-[1.5rem] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[0.67rem] font-bold tracking-[.16em] text-[#c89967]">ESCOLHA SEU BLOCO</p><p className="mt-1 text-sm text-white/55">Rotinas independentes, conta e análise compartilhadas.</p></div><div className="flex rounded-xl border border-white/10 bg-[#071225]/70 p-1"><Button type="button" variant="ghost" onClick={() => selectBlock("bloco-1")} className={cn("h-9 rounded-lg px-3 text-xs", activeBlock === "bloco-1" && "bg-[#d48655] text-[#17121a] hover:bg-[#e8a572]")}>Bloco 1 · Semanal</Button><Button type="button" variant="ghost" onClick={() => selectBlock("bloco-2")} className={cn("h-9 rounded-lg px-3 text-xs", activeBlock === "bloco-2" && "bg-[#d48655] text-[#17121a] hover:bg-[#e8a572]")}>Bloco 2 · Liberação</Button></div></div>{activeBlock === "bloco-2" ? <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setShowThunder(!showThunder)} className="border-white/15 text-white/75">Voz de Trovão · biblioteca livre</Button><Button type="button" variant="outline" onClick={() => setShowMassage(!showMassage)} className="border-white/15 text-white/75">Massagem laríngea · prática guiada</Button></div> : null}{showThunder ? <div className="mt-4 grid gap-3 md:grid-cols-2">{voiceThunderLibrary.map((group) => <div key={group.category} className="rounded-xl border border-white/[.08] bg-[#071225]/55 p-3"><p className="text-xs font-bold tracking-[.12em] text-[#e7b27f]">{group.category.toUpperCase()}</p><p className="mt-2 text-sm leading-relaxed text-white/65">{group.prompts.join(" · ")}</p></div>)}</div> : null}{showMassage ? <div className="mt-4 rounded-xl border border-[#d48655]/20 bg-[#d48655]/[.06] p-4"><p className="font-display text-lg text-white">{massageGuide.title}</p><p className="mt-2 text-sm leading-relaxed text-white/70">{massageGuide.instructions}</p><p className="mt-2 text-xs text-[#f1c69e]">{massageGuide.notice}</p></div> : null}</section><div className="flex gap-6"><ExercisePicker selectedSection={day} selectedLevel={level} selectedId={exercise.id} onSectionChange={selectDay} onLevelChange={selectLevel} onExerciseChange={selectExercise} disabled={blocked} unlockedLevels={unlockedLevels} routine={routine} sections={sections} sectionLabel={activeBlock === "bloco-1" ? "Roteiro semanal" : "Frentes do bloco 2"} /><div className="min-w-0 flex-1">{mainContent}</div></div></main>
      </div></div></div>;
}
