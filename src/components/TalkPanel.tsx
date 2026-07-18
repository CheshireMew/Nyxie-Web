import type { ClipKey } from "../content/mediaCatalog";
import type { SectionId } from "../app/sectionRegistry";
import { SidePanelShell } from "./SidePanelShell";

type Props = {
  open: boolean;
  onClose: () => void;
  onNavigate: (id: SectionId) => void;
  onPlayAtHero: (key: ClipKey) => void;
};

export function TalkPanel({ open, onClose, onNavigate, onPlayAtHero }: Props) {
  return (
    <SidePanelShell
      open={open}
      id="nyxie-talk-panel"
      onClose={onClose}
      ariaLabel="夜希互动面板"
      dialogClassName="talk-dialog"
      panelClassName="talk-panel"
    >
      <div className="talk-head">
        <div><span className="live-dot" /> NYXIE.proc <small>ONLINE</small></div>
        <button type="button" onClick={onClose} aria-label="关闭对话">×</button>
      </div>
      <div className="talk-body">
        <div className="talk-avatar"><span /><i /><i /><b /></div>
        <p className="talk-system">SYSTEM / SHE NOTICED YOU</p>
        <blockquote>“既然都看到这里了，<br />就别只盯着首屏。”</blockquote>
        <div className="quick-actions">
          <button type="button" onClick={() => onNavigate("character")}>读取角色设定</button>
          <button type="button" onClick={() => onNavigate("personality")}>看看我的反应</button>
          <button type="button" onClick={() => onPlayAtHero("vanish")}>回首页看我消失</button>
        </div>
      </div>
      <div className="talk-input"><span>&gt;</span><input type="text" placeholder="更多互动还在准备中…" disabled /></div>
    </SidePanelShell>
  );
}
