import type { RefObject } from "react";

type Props = {
  index: string;
  label: string;
  inverted?: boolean;
  showStatus: boolean;
  progressRef?: RefObject<HTMLElement | null>;
};

export function ChapterHud({ index, label, inverted = false, showStatus, progressRef }: Props) {
  return (
    <div className={`chapter-hud${inverted ? " is-inverted" : ""}${showStatus ? " has-status" : ""}`} aria-hidden="true">
      <div className="chapter-hud-heading"><span>{index}</span>{label}</div>
      <div className="chapter-hud-coordinate">NYXIE / DREAM NAVIGATION SYSTEM</div>
      <div className="chapter-progress-track"><i ref={progressRef} className="chapter-progress-fill" /></div>
      {showStatus && (
        <div className="chapter-hud-status">
          <span><i className="status-light red" /> CHARACTER ONLINE</span>
          <span><i className="status-light gold" /> MEMORY LOCKED</span>
          <span><i className="status-light blue" /> SCROLL TO ADVANCE</span>
        </div>
      )}
    </div>
  );
}
