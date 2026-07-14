import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { heroMedia } from "../content/mediaCatalog";
import type { ClipDefinition, ClipKey } from "../content/mediaCatalog";

type PlaybackOptions = {
  after?: "talk";
  initial?: boolean;
  playbackRate?: number;
  holdAtEnd?: boolean;
};

type PerformanceSnapshot = {
  status: string;
  counter: string;
  activeAction: ClipKey | null;
  currentKey: ClipKey | null;
  started: boolean;
};

type ControllerCallbacks = {
  onSnapshot: (snapshot: PerformanceSnapshot) => void;
  onProgress: (value: number) => void;
  onTalk: () => void;
  onSoundRejected: () => void;
};

const DEFAULT_SNAPSHOT: PerformanceSnapshot = {
  status: "NYXIE IS WATCHING",
  counter: "READY / 00",
  activeAction: null,
  currentKey: null,
  started: false,
};

const TRANSITION = {
  defocus: 180,
  refocus: 260,
  blur: 14,
};

const delay = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

class HeroPerformanceController {
  private activeIndex = -1;
  private currentKey: ClipKey | null = null;
  private currentAfter: "talk" | null = null;
  private currentHoldAtEnd = false;
  private plannedKey: ClipKey | null = null;
  private plannedPromise: Promise<boolean> | null = null;
  private transitioning = false;
  private started = false;
  private disposed = false;
  private soundOn = false;
  private heroVisible = true;
  private hasLeftHero = false;
  private suppressWelcome = false;
  private lastAmbientAction: ClipKey | null = null;
  private loadIds = new WeakMap<HTMLVideoElement, number>();
  private welcomeTimer = 0;
  private requestSequence = 0;

  private readonly timeUpdateHandlers: Array<() => void>;
  private readonly endedHandlers: Array<() => void>;

  constructor(
    private readonly players: [HTMLVideoElement, HTMLVideoElement],
    private readonly stage: HTMLElement,
    private readonly reducedMotion: boolean,
    private readonly callbacks: ControllerCallbacks,
  ) {
    this.timeUpdateHandlers = players.map((player) => () => this.onTimeUpdate(player));
    this.endedHandlers = players.map((player) => () => this.onEnded(player));
    players.forEach((player, index) => {
      player.addEventListener("timeupdate", this.timeUpdateHandlers[index]);
      player.addEventListener("ended", this.endedHandlers[index]);
    });
  }

  get isStarted() {
    return this.started;
  }

  private get activePlayer() {
    return this.activeIndex < 0 ? null : this.players[this.activeIndex];
  }

  private get standbyPlayer() {
    return this.activeIndex < 0 ? this.players[0] : this.players[1 - this.activeIndex];
  }

  private emit(clip?: ClipDefinition) {
    this.callbacks.onSnapshot({
      status: clip?.label ?? "NYXIE IS WATCHING",
      counter: clip?.counter ?? "READY / 00",
      activeAction: clip?.kind === "action" ? this.currentKey : null,
      currentKey: this.currentKey,
      started: this.started,
    });
  }

  private async loadPlayer(player: HTMLVideoElement, key: ClipKey) {
    if (player.dataset.clip === key && player.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      return true;
    }

    const loadId = (this.loadIds.get(player) ?? 0) + 1;
    this.loadIds.set(player, loadId);
    player.pause();
    player.playbackRate = 1;
    player.muted = !this.soundOn;
    player.dataset.clip = key;
    player.src = heroMedia.clips[key].src;
    player.load();

    return new Promise<boolean>((resolve) => {
      const timeout = window.setTimeout(() => finish(false), 9000);
      const onReady = () => finish(true);
      const onError = () => finish(false);
      const finish = (result: boolean) => {
        window.clearTimeout(timeout);
        player.removeEventListener("loadeddata", onReady);
        player.removeEventListener("error", onError);
        const currentLoad = this.loadIds.get(player) === loadId && player.dataset.clip === key;
        if (result && currentLoad) player.currentTime = 0;
        resolve(result && currentLoad && !this.disposed);
      };

      player.addEventListener("loadeddata", onReady, { once: true });
      player.addEventListener("error", onError, { once: true });
    });
  }

