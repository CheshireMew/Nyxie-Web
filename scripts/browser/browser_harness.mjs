import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export class BrowserHarness {
  static async connect({
    siteUrl = process.env.NYXIE_TEST_URL ?? "http://127.0.0.1:4173",
    cdpBase = "http://127.0.0.1:9222",
    outputDirectory = resolve("artifacts/browser-acceptance"),
  } = {}) {
    await mkdir(outputDirectory, { recursive: true });
    const targets = await fetch(`${cdpBase}/json/list`).then((response) => response.json());
    const pageTarget = targets.find((target) => target.type === "page");
    if (!pageTarget) throw new Error("No browser page target is available.");

    const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolveOpen, rejectOpen) => {
      socket.addEventListener("open", resolveOpen, { once: true });
      socket.addEventListener("error", rejectOpen, { once: true });
    });
    return new BrowserHarness({ socket, siteUrl, cdpBase, outputDirectory });
  }

  constructor({ socket, siteUrl, cdpBase, outputDirectory }) {
    this.socket = socket;
    this.siteUrl = siteUrl;
    this.cdpBase = cdpBase;
    this.outputDirectory = outputDirectory;
    this.commandId = 0;
    this.pending = new Map();
    this.browserErrors = [];
    this.failedResources = [];
    socket.addEventListener("message", (event) => this.handleMessage(event));
  }

  async initialize() {
    await Promise.all([
      this.send("Page.enable"),
      this.send("Runtime.enable"),
      this.send("Log.enable"),
      this.send("Network.enable"),
    ]);
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }

    if (message.method === "Runtime.exceptionThrown") {
      const details = message.params.exceptionDetails;
      const description = details?.exception?.description ?? details?.text ?? "Runtime exception";
      this.browserErrors.push(`${details?.url ?? "unknown source"}: ${description}`);
    }
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      this.browserErrors.push(message.params.entry.text);
    }
    if (message.method === "Network.loadingFailed" && !message.params.canceled) {
      this.failedResources.push(`${message.params.type}: ${message.params.errorText}`);
    }
    if (message.method === "Network.responseReceived" && message.params.response.status >= 400) {
      this.failedResources.push(`${message.params.response.status}: ${message.params.response.url}`);
    }
  }

  send(method, params = {}) {
    this.commandId += 1;
    const id = this.commandId;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolveCommand, rejectCommand) => {
      this.pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
    });
  }

  async evaluate(expression, awaitPromise = true) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }

  delay(milliseconds) {
    return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
  }

  async waitFor(expression, timeout = 15000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      if (await this.evaluate(expression)) return;
      await this.delay(150);
    }
    throw new Error(`Timed out waiting for: ${expression}`);
  }

  async screenshot(name) {
    const capture = await this.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    await writeFile(resolve(this.outputDirectory, name), Buffer.from(capture.data, "base64"));
  }

  async scrollChapterTo(selector, progress, settleMs = 1050) {
    await this.evaluate(`(() => {
      const section = document.querySelector(${JSON.stringify(selector)});
      if (!section) return false;
      const top = section.getBoundingClientRect().top + scrollY;
      const travel = Math.max(0, section.offsetHeight - innerHeight);
      window.scrollTo({ top: top + travel * ${progress}, behavior: 'instant' });
      return true;
    })()`);
    await this.delay(settleMs);
  }

  async positionChapterTop(selector, viewportTop, settleMs = 350) {
    await this.evaluate(`(() => {
      const section = document.querySelector(${JSON.stringify(selector)});
      if (!section) return false;
      const top = section.getBoundingClientRect().top + scrollY;
      window.scrollTo({ top: top - ${viewportTop}, behavior: 'instant' });
      return true;
    })()`);
    await this.delay(settleMs);
  }

  async wheelAt(x, y, deltaY) {
    await this.send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY });
    await this.delay(260);
  }

  async navigate(captureBoot = false) {
    const targetUrl = `${this.siteUrl}/?acceptance=${Date.now()}`;
    await this.send("Page.navigate", { url: targetUrl });
    await this.waitFor(`location.href === ${JSON.stringify(targetUrl)}`);
    await this.waitFor("document.readyState === 'complete'");
    let bootState = null;
    if (captureBoot) {
      await this.waitFor("Boolean(document.querySelector('.boot-screen:not(.is-done)'))");
      bootState = await this.evaluate(`({
        visible: getComputedStyle(document.querySelector('.boot-screen')).visibility === 'visible',
        bodyLocked: document.body.classList.contains('is-booting'),
        overflow: getComputedStyle(document.body).overflow,
        progressAnimated: getComputedStyle(document.querySelector('.boot-line span')).animationName === 'boot-scan',
      })`);
      await this.screenshot("desktop-boot.png");
    }
    await this.waitFor("document.querySelector('.boot-screen')?.classList.contains('is-done') === true", 20000);
    await this.delay(700);
    return bootState;
  }

  async countPageTargets() {
    const targets = await fetch(`${this.cdpBase}/json/list`).then((response) => response.json());
    return targets.filter((target) => target.type === "page").length;
  }

  close() {
    this.socket.close();
  }
}
