import { useEffect, useRef } from "react";
import { sections } from "../content/siteContent";
import type { SectionId } from "../content/siteContent";

type Props = {
  open: boolean;
  onClose: () => void;
  onNavigate: (id: SectionId) => void;
};

export function DirectoryDialog({ open, onClose, onNavigate }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="index-dialog"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="index-shell">
        <div className="index-topline">
          <span>NYXIE / CHAPTER SELECT</span>
          <button type="button" onClick={onClose} aria-label="关闭目录">×</button>
        </div>
        <div className="index-title">
          <small>FOLLOW THE CHARACTER, NOT THE KEY</small>
          <h2>INDEX</h2>
        </div>
        <div className="chapter-grid">
          {sections.slice(1).map((section) => (
            <button key={section.id} type="button" onClick={() => onNavigate(section.id)}>
              <span>{section.index}</span>
              <strong>{section.en}</strong>
              <small>{section.zh}</small>
              <i>↗</i>
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}