  private async startPlayer(player: HTMLVideoElement, playbackRate = 1) {
    player.currentTime = 0;
    player.playbackRate = playbackRate;
    player.muted = !this.soundOn;
    try {
      await player.play();
      return true;
    } catch {
      this.soundOn = false;
      this.players.forEach((item) => { item.muted = true; });
      this.callbacks.onSoundRejected();
      try {
        await player.play();
        return true;
      } catch {
        return false;
      }
    }
  }

  private chooseAmbientAction(): ClipKey {
    const actions: ClipKey[] = ["reactKey", "vanish", "tease"];
    const available = actions.filter((key) => key !== this.lastAmbientAction);
    const key = available[Math.floor(Math.random() * available.length)];
    this.lastAmbientAction = key;
    return key;
  }

  private chooseNextAfter(key: ClipKey): ClipKey {
    if (key === "idleMain") return "idleKey";
    if (key === "idleKey") return this.chooseAmbientAction();
    return "idleMain";
  }

  private prepareNext() {
    if (!this.currentKey || this.activeIndex < 0) return;
    this.plannedKey = this.chooseNextAfter(this.currentKey);
    this.plannedPromise = this.loadPlayer(this.standbyPlayer, this.plannedKey);
  }

  private async transitionPlayers(previous: HTMLVideoElement, next: HTMLVideoElement, playbackRate: number) {
    const defocus = this.stage.animate(
      [
        { filter: "blur(0px) brightness(1)" },
        { filter: `blur(${TRANSITION.blur}px) brightness(1.025)` },
      ],
      {
        duration: TRANSITION.defocus,
        easing: "cubic-bezier(0.4, 0, 1, 1)",
        fill: "both",
      },
    );
    await Promise.allSettled([defocus.finished]);

    previous.pause();
    previous.classList.remove("is-visible");
    const playing = await this.startPlayer(next, playbackRate);
    if (!playing) {
      previous.classList.add("is-visible");
      void previous.play().catch(() => undefined);
    } else {
      next.classList.add("is-visible");
      previous.playbackRate = 1;
    }

    const refocus = this.stage.animate(
      [
        { filter: `blur(${TRANSITION.blur}px) brightness(1.025)` },
        { filter: "blur(0px) brightness(1)" },
      ],
      {
        duration: TRANSITION.refocus,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      },
    );
    defocus.cancel();
    await Promise.allSettled([refocus.finished]);
    refocus.cancel();
    return playing;
  }

  private async switchTo(key: ClipKey, options: PlaybackOptions = {}) {
    const clip = heroMedia.clips[key];
    if (this.disposed || this.reducedMotion || this.transitioning) return false;

    this.transitioning = true;
    const previous = this.activePlayer;
    const nextIndex = this.activeIndex < 0 ? 0 : 1 - this.activeIndex;
    const next = this.players[nextIndex];
    const ready = await this.loadPlayer(next, key);
    if (!ready) {
      this.transitioning = false;
      return false;
    }

    const playbackRate = options.playbackRate ?? 1;
    const playing = previous && !options.initial
      ? await this.transitionPlayers(previous, next, playbackRate)
      : await this.startPlayer(next, playbackRate);
    if (!playing) {
      next.pause();
      this.transitioning = false;
      return false;
    }

    if (!previous || options.initial) next.classList.add("is-visible");
    this.activeIndex = nextIndex;
    this.currentKey = key;
    this.currentAfter = options.after ?? null;
    this.currentHoldAtEnd = Boolean(options.holdAtEnd);
    this.plannedKey = null;
    this.plannedPromise = null;
    this.callbacks.onProgress(0);
    this.emit(clip);
    this.transitioning = false;
    this.prepareNext();
    return true;
  }

