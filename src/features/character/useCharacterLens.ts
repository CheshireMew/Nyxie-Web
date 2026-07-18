import { useCallback, useEffect, useRef } from "react";
import type { PointerEventHandler } from "react";

type CharacterLensOptions = {
  active: boolean;
  mediaActivated: boolean;
  reducedMotion: boolean;
};

export function useCharacterLens({ active, mediaActivated, reducedMotion }: CharacterLensOptions) {
  const stageRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const baseVideoRef = useRef<HTMLVideoElement>(null);
  const lensCanvasRef = useRef<HTMLCanvasElement>(null);
  const coordinateRef = useRef<HTMLOutputElement>(null);
  const renderFrameRef = useRef(0);
  const focusRef = useRef({ x: 0, y: 0, width: 1, height: 1 });

  const drawLensFrame = useCallback(() => {
    const stage = stageRef.current;
    const lens = lensRef.current;
    const video = baseVideoRef.current;
    const canvas = lensCanvasRef.current;
    if (!stage || !lens || !video || !canvas || video.readyState < 2 || video.videoWidth === 0) return;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const lensSize = lens.offsetWidth;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const canvasSize = Math.max(1, Math.round(lensSize * pixelRatio));
    if (canvas.width !== canvasSize || canvas.height !== canvasSize) {
      canvas.width = canvasSize;
      canvas.height = canvasSize;
    }

    const { x, y, width: stageWidth, height: stageHeight } = focusRef.current;
    const stageStyle = getComputedStyle(stage);
    const videoStyle = getComputedStyle(video);
    const zoom = Number.parseFloat(stageStyle.getPropertyValue("--lens-zoom")) || 1.75;
    const fitScale = videoStyle.objectFit === "cover"
      ? Math.max(stageWidth / video.videoWidth, stageHeight / video.videoHeight)
      : Math.min(stageWidth / video.videoWidth, stageHeight / video.videoHeight);
    const renderedWidth = video.videoWidth * fitScale;
    const renderedHeight = video.videoHeight * fitScale;
    const [positionX = "50%", positionY = "50%"] = videoStyle.objectPosition.split(" ");
    const horizontalFactor = (Number.parseFloat(positionX) || 0) / 100;
    const verticalFactor = (Number.parseFloat(positionY) || 0) / 100;
    const mediaLeft = (stageWidth - renderedWidth) * horizontalFactor;
    const mediaTop = (stageHeight - renderedHeight) * verticalFactor;
    const sourceCenterX = (x - mediaLeft) / fitScale;
    const sourceCenterY = (y - mediaTop) / fitScale;
    const sourceSize = lensSize / (zoom * fitScale);
    const requestedLeft = sourceCenterX - sourceSize / 2;
    const requestedTop = sourceCenterY - sourceSize / 2;
    const sourceLeft = Math.max(0, requestedLeft);
    const sourceTop = Math.max(0, requestedTop);
    const sourceRight = Math.min(video.videoWidth, requestedLeft + sourceSize);
    const sourceBottom = Math.min(video.videoHeight, requestedTop + sourceSize);

    context.fillStyle = "#e8f2f9";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (sourceRight <= sourceLeft || sourceBottom <= sourceTop) return;
    const destinationX = ((sourceLeft - requestedLeft) / sourceSize) * canvas.width;
    const destinationY = ((sourceTop - requestedTop) / sourceSize) * canvas.height;
    const destinationWidth = ((sourceRight - sourceLeft) / sourceSize) * canvas.width;
    const destinationHeight = ((sourceBottom - sourceTop) / sourceSize) * canvas.height;
    context.drawImage(
      video,
      sourceLeft,
      sourceTop,
      sourceRight - sourceLeft,
      sourceBottom - sourceTop,
      destinationX,
      destinationY,
      destinationWidth,
      destinationHeight,
    );
  }, []);

  const stopLensRendering = useCallback(() => {
    window.cancelAnimationFrame(renderFrameRef.current);
    renderFrameRef.current = 0;
  }, []);

  const startLensRendering = useCallback(() => {
    if (renderFrameRef.current !== 0) return;
    const render = () => {
      if (!stageRef.current?.classList.contains("is-lens-active")) {
        renderFrameRef.current = 0;
        return;
      }
      drawLensFrame();
      renderFrameRef.current = window.requestAnimationFrame(render);
    };
    renderFrameRef.current = window.requestAnimationFrame(render);
  }, [drawLensFrame]);

  const hideLens = useCallback(() => {
    stageRef.current?.classList.remove("is-lens-active");
    document.body.classList.remove("character-lens-active");
    stopLensRendering();
  }, [stopLensRendering]);

  const showLens = useCallback((pointerType: string) => {
    if (!active) return;
    stageRef.current?.classList.add("is-lens-active", "has-used-lens");
    document.body.classList.toggle("character-lens-active", pointerType !== "touch");

    if (!reducedMotion) startLensRendering();
  }, [active, reducedMotion, startLensRendering]);

  const updateLens: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (!active) return;
    const stage = stageRef.current;
    const lens = lensRef.current;
    if (!stage || !lens) return;

    const rect = stage.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const y = Math.min(rect.height, Math.max(0, event.clientY - rect.top));
    const lensRadius = lens.offsetWidth / 2;
    focusRef.current = { x, y, width: rect.width, height: rect.height };

    lens.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    lens.style.setProperty("--stage-width", `${rect.width}px`);
    lens.style.setProperty("--stage-height", `${rect.height}px`);
    lens.style.setProperty("--media-left", `${lensRadius - x}px`);
    lens.style.setProperty("--media-top", `${lensRadius - y}px`);
    lens.style.setProperty("--focus-x", `${x}px`);
    lens.style.setProperty("--focus-y", `${y}px`);

    if (coordinateRef.current) {
      const horizontal = Math.round((x / rect.width) * 100).toString().padStart(3, "0");
      const vertical = Math.round((y / rect.height) * 100).toString().padStart(3, "0");
      coordinateRef.current.value = `X ${horizontal} / Y ${vertical}`;
    }

    if (!reducedMotion) drawLensFrame();
  }, [active, drawLensFrame, reducedMotion]);

  const onPointerEnter: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.pointerType === "touch") return;
    showLens(event.pointerType);
    updateLens(event);
  }, [showLens, updateLens]);

  const onPointerMove: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.pointerType !== "touch" || event.currentTarget.hasPointerCapture(event.pointerId)) {
      showLens(event.pointerType);
      updateLens(event);
    }
  }, [showLens, updateLens]);

  const onPointerDown: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.pointerType !== "touch") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    showLens(event.pointerType);
    updateLens(event);
  }, [showLens, updateLens]);

  const onPointerUp: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.pointerType !== "touch") return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    hideLens();
  }, [hideLens]);

  useEffect(() => {
    const baseVideo = baseVideoRef.current;
    if (!baseVideo || reducedMotion || !mediaActivated) return;
    if (!active) {
      baseVideo.pause();
      return;
    }
    void baseVideo.play().catch(() => undefined);
    return () => {
      baseVideo.pause();
    };
  }, [active, mediaActivated, reducedMotion]);

  useEffect(() => {
    if (!active) hideLens();
    return hideLens;
  }, [active, hideLens]);

  return {
    stageRef,
    lensRef,
    baseVideoRef,
    lensCanvasRef,
    coordinateRef,
    pointerHandlers: {
      onPointerEnter,
      onPointerMove,
      onPointerLeave: hideLens,
      onPointerDown,
      onPointerUp,
      onPointerCancel: hideLens,
    },
  };
}
