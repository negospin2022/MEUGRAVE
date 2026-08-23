import { useCallback, useEffect, useRef, useState } from "react";
import type { SignalFeatures } from "@/lib/vocal";

export type CapturedAudio = {
  blob: Blob;
  url: string;
  durationSeconds: number;
  features: SignalFeatures;
};

export type RecorderStatus = "idle" | "requesting" | "recording" | "error";

export function useAudioRecorder(onCapture: (capture: CapturedAudio) => void) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const cancelledRef = useRef(false);
  const samplesRef = useRef<Array<{ amplitude: number; lowRatio: number }>>([]);
  const captureCallbackRef = useRef(onCapture);

  useEffect(() => {
    captureCallbackRef.current = onCapture;
  }, [onCapture]);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (timerRef.current) window.clearInterval(timerRef.current);
    animationFrameRef.current = null;
    timerRef.current = null;
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    streamRef.current = null;
    sourceRef.current = null;
    analyserRef.current = null;
    audioContextRef.current = null;
  }, []);

  const finish = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    recorderRef.current?.stop();
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Seu navegador não disponibiliza gravação de áudio. Use uma versão atual do Chrome, Edge ou Firefox.");
      setStatus("error");
      return;
    }
    setStatus("requesting");
    setError(null);
    cancelledRef.current = false;
    samplesRef.current = [];
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = context;
      sourceRef.current = source;
      analyserRef.current = analyser;
      const timeData = new Uint8Array(analyser.fftSize);
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const sampleSignal = () => {
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(frequencyData);
        const amplitude = Array.from(timeData).reduce((sum, value) => sum + Math.abs(value - 128) / 128, 0) / timeData.length;
        const energy = Array.from(frequencyData).reduce((sum, value) => sum + value, 0) || 1;
        const lowEnergy = Array.from(frequencyData.slice(1, 13)).reduce((sum, value) => sum + value, 0);
        samplesRef.current.push({ amplitude, lowRatio: lowEnergy / energy });
        animationFrameRef.current = requestAnimationFrame(sampleSignal);
      };
      sampleSignal();

      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const samples = samplesRef.current;
        const amplitudes = samples.map((item) => item.amplitude);
        const averageAmplitude = amplitudes.reduce((sum, value) => sum + value, 0) / Math.max(1, amplitudes.length);
        const amplitudeDeviation = Math.sqrt(
          amplitudes.reduce((sum, value) => sum + (value - averageAmplitude) ** 2, 0) / Math.max(1, amplitudes.length)
        );
        const features: SignalFeatures = {
          durationSeconds,
          averageAmplitude,
          stability: Math.max(0, Math.min(1, 1 - amplitudeDeviation * 5.5)),
          lowFrequencyRatio: samples.reduce((sum, item) => sum + item.lowRatio, 0) / Math.max(1, samples.length),
          samples: samples.length,
        };
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        cleanup();
        setElapsed(0);
        setStatus("idle");
        if (!cancelledRef.current && blob.size > 0) {
          captureCallbackRef.current({ blob, url: URL.createObjectURL(blob), durationSeconds, features });
        }
      };
      recorder.onerror = () => {
        cleanup();
        setStatus("error");
        setError("Não foi possível concluir a gravação. Tente novamente.");
      };
      startedAtRef.current = Date.now();
      recorder.start(250);
      timerRef.current = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 250);
      setStatus("recording");
    } catch {
      cleanup();
      setStatus("error");
      setError("Permita o acesso ao microfone para realizar a gravação.");
    }
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { status, elapsed, error, start, finish, cancel };
}
