const clips = {
  idleMain: {
    src: "assets/media/idle-main.mp4",
    label: "IDLE PERFORMANCE",
    counter: "IDLE / 01",
    switchLead: 0.62,
    kind: "idle",
  },
  idleKey: {
    src: "assets/media/idle-key.mp4",
    label: "GOLDEN KEY",
    counter: "IDLE / 02",
    switchLead: 0.48,
    kind: "idle",
  },
  reactKey: {
    src: "assets/media/react-key.mp4",
    label: "KEY INCOMING",
    counter: "ACTION / 01",
    switchLead: 0.5,
    kind: "action",
  },
  vanish: {
    src: "assets/media/vanish.mp4",
    label: "CHESHIRE VANISH",
    counter: "ACTION / 02",
    switchLead: 0.5,
    kind: "action",
  },
  portal: {
    src: "assets/media/portal.mp4",
    label: "OPENING WRONG DOOR",
    counter: "ACTION / 03",
    switchLead: 0.5,
    releaseAt: 3.35,
    kind: "action",
  },
  tease: {
    src: "assets/media/tease.mp4",
    label: "COME CLOSER",
    counter: "ACTION / 04",
    switchLead: 0.5,
    kind: "action",
  },
};

const hero = document.querySelector("#home");
const heroMedia = document.querySelector(".hero-media");
const videos = [document.querySelector("#heroVideoA"), document.querySelector("#heroVideoB")];
const clipStatus = document.querySelector("#clipStatus");
const clipCounter = document.querySelector("#clipCounter");
const clipProgress = document.querySelector("#clipProgress");
const soundToggle = document.querySelector("#soundToggle");
const header = document.querySelector("#siteHeader");
const indexDialog = document.querySelector("#indexDialog");
const talkPanel = document.querySelector("#talkPanel");
const talkScrim = document.querySelector("#talkScrim");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const transitionTiming = {
  defocus: 180,
  refocus: 260,
  blur: 14,
};

let soundOn = false;
let heroVisible = true;
let suppressHeroWelcome = false;

const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function updateStatus(label = "NYXIE IS WATCHING", counter = "READY / 00") {
  clipStatus.textContent = label;
  clipCounter.textContent = counter;
}

function setActiveAction(key = null) {
  document.querySelectorAll("[data-play]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.play === key);
  });
}

function setClipProgress(value = 0) {
  clipProgress.style.transform = `scaleX(${Math.max(0, Math.min(1, value))})`;
}

class PerformanceDirector {
  constructor(players) {
    this.players = players;
    this.activeIndex = -1;
    this.currentKey = null;
    this.currentAfter = null;
    this.plannedKey = null;
    this.plannedPromise = null;
    this.transitioning = false;
    this.started = false;
    this.lastAmbientAction = null;

    this.players.forEach((player) => {
      player.addEventListener("timeupdate", () => this.onTimeUpdate(player));
      player.addEventListener("ended", () => this.onEnded(player));
    });
  }

  get activePlayer() {
    return this.activeIndex < 0 ? null : this.players[this.activeIndex];
  }

  get standbyPlayer() {
    if (this.activeIndex < 0) return this.players[0];
    return this.players[1 - this.activeIndex];
  }

  async loadPlayer(player, key) {
    if (player.dataset.clip === key && player.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      return true;
    }

    const loadId = Number(player.dataset.loadId || 0) + 1;
    player.dataset.loadId = String(loadId);
    player.pause();
    player.playbackRate = 1;
    player.muted = !soundOn;
    player.dataset.clip = key;
    player.src = clips[key].src;
    player.load();

    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => finish(false), 9000);
      const onReady = () => finish(true);
      const onError = () => finish(false);

      const finish = (result) => {
        window.clearTimeout(timeout);
        player.removeEventListener("loadeddata", onReady);
        player.removeEventListener("error", onError);
        const currentLoad = Number(player.dataset.loadId) === loadId && player.dataset.clip === key;
        if (result && currentLoad) player.currentTime = 0;
        resolve(result && currentLoad);
      };