  private async advance() {
    if (
      this.disposed ||
      this.transitioning ||
      this.currentHoldAtEnd ||
      !this.currentKey ||
      !this.heroVisible ||
      document.hidden
    ) return;

    const completedAfter = this.currentAfter;
    const nextKey = this.plannedKey ?? this.chooseNextAfter(this.currentKey);
    if (this.plannedPromise && this.plannedKey === nextKey) await this.plannedPromise;
    const switched = await this.switchTo(nextKey);
    if (switched && completedAfter === "talk") this.callbacks.onTalk();
  }

  private onTimeUpdate(player: HTMLVideoElement) {
    if (player !== this.activePlayer || this.transitioning || !this.currentKey) return;
    if (!Number.isFinite(player.duration) || player.duration <= 0) return;
    this.callbacks.onProgress(player.currentTime / player.duration);
    if (player.duration - player.currentTime <= heroMedia.clips[this.currentKey].switchLead) {
      void this.advance();
    }
  }

  private onEnded(player: HTMLVideoElement) {
    if (player === this.activePlayer && !this.transitioning) void this.advance();
  }

  async start() {
    if (this.started || this.reducedMotion || this.disposed) return;
    this.started = true;
    this.emit();
    const started = await this.switchTo("idleMain", { initial: true });
    if (!started) {
      this.started = false;
      this.callbacks.onSnapshot({
        ...DEFAULT_SNAPSHOT,
        status: "VIDEO COULD NOT OPEN",
        counter: "RETRY / —",
      });
    }
  }

  async request(key: ClipKey, options: PlaybackOptions = {}) {
    const requestId = ++this.requestSequence;
    const startedAt = performance.now();
    while (this.transitioning && !this.disposed && performance.now() - startedAt < 2500) {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    }
    if (this.disposed || this.transitioning || requestId !== this.requestSequence) return false;
    return this.switchTo(key, options);
  }

  async waitUntilReady(timeout = 9500) {
    const startedAt = performance.now();
    while (this.transitioning && performance.now() - startedAt < timeout) {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    }
    return !this.transitioning;
  }

  waitUntilEnded(key: ClipKey, timeout = 9500) {
    return new Promise<boolean>((resolve) => {
      const player = this.activePlayer;
      if (this.currentKey !== key || !player) {
        resolve(false);
        return;
      }

      let settled = false;
      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        player.removeEventListener("ended", onEnded);
        resolve(result);
      };
      const onEnded = () => finish(this.currentKey === key);
      const timer = window.setTimeout(() => finish(false), timeout);
      player.addEventListener("ended", onEnded, { once: true });
    });
  }

  setSound(soundOn: boolean) {
    this.soundOn = soundOn;
    this.players.forEach((player) => { player.muted = !soundOn; });
    if (soundOn) this.resume();
  }

  setHeroVisible(visible: boolean) {
    const wasVisible = this.heroVisible;
    this.heroVisible = visible;
    window.clearTimeout(this.welcomeTimer);
    if (!visible) {
      if (wasVisible) this.hasLeftHero = true;
      this.pause();
      return;
    }

    this.resume();
    if (!this.hasLeftHero) return;
    this.hasLeftHero = false;
    if (this.suppressWelcome) {
      this.suppressWelcome = false;
      return;
    }
    this.welcomeTimer = window.setTimeout(() => {
      if (this.heroVisible && !document.hidden) void this.request("tease");
    }, 320);
  }

  suppressNextWelcome() {
    this.suppressWelcome = true;
  }

  pause() {
    this.activePlayer?.pause();
  }

  resume() {
    if (
      !this.started ||
      !this.activePlayer ||
      document.hidden ||
      !this.heroVisible ||
      (this.currentHoldAtEnd && this.activePlayer.ended)
    ) return;
    void this.activePlayer.play().catch(() => undefined);
  }

  dispose() {
    this.disposed = true;
    window.clearTimeout(this.welcomeTimer);
    this.players.forEach((player, index) => {
      player.pause();
      player.removeEventListener("timeupdate", this.timeUpdateHandlers[index]);
      player.removeEventListener("ended", this.endedHandlers[index]);
    });
  }
}

