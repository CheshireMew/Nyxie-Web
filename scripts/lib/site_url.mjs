export function normalizeSiteUrl(value) {
  if (!value?.trim()) return null;
  const withoutQueryOrHash = value.trim().replace(/[?#].*$/, "");
  if (!/^https?:\/\/[^/\s?#]+(?:\/|$)/i.test(withoutQueryOrHash)) {
    throw new Error("NYXIE_SITE_URL 必须是 http 或 https 绝对地址。");
  }
  return withoutQueryOrHash.endsWith("/") ? withoutQueryOrHash : `${withoutQueryOrHash}/`;
}