      player.addEventListener("loadeddata", onReady, { once: true });
      player.addEventListener("error", onError, { once: true });
    });
  }

  async startPlayer(player, playbackRate = 1) {
    player.currentTime = 0;
    player.playbackRate = playbackRate;
    player.muted = !soundOn;
    try {
      await player.play();
      return true;
    } catch {
      soundOn = false;
      this.players.forEach((item) => { item.muted = true; });
      syncSoundButton();
      try {
        await player.play();
        return true;
      } catch {
        return false;
      }
    }
  }

  chooseAmbientAction() {
    const actions = ["reactKey", "vanish", "tease"].filter((key) => key !== this.lastAmbientAction);
    const key = actions[Math.floor(Math.random() * actions.length)];
    this.lastAmbientAction = key;
    return key;
  }

  chooseNextAfter(key) {
    if (key === "idleMain") return "idleKey";
    if (key === "idleKey") return this.chooseAmbientAction();
    return "idleMain";
  }

  prepareNext() {
    if (!this.currentKey || this.activeIndex < 0) return;
    this.plannedKey = this.chooseNextAfter(this.currentKey);
    this.plannedPromise = this.loadPlayer(this.standbyPlayer, this.plannedKey);
  }

  async transitionPlayers(previous, next, playbackRate) {
    const defocusTiming = {
      duration: transitionTiming.defocus,
      easing: "cubic-bezier(0.4, 0, 1, 1)",
      fill: "both",
    };
    const defocus = heroMedia.animate(
      [
        { filter: "blur(0px) brightness(1)" },
        { filter: `blur(${transitionTiming.blur}px) brightness(1.025)` },
      ],
      defocusTiming
    );

    await Promise.allSettled([defocus.finished]);

    previous.pause();
    previous.classList.remove("is-visible");
    const playing = await this.startPlayer(next, playbackRate);
    if (!playing) {
      previous.classList.add("is-visible");
      previous.play().catch(() => {});
      const restore = heroMedia.animate(
        [
          { filter: `blur(${transitionTiming.blur}px) brightness(1.025)` },
          { filter: "blur(0px) brightness(1)" },
        ],
        {
          duration: transitionTiming.refocus,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        }
      );
      defocus.cancel();
      await Promise.allSettled([restore.finished]);
      restore.cancel();
      return false;
    }

    next.classList.add("is-visible");
    previous.playbackRate = 1;

    const refocusTiming = {
      duration: transitionTiming.refocus,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    };
    const refocus = heroMedia.animate(
      [
        { filter: `blur(${transitionTiming.blur}px) brightness(1.025)` },
        { filter: "blur(0px) brightness(1)" },
      ],
      refocusTiming
    );

    defocus.cancel();
    await Promise.allSettled([refocus.finished]);
    refocus.cancel();
    return true;
  }

  async switchTo(key, options = {}) {
    const clip = clips[key];
    if (!clip || reduceMotion || this.transitioning) return false;

    this.transitioning = true;
    const previous = this.activePlayer;
    const nextIndex = this.activeIndex < 0 ? 0 : 1 - this.activeIndex;
    const next = this.players[nextIndex];
    const ready = await this.loadPlayer(next, key);

    if (!ready) {
      this.transitioning = false;
      return false;
    }

    const playbackRate = options.playbackRate || 1;
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
    this.currentAfter = options.after || null;
    this.plannedKey = null;
    this.plannedPromise = null;
    setActiveAction(clip.kind === "action" ? key : null);
    setClipProgress();
    updateStatus(clip.label, clip.counter);

    this.transitioning = false;
    this.prepareNext();
    return true;
  }

  async advance() {
    if (this.transitioning || !this.currentKey || !heroVisible || document.hidden) return;
    const completedAfter = this.currentAfter;
    const nextKey = this.plannedKey || this.chooseNextAfter(this.currentKey);
    const switched = await this.switchTo(nextKey, { natural: true, reason: "timeline" });
    if (switched && completedAfter === "talk") openTalk();
  }

  request(key, options = {}) {
    return this.switchTo(key, { ...options, reason: options.reason || "manual" });
  }

  waitUntilReady(timeout = 9500) {
    return new Promise((resolve) => {
      const startedAt = performance.now();
      const check = () => {
        if (!this.transitioning) {
          resolve(true);
          return;
        }
        if (performance.now() - startedAt >= timeout) {
          resolve(false);
          return;
        }
        window.requestAnimationFrame(check);
      };
      check();
    });
  }

  onTimeUpdate(player) {
    if (player !== this.activePlayer || this.transitioning || !this.currentKey) return;
    if (!Number.isFinite(player.duration) || player.duration <= 0) return;
    setClipProgress(player.currentTime / player.duration);
    if (player.duration - player.currentTime <= clips[this.currentKey].switchLead) {
      this.advance();
    }
  }

  onEnded(player) {
    if (player === this.activePlayer && !this.transitioning) this.advance();
  }

  pause() {
    this.activePlayer?.pause();
  }

  resume() {
    if (!this.started || !this.activePlayer || document.hidden || !heroVisible) return;
    this.activePlayer.play().catch(() => {});
  }

  setMuted(muted) {
    this.players.forEach((player) => { player.muted = muted; });
  }

  waitUntil(key, targetTime, timeout = 6000) {
    return new Promise((resolve) => {
      const startedAt = performance.now();
      const check = () => {
        if (this.currentKey !== key) {
          resolve(false);
          return;
        }
        if (this.activePlayer?.currentTime >= targetTime) {
          resolve(true);
          return;
        }
        if (performance.now() - startedAt >= timeout) {
          resolve(false);
          return;
        }
        window.requestAnimationFrame(check);
      };
      check();
    });
  }

  async start() {
    if (this.started || reduceMotion) return;
    this.started = true;
    const started = await this.switchTo("idleMain", { initial: true, reason: "boot" });
    if (!started) {
      this.started = false;
      updateStatus("VIDEO COULD NOT OPEN", "RETRY / —");
    }
  }
}

