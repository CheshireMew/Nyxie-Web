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
  const focusMarkerRef = useRef<HTMLSpanElement>(null);
  const baseVideoRef = useRef<HTMLVideoElement>(null);
  const baseImageRef = useRef<HTMLImageElement>(null);
  const lensCanvasRef = useRef<HTMLCanvasElement>(null);
  const coordinateRef = useRef<HTMLOutputElement>(null);
  const renderFrameRef = useRef(0);
  const focusRef = useRef({ x: 0, y: 0, width: 1, height: 1 });

  const drawLensFrame = useCallback(() => {
    const stage = stageRef.current;
    const lens = lensRef.current;
    const video = baseVideoRef.current;
    const image = baseImageRef.current;
    const canvas = lensCanvasRef.current;
    const media = reducedMotion ? image : video;
    if (!stage || !lens || !media || !canvas) return;

    const sourceWidth = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
    const sourceHeight = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
    const mediaReady = media instanceof HTMLVideoElement ? media.readyState >= 2 : media.complete;
    if (!mediaReady || sourceWidth === 0 || sourceHeight === 0) return;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const lensSize = lens.offsetWidth;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const canvasSize = Math.max(1, Math.round(lensSize * pixelRatio));
    if (canvas.width !== canvasSize || canvas.height !== canvasSize) {
      canvas.width = canvasSize;
      canvas.height = canvasSize;
    }

    const { x, y } = focusRef.current;
    const stageRect = stage.getBoundingClientRect();
    const mediaRect = media.getBoundingClientRect();
    const stageStyle = getComputedStyle(stage);
    const mediaStyle = getComputedStyle(media);
    const zoom = Number.parseFloat(stageStyle.getPropertyValue("--lens-zoom")) || 1.75;
    const mediaBoxWidth = mediaRect.width;
    const mediaBoxHeight = mediaRect.height;
    const fitScale = mediaStyle.objectFit === "cover"
      ? Math.max(mediaBoxWidth / sourceWidth, mediaBoxHeight / sourceHeight)
      : Math.min(mediaBoxWidth / sourceWidth, mediaBoxHeight / sourceHeight);
    const renderedWidth = sourceWidth * fitScale;
    const renderedHeight = sourceHeight * fitScale;
    const [positionX = "50%", positionY = "50%"] = mediaStyle.objectPosition.split(" ");
    const horizontalFactor = (Number.parseFloat(positionX) || 0) / 100;
    const verticalFactor = (Number.parseFloat(positionY) || 0) / 100;
    const mediaBoxLeft = mediaRect.left - stageRect.left;
    const mediaBoxTop = mediaRect.top - stageRect.top;
    const mediaLeft = mediaBoxLeft + (mediaBoxWidth - renderedWidth) * horizontalFactor;
    const mediaTop = mediaBoxTop + (mediaBoxHeight - renderedHeight) * verticalFactor;
    const sourceCenterX = (x - mediaLeft) / fitScale;
    const sourceCenterY = (y - mediaTop) / fitScale;
    const sourceSize = lensSize / (zoom * fitScale);
    const requestedLeft = sourceCenterX - sourceSize / 2;
    const requestedTop = sourceCenterY - sourceSize / 2;
    const sourceLeft = Math.max(0, requestedLeft);
    const sourceTop = Math.max(0, requestedTop);
    const sourceRight = Math.min(sourceWidth, requestedLeft + sourceSize);
    const sourceBottom = Math.min(sourceHeight, requestedTop + sourceSize);

    context.fillStyle = "#e8f2f9";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (sourceRight <= sourceLeft || sourceBottom <= sourceTop) return;
    const destinationX = ((sourceLeft - requestedLeft) / sourceSize) * canvas.width;
    const destinationY = ((sourceTop - requestedTop) / sourceSize) * canvas.height;
    const destinationWidth = ((sourceRight - sourceLeft) / sourceSize) * canvas.width;
    const destinationHeight = ((sourceBottom - sourceTop) / sourceSize) * canvas.height;
    context.drawImage(
      media,
      sourceLeft,
      sourceTop,
      sourceRight - sourceLeft,
      sourceBottom - sourceTop,
      destinationX,
      destinationY,
      destinationWidth,
      destinationHeight,
    );
  }, [reducedMotion]);

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
    stopLensRendering();
  }, [stopLensRendering]);

  const showLens = useCallback(() => {
    if (!active) return;
    stageRef.current?.classList.add("is-lens-active", "has-used-lens");

    if (!reducedMotion) startLensRendering();
  }, [active, reducedMotion, startLensRendering]);

  const updateLens: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (!active) return;
    const stage = stageRef.current;
    const focusMarker = focusMarkerRef.current;
    if (!stage || !focusMarker) return;

    const rect = stage.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const y = Math.min(rect.height, Math.max(0, event.clientY - rect.top));
    focusRef.current = { x, y, width: rect.width, height: rect.height };

    focusMarker.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;

    if (coordinateRef.current) {
      const horizontal = Math.round((x / rect.width) * 100).toString().padStart(3, "0");
      const vertical = Math.round((y / rect.height) * 100).toString().padStart(3, "0");
      coordinateRef.current.value = `X ${horizontal} / Y ${vertical}`;
    }

    drawLensFrame();
  }, [active, drawLensFrame]);

  const onPointerEnter: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.pointerType === "touch") return;
    showLens();
    updateLens(event);
  }, [showLens, updateLens]);

  const onPointerMove: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.pointerType !== "touch" || event.currentTarget.hasPointerCapture(event.pointerId)) {
      showLens();
      updateLens(event);
    }
  }, [showLens, updateLens]);

  const onPointerDown: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.pointerType !== "touch") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    showLens();
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
    focusMarkerRef,
    baseVideoRef,
    baseImageRef,
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
