const clips = {
  idleMain: {
    src: "assets/media/idle-main.mp4",
    label: "IDLE PERFORMANCE",
    counter: "IDLE / 01",
    cover: "tail",
    fade: 0.62,
  },
  idleKey: {
    src: "assets/media/idle-key.mp4",
    label: "GOLDEN KEY",
    counter: "IDLE / 02",
    cover: "tail",
    fade: 0.4,
  },
  reactKey: {
    src: "assets/media/react-key.mp4",
    label: "KEY INCOMING",
    counter: "ACTION / 01",
    cover: "flash",
    fade: 0.5,
  },
  vanish: {
    src: "assets/media/vanish.mp4",
    label: "CHESHIRE VANISH",
    counter: "ACTION / 02",
    cover: "smoke",
    fade: 0.46,
  },
  portal: {
    src: "assets/media/portal.mp4",
    label: "OPENING WRONG DOOR",
    counter: "ACTION / 03",
    cover: "portal",
    fade: 0.45,
  },
  tease: {
    src: "assets/media/tease.mp4",
    label: "COME CLOSER",
    counter: "ACTION / 04",
    cover: "tail",
    fade: 0.45,
  },
};

const hero = document.querySelector("#home");
const video = document.querySelector("#heroVideo");
const transition = document.querySelector("#transitionLayer");
const clipStatus = document.querySelector("#clipStatus");
const clipCounter = document.querySelector("#clipCounter");
const clipProgress = document.querySelector("#clipProgress");
const soundToggle = document.querySelector("#soundToggle");
const header = document.querySelector("#siteHeader");
const indexDialog = document.querySelector("#indexDialog");
const talkPanel = document.querySelector("#talkPanel");
const talkScrim = document.querySelector("#talkScrim");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let currentClip = null;
let currentAfter = null;
let playToken = 0;
let transitionStarted = false;
let soundOn = false;
let heroVisible = true;
let nextIdle = "idleMain";
let idleTimer = 0;

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

function setTransition(mode, active) {
  transition.dataset.mode = mode;
  transition.classList.toggle("is-active", active);
  if (!active) {
    transition.removeAttribute("data-mode");
  }
}

function clearIdleTimer() {
  window.clearTimeout(idleTimer);
  idleTimer = 0;
}

function canIdle() {
  return heroVisible && !indexDialog.open && !talkPanel.classList.contains("is-open") && !document.hidden;
}

function scheduleIdle(wait = 3400) {
  clearIdleTimer();
  if (reduceMotion || !canIdle()) return;

  idleTimer = window.setTimeout(() => {
    const key = nextIdle;
    nextIdle = key === "idleMain" ? "idleKey" : "idleMain";
    playClip(key, { automatic: true });
  }, wait);
}

