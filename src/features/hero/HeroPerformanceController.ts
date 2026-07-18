import { heroMedia } from "../../content/mediaCatalog";
import type { ClipDefinition, ClipKey } from "../../content/mediaCatalog";
import { HeroVideoDeck } from "./HeroVideoDeck";
import { chooseNextHeroClip } from "./heroSequence";
import { DEFAULT_PERFORMANCE_SNAPSHOT } from "./types";
import type { PerformancePhase, PerformanceSnapshot, PlaybackOptions } from "./types";

type ControllerCallbacks = {
  onSnapshot: (snapshot: PerformanceSnapshot) => void;
  onProgress: (value: number) => void;
  onTalk: () => void;
};

export class HeroPerformanceController {
  private readonly deck: HeroVideoDeck;
  private currentKey: ClipKey | null = null;
  private currentAfter: "talk" | null = null;
  private currentLockedUntilEnd = false;
  private lockedRequestPending = false;
  private plannedKey: ClipKey | null = null;
  private plannedPromise: Promise<boolean> | null = null;
  private transitioning = false;
  private started = false;
  private startRequested = false;
  private disposed = false;
  private phase: PerformancePhase = "idle";
  private error: string | null = null;
  private failedRequest: { key: ClipKey; options: PlaybackOptions } | null = null;
  private heroVisible = true;
  private hasLeftHero = false;
  private suppressWelcome = false;
  private lastAmbientAction: ClipKey | null = null;
  private welcomeTimer = 0;
  private requestSequence = 0;

  constructor(
    players: [HTMLVideoElement, HTMLVideoElement],
    stage: HTMLElement,
    private readonly reducedMotion: boolean,
    private readonly callbacks: ControllerCallbacks,
  ) {
    this.deck = new HeroVideoDeck(players, stage, {
      onTimeUpdate: (player) => this.onTimeUpdate(player),
      onEnded: (player) => this.onEnded(player),
    });
  }

  isInteractionLocked() {
    return this.lockedRequestPending || this.isCurrentClipLocked();
  }

  async start() {
    if (this.started || this.reducedMotion || this.disposed) return this.started;
    this.startRequested = true;
    if (!this.heroVisible) return false;
    this.started = true;
    this.phase = "loading";
    this.error = null;
    this.emit();
    const started = await this.switchTo("idleMain", { initial: true });
    if (!started) {
      this.started = false;
      this.phase = "error";
      this.error = "角色视频加载失败，点击重试";
      this.emit();
    }
    return started;
  }

  async request(key: ClipKey, options: PlaybackOptions = {}) {
    if (!this.started && !await this.start()) return false;
    const requestsLock = Boolean(options.lockUntilEnd);
    if (this.isCurrentClipLocked() || this.lockedRequestPending) return false;
    if (requestsLock) {
      this.lockedRequestPending = true;
      this.emit();
    }

    const requestId = ++this.requestSequence;
    try {
      const startedAt = performance.now();
      while (this.transitioning && !this.disposed && performance.now() - startedAt < 2500) {
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      }
      if (this.disposed || this.transitioning || requestId !== this.requestSequence) return false;
      return await this.switchTo(key, options);
    } finally {
      if (requestsLock) {
        this.lockedRequestPending = false;
        this.emit();
      }
    }
  }

  async retry() {
    if (!this.started) return this.start();
    const failedRequest = this.failedRequest;
    if (!failedRequest) return true;
    return this.request(failedRequest.key, failedRequest.options);
  }

  async waitUntilEnded(key: ClipKey, timeout = 9500) {
    if (this.currentKey !== key || !this.deck.currentPlayer) return false;
    const ended = await this.deck.waitUntilEnded(timeout);
    return ended && this.currentKey === key;
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
    if (this.startRequested && !this.started && this.phase !== "error") void this.start();
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
    this.deck.pause();
  }

  resume() {
    if (
      !this.started
      || !this.deck.currentPlayer
      || document.hidden
      || !this.heroVisible
      || (this.currentLockedUntilEnd && this.deck.currentPlayerEnded)
    ) return;
    void this.deck.resume();
  }

  dispose() {
    this.disposed = true;
    this.requestSequence += 1;
    window.clearTimeout(this.welcomeTimer);
    this.deck.dispose();
  }

