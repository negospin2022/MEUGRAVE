import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration, type LocalAttempt, type PartCode } from "@/lib/vocal";
import type { RecorderStatus } from "@/hooks/useAudioRecorder";
import { Check, Cloud, LoaderCircle, Mic, RotateCcw, Square, Trash2, Waves } from "lucide-react";
import { useState } from "react";

type AudioCapturePanelProps = {
  part: PartCode;
  status: RecorderStatus;
  elapsed: number;
  error: string | null;
  attempt?: LocalAttempt;
  onStart: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onRedo: () => void;
  disabled?: boolean;
};

export function AudioCapturePanel({
  part,
  status,
  elapsed,
  error,
  attempt,
  onStart,
  onFinish,
  onCancel,
  onRedo,
  disabled,
}: AudioCapturePanelProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const isRecording = status === "recording";
  const isRequesting = status === "requesting";
  const bars = Array.from({ length: 35 }, (_, index) => 18 + ((index * 17 + 21) % 58));
  const syncLabels = {
    local: "Local · sem internet",
    pending: "Pendente de sincronização",
    syncing: "Enviando para o perfil",
    confirmed: "Sincronizado",
    failed: "Falha ao sincronizar",
  } as const;

  return (
    <section className="glass-card relative overflow-hidden rounded-[1.6rem] p-5 sm:p-6" aria-live="polite" aria-busy={isRecording || isRequesting}>
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.69rem] font-bold tracking-[0.18em] text-[#c89967]">CAPTURA DE ÁUDIO</p>
          <h3 className="mt-1 font-display text-xl font-semibold text-white">Gravação da Parte {part}</h3>
        </div>
        {attempt ? (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold", attempt.syncState === "confirmed" ? "border-[#6bc79d]/30 bg-[#6bc79d]/10 text-[#a6e3c3]" : attempt.syncState === "failed" ? "border-[#b84757]/30 bg-[#b84757]/10 text-[#ffb7bf]" : "border-[#d48655]/30 bg-[#d48655]/10 text-[#f1c69e]") }>
            {attempt.syncState === "confirmed" ? <Check className="h-3.5 w-3.5" /> : <Cloud className={cn("h-3.5 w-3.5", attempt.syncState === "syncing" && "animate-pulse")} />} {syncLabels[attempt.syncState]}
          </span>
        ) : (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65">Pronto para gravar</span>
        )}
      </div>

      <div className={cn("mt-5 rounded-2xl border px-4 py-4", isRecording ? "border-[#b84757]/40 bg-[#b84757]/10" : "border-white/7 bg-[#071225]/55")}>
        <div className="flex items-center justify-between text-xs font-medium text-white/55">
          <span className="flex items-center gap-2"><Waves className={cn("h-4 w-4", isRecording && "animate-pulse text-[#ee7f8b]")} /> Indicador de captura</span>
          <span className={cn("font-mono text-sm", isRecording ? "text-[#ffc0c8]" : "text-white/70")}>{formatDuration(isRecording ? elapsed : attempt?.durationSeconds ?? 0)}</span>
        </div>
      <div className="mt-4 flex h-16 items-center justify-center gap-1" aria-hidden="true">
          {bars.map((height, index) => (
            <span
              className={cn("w-1 rounded-full transition-all duration-300", isRecording ? "bg-gradient-to-t from-[#8c3147] via-[#d36975] to-[#f2b278]" : "bg-[#294768]")}
              style={{ height: `${isRecording ? Math.max(18, height + ((index % 5) * 7)) : Math.max(12, height * 0.42)}%` }}
              key={index}
            />
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-white/48">
          {isRecording ? "Gravação em andamento. Mantenha uma distância confortável do microfone." : "O sinal visual acompanha somente a captura atual."}
        </p>
      </div>

      {error ? <p className="mt-3 text-sm text-[#ffadb5]" role="alert">{error}</p> : null}

      <div className="relative z-10 mt-5 flex flex-col gap-3 sm:flex-row">
        {isRecording ? (
          <>
            <Button onClick={onFinish} className="h-12 flex-1 rounded-xl bg-[#b84757] text-white hover:bg-[#c95867]">
              <Square className="mr-2 h-4 w-4 fill-current" /> Concluir gravação
            </Button>
            <Button onClick={() => setConfirmCancel(true)} variant="outline" className="h-12 rounded-xl border-[#b84757]/50 bg-transparent text-[#ffc0c8] hover:bg-[#b84757]/10 hover:text-[#ffc0c8]">
              <Trash2 className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </>
        ) : attempt ? (
          <Button onClick={onRedo} variant="outline" className="h-12 flex-1 rounded-xl border-[#cfad85]/35 bg-[#cfad85]/8 text-[#f0cfaa] hover:bg-[#cfad85]/15 hover:text-white" disabled={disabled}>
            <RotateCcw className="mr-2 h-4 w-4" /> Gravar novamente
          </Button>
        ) : (
          <Button onClick={onStart} className="h-12 flex-1 rounded-xl bg-[#d48655] text-[#16101a] shadow-[0_10px_30px_rgba(212,134,85,.16)] hover:bg-[#eda674]" disabled={disabled || isRequesting}>
            {isRequesting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
            {isRequesting ? "Preparando microfone" : `Gravar Parte ${part}`}
          </Button>
        )}
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent className="border-white/10 bg-[#101a30] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar esta gravação?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">O áudio em captura será apagado e não receberá análise. Você poderá gravar novamente depois.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">Continuar gravando</AlertDialogCancel>
            <AlertDialogAction className="bg-[#b84757] text-white hover:bg-[#c95867]" onClick={() => { setConfirmCancel(false); onCancel(); }}>Descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