const director = new PerformanceDirector(videos);

function syncSoundButton() {
  soundToggle.setAttribute("aria-pressed", String(soundOn));
  soundToggle.lastElementChild.textContent = soundOn ? "SOUND ON" : "SOUND OFF";
  director.setMuted(!soundOn);
}

soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  syncSoundButton();
  if (soundOn && director.activePlayer?.paused) {
    director.resume();
  }
});

function openTalk() {
  closeIndex();
  talkPanel.classList.add("is-open");
  talkPanel.setAttribute("aria-hidden", "false");
  talkScrim.classList.add("is-open");
  talkScrim.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeTalk() {
  talkPanel.classList.remove("is-open");
  talkPanel.setAttribute("aria-hidden", "true");
  talkScrim.classList.remove("is-open");
  talkScrim.setAttribute("aria-hidden", "true");
  if (!indexDialog.open) document.body.classList.remove("no-scroll");
}

function openIndex() {
  closeTalk();
  if (!indexDialog.open) indexDialog.showModal();
  document.body.classList.add("no-scroll");
}

function closeIndex() {
  if (indexDialog.open) indexDialog.close();
  if (!talkPanel.classList.contains("is-open")) document.body.classList.remove("no-scroll");
}

function scrollToTarget(selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  closeIndex();
  closeTalk();
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

document.addEventListener("click", (event) => {
  const anchor = event.target.closest('a[href^="#"]');
  if (anchor && anchor.hash) {
    event.preventDefault();
    scrollToTarget(anchor.hash);
    return;
  }

  const openIndexButton = event.target.closest("[data-open-index]");
  if (openIndexButton) {
    openIndex();
    return;
  }

  if (event.target.closest("[data-close-index]")) {
    closeIndex();
    return;
  }

  const scrollButton = event.target.closest("[data-scroll]");
  if (scrollButton) {
    scrollToTarget(scrollButton.dataset.scroll);
  }

  if (event.target.closest("[data-close-talk]")) {
    closeTalk();
  }

  const playButton = event.target.closest("[data-play]");
  if (!playButton) return;

  const run = () => director.request(playButton.dataset.play, { after: playButton.dataset.after });
  if (playButton.hasAttribute("data-return-home")) {
    suppressHeroWelcome = !heroVisible;
    scrollToTarget("#home");
    window.setTimeout(run, reduceMotion ? 40 : 650);
  } else {
    run();
  }
});

talkScrim.addEventListener("click", closeTalk);

indexDialog.addEventListener("click", (event) => {
  if (event.target === indexDialog) closeIndex();
});

indexDialog.addEventListener("close", () => {
  if (!talkPanel.classList.contains("is-open")) document.body.classList.remove("no-scroll");
});

function playRandomAction() {
  const options = ["reactKey", "vanish", "portal", "tease"];
  const key = options[Math.floor(Math.random() * options.length)];
  director.request(key, { reason: "play-mad" });
}

document.querySelector("#randomPlay").addEventListener("click", playRandomAction);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeTalk();
  closeIndex();
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const sections = [...document.querySelectorAll("main > section[id]")];
const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];

function updatePageState() {
  header.classList.toggle("is-compact", window.scrollY > 32);
  const marker = window.scrollY + window.innerHeight * 0.36;
  let activeSection = sections[0]?.id;
  sections.forEach((section) => {
    if (section.offsetTop <= marker) activeSection = section.id;
  });
  navLinks.forEach((link) => link.classList.toggle("is-active", link.hash === `#${activeSection}`));
}

window.addEventListener("scroll", updatePageState, { passive: true });
updatePageState();

let portalScrollUsed = false;
let portalScrollLocked = false;
let touchStartY = 0;

function beginPortalScroll() {
  if (
    portalScrollUsed ||
    portalScrollLocked ||
    reduceMotion ||
    !director.started ||
    window.scrollY > 4 ||
    indexDialog.open ||
    talkPanel.classList.contains("is-open")
  ) {
    return false;
  }

  portalScrollUsed = true;
  portalScrollLocked = true;
  (async () => {
    try {
      await director.waitUntilReady();
      const started = await director.request("portal", { reason: "first-scroll", playbackRate: 1.25 });
      if (started) await director.waitUntil("portal", clips.portal.releaseAt, 5200);
      document.querySelector("#profile").scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      portalScrollLocked = false;
    }
  })();
  return true;
}

window.addEventListener(
  "wheel",
  (event) => {
    if (portalScrollLocked) {
      event.preventDefault();
      return;
    }
    if (event.deltaY > 28 && beginPortalScroll()) event.preventDefault();
  },
  { passive: false }
);

window.addEventListener(
  "touchstart",
  (event) => {
    touchStartY = event.touches[0]?.clientY || 0;
  },
  { passive: true }
);

window.addEventListener(
  "touchmove",
  (event) => {
    if (portalScrollLocked) {
      event.preventDefault();
      return;
    }
    const currentY = event.touches[0]?.clientY || touchStartY;
    if (touchStartY - currentY > 46 && beginPortalScroll()) event.preventDefault();
  },
  { passive: false }
);

let hasLeftHero = false;

const heroObserver = new IntersectionObserver(
  ([entry]) => {
    const wasVisible = heroVisible;
    heroVisible = entry.isIntersecting;
    if (!heroVisible) {
      if (wasVisible) hasLeftHero = true;
      director.pause();
      return;
    }

    director.resume();
    if (hasLeftHero) {
      hasLeftHero = false;
      if (suppressHeroWelcome) {
        suppressHeroWelcome = false;
        return;
      }
      window.setTimeout(() => {
        if (heroVisible && !document.hidden) director.request("tease", { reason: "return-home" });
      }, 320);
    }
  },
  { threshold: 0.24 }
);
heroObserver.observe(hero);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    director.pause();
  } else {
    director.resume();
  }
});

