export const gazeTrackStartTime = 8.25;
export const gazeFrontTime = 10.5;
export const gazeTrackEndTime = 12.25;
export const gazeSourceWidth = 1920;
export const gazeSourceHeight = 1080;
export const gazeSourceEyeAnchor = { x: 0.5, y: 0.545 } as const;
export const gazeHorizontalReach = 0.78;

// The delivered clip does not contain distinct up/down poses or a closed
// directional loop. Frame review found one reliable continuous passage:
// screen-left at 8.25s → front at 10.50s → screen-right at 12.25s.
// Pointer control is deliberately limited to that real recorded movement.
export type GazeDirection = "LEFT" | "FRONT" | "RIGHT";

export function gazeEyeAnchorInCover(
  stageWidth: number,
  stageHeight: number,
  sourceWidth = gazeSourceWidth,
  sourceHeight = gazeSourceHeight,
) {
  const scale = Math.max(stageWidth / sourceWidth, stageHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  return {
    x: gazeSourceEyeAnchor.x * renderedWidth - (renderedWidth - stageWidth) / 2,
    y: gazeSourceEyeAnchor.y * renderedHeight - (renderedHeight - stageHeight) / 2,
  };
}

export function clampGazePosition(position: number) {
  return Math.min(1, Math.max(-1, position));
}

export function gazePositionFromHorizontalOffset(normalizedOffset: number) {
  return clampGazePosition(normalizedOffset / gazeHorizontalReach);
}

export function gazeTimeAtPosition(inputPosition: number) {
  const position = clampGazePosition(inputPosition);
  if (position < 0) {
    return gazeFrontTime + (gazeFrontTime - gazeTrackStartTime) * position;
  }
  return gazeFrontTime + (gazeTrackEndTime - gazeFrontTime) * position;
}

export function clampGazeTime(time: number) {
  return Math.min(gazeTrackEndTime, Math.max(gazeTrackStartTime, time));
}

export function gazeDirectionAtPosition(position: number): GazeDirection {
  if (position < -0.08) return "LEFT";
  if (position > 0.08) return "RIGHT";
  return "FRONT";
}
