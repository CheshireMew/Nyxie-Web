import { externalLinks } from "../content/siteContent";

export function ExternalLinkRows({ variant }: { variant: "inline" | "drawer" }) {
  return externalLinks.map((link) => {
    const className = `external-link external-link--${variant}`;
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
        className={className}
        key={`${variant}-${link.index}`}
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

export function ExternalLinksDrawer() {
  const availableLinkCount = externalLinks.length;

  return (
    <>
      <div className="links-drawer-backdrop" aria-hidden="true" />
      <aside className="links-drawer" aria-label="夜希的外部链接">
        <div className="links-drawer-rail">
          <span>05 / EXIT DIRECTORY</span>
          <span className="links-drawer-status"><i aria-hidden="true" />{availableLinkCount} CHANNELS ONLINE</span>
        </div>

        <div className="links-drawer-head">
          <div>
            <small>CHOOSE YOUR NEXT STOP</small>
            <h3>夜希的其他入口</h3>
            <p>作品已经看完。选择一个真实入口，在新的标签页继续。</p>
          </div>
          <span className="links-drawer-mark" aria-hidden="true">N<i>×</i></span>
        </div>

        <div className="drawer-link-gates">
          <ExternalLinkRows variant="drawer" />
        </div>

        <div className="links-drawer-foot">
          <span>END OF CURRENT PAGE / 2026</span>
        </div>
      </aside>
    </>
  );
}