function waitForVideo(token) {
  return new Promise((resolve) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      resolve(token === playToken);
      return;
    }

    const onReady = () => finish(true);
    const onError = () => finish(false);
    const timeout = window.setTimeout(() => finish(false), 8000);

    function finish(result) {
      window.clearTimeout(timeout);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
      resolve(result && token === playToken);
    }

    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function resetToAnchor({ runAfter = true, schedule = true, token = playToken } = {}) {
  if (token !== playToken) return;
  const completedAfter = currentAfter;
  currentAfter = null;
  currentClip = null;
  transitionStarted = false;
  setActiveAction();
  setClipProgress();
  video.pause();
  video.classList.remove("is-visible");
  await delay(260);
  if (token !== playToken) return;
  video.removeAttribute("src");
  video.removeAttribute("data-play-token");
  video.load();
  await delay(220);
  if (token !== playToken) return;
  setTransition("tail", false);
  updateStatus();

  if (runAfter && completedAfter === "talk") {
    openTalk();
  }
  if (schedule) scheduleIdle(6000);
}

async function playClip(key, options = {}) {
  const clip = clips[key];
  if (!clip) return;

  clearIdleTimer();
  const token = ++playToken;

  if (currentClip) {
    setTransition(clip.cover, true);
    video.classList.remove("is-visible");
    video.pause();
    await delay(220);
    if (token !== playToken) return;
  }

  currentClip = key;
  currentAfter = options.after || null;
  transitionStarted = false;
  setActiveAction(key);
  setClipProgress();
  updateStatus(clip.label, clip.counter);
  video.classList.remove("is-visible");
  video.muted = !soundOn;
  video.dataset.playToken = String(token);
  video.src = clip.src;
  video.load();

  const ready = await waitForVideo(token);
  if (!ready) {
    if (token === playToken) {
      updateStatus("VIDEO COULD NOT OPEN", "RETRY / —");
      await resetToAnchor({ runAfter: false });
    }
    return;
  }

  video.currentTime = 0;
  try {
    await video.play();
  } catch {
    video.muted = true;
    soundOn = false;
    syncSoundButton();
    try {
      await video.play();
    } catch {
      await resetToAnchor({ runAfter: false });
      return;
    }
  }

  if (token !== playToken) return;
  window.requestAnimationFrame(() => {
    setTransition(clip.cover, false);
    video.classList.add("is-visible");
  });
}

video.addEventListener("timeupdate", () => {
  if (!currentClip || transitionStarted || !Number.isFinite(video.duration)) return;
  const clip = clips[currentClip];
  setClipProgress(video.currentTime / video.duration);
  if (video.duration - video.currentTime <= clip.fade) {
    transitionStarted = true;
    setTransition(clip.cover, true);
    video.classList.remove("is-visible");
  }
});

video.addEventListener("ended", () => {
  const token = Number(video.dataset.playToken);
  if (token === playToken) resetToAnchor({ token });
});

function syncSoundButton() {
  soundToggle.setAttribute("aria-pressed", String(soundOn));
  soundToggle.lastElementChild.textContent = soundOn ? "SOUND ON" : "SOUND OFF";
  video.muted = !soundOn;
}

soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  syncSoundButton();
  if (soundOn && currentClip && video.paused) {
    video.play().catch(() => {});
  }
});

function openTalk() {
  closeIndex();
  talkPanel.classList.add("is-open");
  talkPanel.setAttribute("aria-hidden", "false");
  talkScrim.classList.add("is-open");
  talkScrim.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  clearIdleTimer();
}

function closeTalk() {
  talkPanel.classList.remove("is-open");
  talkPanel.setAttribute("aria-hidden", "true");
  talkScrim.classList.remove("is-open");
  talkScrim.setAttribute("aria-hidden", "true");
  if (!indexDialog.open) document.body.classList.remove("no-scroll");
  scheduleIdle(1800);
}

function openIndex() {
  closeTalk();
  if (!indexDialog.open) indexDialog.showModal();
  document.body.classList.add("no-scroll");
  clearIdleTimer();
}

function closeIndex() {
  if (indexDialog.open) indexDialog.close();
  if (!talkPanel.classList.contains("is-open")) document.body.classList.remove("no-scroll");
  scheduleIdle(1800);
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

  const run = () => playClip(playButton.dataset.play, { after: playButton.dataset.after });
  if (playButton.hasAttribute("data-return-home")) {
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
  playClip(key, { after: key === "tease" ? "talk" : null });
}

document.querySelector("#randomPlay").addEventListener("click", playRandomAction);
document.querySelector("#characterHitArea").addEventListener("click", playRandomAction);

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

const heroObserver = new IntersectionObserver(
  ([entry]) => {
    heroVisible = entry.isIntersecting;
    if (!heroVisible && currentClip) {
      ++playToken;
      resetToAnchor({ runAfter: false, schedule: false });
    } else if (heroVisible && !currentClip) {
      scheduleIdle(1600);
    }
  },
  { threshold: 0.2 }
);
heroObserver.observe(hero);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearIdleTimer();
    video.pause();
  } else if (currentClip) {
    video.play().catch(() => resetToAnchor({ runAfter: false }));
  } else {
    scheduleIdle(1000);
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
  await delay(reduceMotion ? 150 : 1180);
  document.querySelector(".boot-screen").classList.add("is-done");
  if (!reduceMotion) scheduleIdle(2600);
});
