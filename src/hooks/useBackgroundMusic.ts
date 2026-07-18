import { useCallback, useEffect, useRef, useState } from "react";
import { backgroundMusic } from "../content/mediaCatalog";

export type BackgroundMusicStatus = "off" | "loading" | "playing" | "error";

export function useBackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const operationRef = useRef(0);
  const statusRef = useRef<BackgroundMusicStatus>("off");
  const [status, setStatus] = useState<BackgroundMusicStatus>("off");
  const [error, setError] = useState<string | null>(null);

  const commitStatus = useCallback((nextStatus: BackgroundMusicStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const stop = useCallback(() => {
    operationRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setError(null);
    commitStatus("off");
  }, [commitStatus]);

  const start = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;

    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setError(null);
    commitStatus("loading");
    audio.volume = backgroundMusic.volume;
    audio.src = backgroundMusic.src;
    audio.load();

    try {
      await audio.play();
      if (operationRef.current !== operation) return false;
      if (audio.paused || audio.error) throw new Error("背景音乐未能开始播放");
      commitStatus("playing");
      return true;
    } catch {
      if (operationRef.current !== operation) return false;
      audio.pause();
      setError("背景音乐加载失败，点击可重试");
      commitStatus("error");
      return false;
    }
  }, [commitStatus]);

  const toggle = useCallback(() => {
    if (statusRef.current === "playing" || statusRef.current === "loading") {
      stop();
      return Promise.resolve(false);
    }
    return start();
  }, [start, stop]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlaying = () => {
      if (statusRef.current === "loading") commitStatus("playing");
    };
    const onPause = () => {
      if (statusRef.current === "playing") commitStatus("off");
    };
    const onError = () => {
      if (statusRef.current === "off") return;
      operationRef.current += 1;
      setError("背景音乐加载失败，点击可重试");
      commitStatus("error");
    };

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    return () => {
      operationRef.current += 1;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
    };
  }, [commitStatus]);

  return { audioRef, status, error, toggle };
}