  private isCurrentClipLocked() {
    return Boolean(this.currentLockedUntilEnd && this.deck.currentPlayer && !this.deck.currentPlayerEnded);
  }

  private emit(clip?: ClipDefinition) {
    if (this.disposed) return;
    const currentClip = clip ?? (this.currentKey ? heroMedia.clips[this.currentKey] : undefined);
    this.callbacks.onSnapshot({
      ...DEFAULT_PERFORMANCE_SNAPSHOT,
      status: this.error ? "VIDEO COULD NOT OPEN" : currentClip?.label ?? DEFAULT_PERFORMANCE_SNAPSHOT.status,
      counter: this.error ? "RETRY / —" : currentClip?.counter ?? DEFAULT_PERFORMANCE_SNAPSHOT.counter,
      activeAction: currentClip?.kind === "action" ? this.currentKey : null,
      currentKey: this.currentKey,
      started: this.started,
      phase: this.phase,
      interactionLocked: this.isInteractionLocked(),
      error: this.error,
    });
  }

  private planFollowingClip() {
    if (!this.currentKey || !this.deck.currentPlayer) return;
    const step = chooseNextHeroClip(this.currentKey, this.lastAmbientAction);
    this.lastAmbientAction = step.lastAmbientAction;
    this.plannedKey = step.nextKey;
    this.plannedPromise = this.deck.preload(step.nextKey);
  }

  private chooseFollowingClip() {
    if (this.plannedKey) return this.plannedKey;
    const step = chooseNextHeroClip(this.currentKey ?? "idleMain", this.lastAmbientAction);
    this.lastAmbientAction = step.lastAmbientAction;
    return step.nextKey;
  }

  private async switchTo(key: ClipKey, options: PlaybackOptions = {}) {
    const clip = heroMedia.clips[key];
    if (
      this.disposed
      || this.reducedMotion
      || this.transitioning
      || this.isCurrentClipLocked()
      || (this.lockedRequestPending && !options.lockUntilEnd)
    ) return false;

    this.transitioning = true;
    this.phase = "loading";
    this.error = null;
    this.emit();
    const playing = await this.deck.activate(key, Boolean(options.initial));
    if (!playing || this.disposed) {
      this.transitioning = false;
      if (!this.disposed && !options.initial) {
        this.deck.pause();
        this.phase = "error";
        this.error = "动作视频加载或播放失败，点击重试";
        this.failedRequest = { key, options };
        this.emit();
      }
      return false;
    }

    this.currentKey = key;
    this.currentAfter = options.after ?? null;
    this.currentLockedUntilEnd = Boolean(options.lockUntilEnd);
    this.plannedKey = null;
    this.plannedPromise = null;
    this.phase = "playing";
    this.error = null;
    this.failedRequest = null;
    this.callbacks.onProgress(0);
    this.emit(clip);
    this.transitioning = false;
    return true;
  }

  private async advance() {
    if (
      this.disposed
      || this.transitioning
      || this.currentLockedUntilEnd
      || this.lockedRequestPending
      || !this.currentKey
      || !this.heroVisible
      || document.hidden
    ) return;

    const completedAfter = this.currentAfter;
    const nextKey = this.chooseFollowingClip();
    if (this.plannedPromise && this.plannedKey === nextKey) await this.plannedPromise;
    const switched = await this.switchTo(nextKey);
    if (switched && completedAfter === "talk") this.callbacks.onTalk();
  }

  private onTimeUpdate(player: HTMLVideoElement) {
    if (!this.deck.isActive(player) || this.transitioning || this.phase !== "playing" || !this.currentKey) return;
    if (!Number.isFinite(player.duration) || player.duration <= 0) return;
    this.callbacks.onProgress(player.currentTime / player.duration);
    const remaining = player.duration - player.currentTime;
    const clip = heroMedia.clips[this.currentKey];
    if (!this.currentLockedUntilEnd && !this.plannedPromise && remaining <= Math.max(clip.switchLead + 0.7, 2.2)) {
      this.planFollowingClip();
    }
    if (remaining <= clip.switchLead) void this.advance();
  }

  private onEnded(player: HTMLVideoElement) {
    if (!this.deck.isActive(player) || this.transitioning) return;
    if (this.currentLockedUntilEnd) {
      this.currentLockedUntilEnd = false;
      this.emit();
      return;
    }
    void this.advance();
  }
}
