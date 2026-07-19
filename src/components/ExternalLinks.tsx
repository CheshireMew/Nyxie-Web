import { externalLinks } from "../content/siteContent";

function ExternalLinkRows() {
  return externalLinks.map((link) => {
    const content = (
      <>
        <span>{link.index}</span>
        <div>
          <small>OPEN CHANNEL</small>
          <strong>{link.label}</strong>
          <p>{link.description}</p>
        </div>
        <i aria-hidden="true">↗</i>
      </>
    );

    return (
      <a
        className="external-link external-link--drawer"
        key={link.index}
        href={link.href}
        target="_blank"
        rel="noreferrer"
        aria-label={`打开 ${link.label}：${link.description}`}
      >
        {content}
      </a>
    );
  });
}

type Props = {
  dismissed: boolean;
  onClose: () => void;
};

export function ExternalLinksDrawer({ dismissed, onClose }: Props) {
  const availableLinkCount = externalLinks.length;
  if (dismissed) return null;

  return (
    <>
      <div className="links-drawer-backdrop" aria-hidden="true" />
      <div className="links-drawer-positioner">
        <aside className="links-drawer" aria-label="夜希的外部链接">
          <div className="links-drawer-rail">
            <span>04 / EXIT DIRECTORY</span>
            <span className="links-drawer-status"><i aria-hidden="true" />{availableLinkCount} CHANNELS ONLINE</span>
            <button className="links-drawer-close" type="button" onClick={onClose} aria-label="关闭链接卡片">×</button>
          </div>

          <div className="links-drawer-head">
            <div>
              <small>CHOOSE YOUR NEXT STOP</small>
              <h3>探索更多</h3>
              <p>点击链接，获取更多信息。</p>
            </div>
            <span className="links-drawer-mark" aria-hidden="true">N<i>×</i></span>
          </div>

          <div className="drawer-link-gates">
            <ExternalLinkRows />
          </div>

          <div className="links-drawer-foot">
            <span>END OF CURRENT PAGE / 2026</span>
          </div>
        </aside>
      </div>
    </>
  );
}