function setupTilt() {
  if (reduceMotion || window.matchMedia("(pointer: coarse)").matches) return;

  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${y * -6}deg) rotateY(${x * 7}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });

  document.querySelectorAll(".magnetic").forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const bounds = button.getBoundingClientRect();
      const x = event.clientX - bounds.left - bounds.width / 2;
      const y = event.clientY - bounds.top - bounds.height / 2;
      button.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
    });
    button.addEventListener("pointerleave", () => {
      button.style.transform = "";
    });
  });
}

function setupCursor() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  let pointerX = -100;
  let pointerY = -100;
  let ringX = -100;
  let ringY = -100;

  window.addEventListener("pointermove", (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    dot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
  });

  document.querySelectorAll("a, button, [data-tilt]").forEach((element) => {
    element.addEventListener("pointerenter", () => document.body.classList.add("cursor-active"));
    element.addEventListener("pointerleave", () => document.body.classList.remove("cursor-active"));
  });

  function animateRing() {
    ringX += (pointerX - ringX) * 0.16;
    ringY += (pointerY - ringY) * 0.16;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    window.requestAnimationFrame(animateRing);
  }
  animateRing();
}

function setupAmbientCanvas() {
  if (reduceMotion) return;
  const canvas = document.querySelector("#ambientCanvas");
  const context = canvas.getContext("2d");
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let particles = [];
  let width = 0;
  let height = 0;
  let ratio = 1;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(52, Math.max(22, Math.round(width / 32)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.7 + 0.4,
      speed: Math.random() * 0.22 + 0.06,
      drift: (Math.random() - 0.5) * 0.18,
      color: index % 11 === 0 ? "180,137,67" : index % 17 === 0 ? "201,31,60" : "95,125,148",
    }));
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });

  function draw() {
    context.clearRect(0, 0, width, height);
    particles.forEach((particle) => {
      particle.y -= particle.speed;
      particle.x += particle.drift + (pointer.x - width / 2) * 0.00003;
      if (particle.y < -8) particle.y = height + 8;
      if (particle.x < -8) particle.x = width + 8;
      if (particle.x > width + 8) particle.x = -8;
      context.beginPath();
      context.fillStyle = `rgba(${particle.color},0.42)`;
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
    });
    window.requestAnimationFrame(draw);
  }

  resize();
  draw();
}

setupTilt();
setupCursor();
setupAmbientCanvas();
syncSoundButton();

window.addEventListener("load", async () => {
  const minimumBoot = delay(reduceMotion ? 150 : 900);
  await Promise.all([minimumBoot, director.start()]);
  document.querySelector(".boot-screen").classList.add("is-done");
});
