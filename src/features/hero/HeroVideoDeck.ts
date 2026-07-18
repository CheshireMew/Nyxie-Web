import { heroMedia } from "../../content/mediaCatalog";
import type { ClipKey } from "../../content/mediaCatalog";

const TRANSITION = {
  defocus: 180,
  refocus: 260,
  blur: 14,
};

type DeckCallbacks = {
  onTimeUpdate: (player: HTMLVideoElement) => void;
  onEnded: (player: HTMLVideoElement) => void;
};

export class HeroVideoDeck {
  private activeIndex = -1;
  private disposed = false;
  private readonly loadIds = new WeakMap<HTMLVideoElement, number>();
  private readonly animations = new Set<Animation>();
  private readonly timeUpdateHandlers: Array<() => void>;
  private readonly endedHandlers: Array<() => void>;

  constructor(
    private readonly players: [HTMLVideoElement, HTMLVideoElement],
    private readonly stage: HTMLElement,
    callbacks: DeckCallbacks,
  ) {
    this.timeUpdateHandlers = players.map((player) => () => callbacks.onTimeUpdate(player));
    this.endedHandlers = players.map((player) => () => callbacks.onEnded(player));
    players.forEach((player, index) => {
      player.addEventListener("timeupdate", this.timeUpdateHandlers[index]);
      player.addEventListener("ended", this.endedHandlers[index]);
    });
  }

  get currentPlayer() {
    return this.activeIndex < 0 ? null : this.players[this.activeIndex];
  }

  get currentPlayerEnded() {
    return Boolean(this.currentPlayer?.ended);
  }

  isActive(player: HTMLVideoElement) {
    return player === this.currentPlayer;
  }

  async preload(key: ClipKey) {
    return this.loadPlayer(this.standbyPlayer, key);
  }

  async activate(key: ClipKey, initial = false) {
    if (this.disposed) return false;
    const previous = this.currentPlayer;
    const nextIndex = this.activeIndex < 0 ? 0 : 1 - this.activeIndex;
    const next = this.players[nextIndex];
    const ready = await this.loadPlayer(next, key);
    if (!ready || this.disposed) return false;

    const playbackRate = heroMedia.clips[key].playbackRate;
    const playing = previous && !initial
      ? await this.transitionPlayers(previous, next, playbackRate)
      : await this.startPlayer(next, playbackRate);
    if (!playing || this.disposed) {
      next.pause();
      return false;
    }

    if (!previous || initial) next.classList.add("is-visible");
    this.activeIndex = nextIndex;
    return true;
  }

  pause() {
    this.currentPlayer?.pause();
  }

  resume() {
    return this.currentPlayer?.play().then(() => true).catch(() => false) ?? Promise.resolve(false);
  }

  waitUntilEnded(timeout = 9500) {
    return new Promise<boolean>((resolve) => {
      const player = this.currentPlayer;
      if (!player) {
        resolve(false);
        return;
      }

      let settled = false;
      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        player.removeEventListener("ended", onEnded);
        resolve(result && this.currentPlayer === player);
      };
      const onEnded = () => finish(true);
      const timer = window.setTimeout(() => finish(false), timeout);
      player.addEventListener("ended", onEnded, { once: true });
    });
  }

  dispose() {
    this.disposed = true;
    this.animations.forEach((animation) => animation.cancel());
    this.animations.clear();
    this.players.forEach((player, index) => {
      player.pause();
      player.classList.remove("is-visible");
      player.removeAttribute("src");
      player.removeAttribute("data-clip");
      player.load();
      player.removeEventListener("timeupdate", this.timeUpdateHandlers[index]);
      player.removeEventListener("ended", this.endedHandlers[index]);
    });
  }

  private get standbyPlayer() {
    return this.activeIndex < 0 ? this.players[0] : this.players[1 - this.activeIndex];
  }

  private trackAnimation(animation: Animation) {
    this.animations.add(animation);
    return animation;
  }

  private releaseAnimation(animation: Animation) {
    this.animations.delete(animation);
    animation.cancel();
  }

  private async loadPlayer(player: HTMLVideoElement, key: ClipKey) {
    if (player.dataset.clip === key && player.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return true;

    const loadId = (this.loadIds.get(player) ?? 0) + 1;
    this.loadIds.set(player, loadId);
    player.pause();
    player.defaultPlaybackRate = heroMedia.clips[key].playbackRate;
    player.playbackRate = heroMedia.clips[key].playbackRate;
    player.defaultMuted = true;
    player.muted = true;
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

  private async startPlayer(player: HTMLVideoElement, playbackRate: number) {
    player.currentTime = 0;
    player.playbackRate = playbackRate;
    player.defaultMuted = true;
    player.muted = true;
    try {
      await player.play();
      return true;
    } catch {
      return false;
    }
  }

  private async transitionPlayers(previous: HTMLVideoElement, next: HTMLVideoElement, playbackRate: number) {
    const defocus = this.trackAnimation(this.stage.animate(
      [
        { filter: "blur(0px) brightness(1)" },
        { filter: `blur(${TRANSITION.blur}px) brightness(1.025)` },
      ],
      { duration: TRANSITION.defocus, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "both" },
    ));
    await Promise.allSettled([defocus.finished]);
    if (this.disposed) {
      this.releaseAnimation(defocus);
      return false;
    }

    previous.pause();
    previous.classList.remove("is-visible");
    const playing = await this.startPlayer(next, playbackRate);
    if (!playing) {
      previous.classList.add("is-visible");
      void previous.play().catch(() => undefined);
    } else {
      next.classList.add("is-visible");
    }

    const refocus = this.trackAnimation(this.stage.animate(
      [
        { filter: `blur(${TRANSITION.blur}px) brightness(1.025)` },
        { filter: "blur(0px) brightness(1)" },
      ],
      { duration: TRANSITION.refocus, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" },
    ));
    this.releaseAnimation(defocus);
    await Promise.allSettled([refocus.finished]);
    this.releaseAnimation(refocus);
    return playing && !this.disposed;
  }
}