export type PerformanceDirector = {
  stageRef: RefObject<HTMLDivElement | null>;
  videoARef: RefObject<HTMLVideoElement | null>;
  videoBRef: RefObject<HTMLVideoElement | null>;
  progressRef: RefObject<HTMLSpanElement | null>;
  snapshot: PerformanceSnapshot;
  start: () => Promise<void>;
  request: (key: ClipKey, options?: PlaybackOptions) => Promise<boolean>;
  playRandom: () => Promise<boolean>;
  waitUntilReady: () => Promise<boolean>;
  waitUntilEnded: (key: ClipKey) => Promise<boolean>;
  setHeroVisible: (visible: boolean) => void;
  suppressNextWelcome: () => void;
};

type UsePerformanceOptions = {
  soundOn: boolean;
  reducedMotion: boolean;
  onTalk: () => void;
  onSoundRejected: () => void;
};

export function usePerformanceDirector({
  soundOn,
  reducedMotion,
  onTalk,
  onSoundRejected,
}: UsePerformanceOptions): PerformanceDirector {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const controllerRef = useRef<HeroPerformanceController | null>(null);
  const [snapshot, setSnapshot] = useState(DEFAULT_SNAPSHOT);
  const onTalkRef = useRef(onTalk);
  const onSoundRejectedRef = useRef(onSoundRejected);
  onTalkRef.current = onTalk;
  onSoundRejectedRef.current = onSoundRejected;

  useEffect(() => {
    if (!stageRef.current || !videoARef.current || !videoBRef.current) return;
    const controller = new HeroPerformanceController(
      [videoARef.current, videoBRef.current],
      stageRef.current,
      reducedMotion,
      {
        onSnapshot: setSnapshot,
        onProgress: (value) => {
          if (progressRef.current) {
            progressRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, value))})`;
          }
        },
        onTalk: () => onTalkRef.current(),
        onSoundRejected: () => onSoundRejectedRef.current(),
      },
    );
    controllerRef.current = controller;
    controller.setSound(soundOn);
    return () => {
      controller.dispose();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    controllerRef.current?.setSound(soundOn);
  }, [soundOn]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) controllerRef.current?.pause();
      else controllerRef.current?.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const start = useCallback(async () => {
    await delay(reducedMotion ? 120 : 260);
    await controllerRef.current?.start();
  }, [reducedMotion]);

  const request = useCallback((key: ClipKey, options: PlaybackOptions = {}) => {
    return controllerRef.current?.request(key, options) ?? Promise.resolve(false);
  }, []);

  const playRandom = useCallback(() => {
    const options: ClipKey[] = ["reactKey", "vanish", "portal", "tease"];
    return request(options[Math.floor(Math.random() * options.length)]);
  }, [request]);

  const waitUntilReady = useCallback(() => {
    return controllerRef.current?.waitUntilReady() ?? Promise.resolve(false);
  }, []);

  const waitUntilEnded = useCallback((key: ClipKey) => {
    return controllerRef.current?.waitUntilEnded(key) ?? Promise.resolve(false);
  }, []);

  const setHeroVisible = useCallback((visible: boolean) => {
    controllerRef.current?.setHeroVisible(visible);
  }, []);

  const suppressNextWelcome = useCallback(() => {
    controllerRef.current?.suppressNextWelcome();
  }, []);

  return {
    stageRef,
    videoARef,
    videoBRef,
    progressRef,
    snapshot,
    start,
    request,
    playRandom,
    waitUntilReady,
    waitUntilEnded,
    setHeroVisible,
    suppressNextWelcome,
  };
}
