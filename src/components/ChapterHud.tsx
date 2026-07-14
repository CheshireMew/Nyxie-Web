type Props = {
  index: string;
  label: string;
  inverted?: boolean;
};

export function ChapterHud({ index, label, inverted = false }: Props) {
  return (
    <div className={`chapter-hud${inverted ? " is-inverted" : ""}`} aria-hidden="true">
      <div className="chapter-hud-heading"><span>{index}</span>{label}</div>
      <div className="chapter-hud-coordinate">NYXIE / DREAM NAVIGATION SYSTEM</div>
      <div className="chapter-progress-track"><i className="chapter-progress-fill" /></div>
      <div className="chapter-hud-status">
        <span><i className="status-light red" /> CHARACTER ONLINE</span>
        <span><i className="status-light gold" /> MEMORY LOCKED</span>
        <span><i className="status-light blue" /> SCROLL TO ADVANCE</span>
      </div>
    </div>
  );
}
