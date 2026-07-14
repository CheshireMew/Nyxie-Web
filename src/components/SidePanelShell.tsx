import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const PANEL_ENTER_MS = 300;
const PANEL_EXIT_MS = 180;

type PanelState = "closed" | "opening" | "open" | "closing";

type Props = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  dialogClassName: string;
  panelClassName: string;
  children: ReactNode;
};

export function SidePanelShell({
  open,
  onClose,
  ariaLabel,
  dialogClassName,
  panelClassName,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [panelState, setPanelState] = useState<PanelState>("closed");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    let frame = 0;
    let closeTimer = 0;

    if (open) {
      if (!dialog.open) dialog.showModal();
      setPanelState("opening");
      frame = window.requestAnimationFrame(() => {
        setPanelState("open");
        panelRef.current?.querySelector<HTMLElement>("button, a, input, [tabindex]:not([tabindex='-1'])")?.focus();
      });
    } else if (dialog.open) {
      setPanelState("closing");
      closeTimer = window.setTimeout(() => {
        dialog.close();
        setPanelState("closed");
      }, PANEL_EXIT_MS);
    } else {
      setPanelState("closed");
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(closeTimer);
    };
  }, [open]);

  const motionProperties = {
    "--panel-enter-duration": `${PANEL_ENTER_MS}ms`,
    "--panel-exit-duration": `${PANEL_EXIT_MS}ms`,
  } as CSSProperties;

  return (
    <dialog
      ref={dialogRef}
      className={`side-panel-dialog ${dialogClassName}`}
      data-state={panelState}
      aria-label={ariaLabel}
      style={motionProperties}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button className="side-panel-scrim" type="button" tabIndex={-1} onClick={onClose} aria-label={`关闭${ariaLabel}`} />
      <aside ref={panelRef} className={`side-panel-shell ${panelClassName}`} aria-label={ariaLabel}>
        {children}
      </aside>
    </dialog>
  );
}
