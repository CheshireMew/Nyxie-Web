import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { normalizeSiteUrl } from "./scripts/lib/site_url.mjs";

export default defineConfig(({ mode }) => {
  const siteUrl = normalizeSiteUrl(loadEnv(mode, ".", "NYXIE_").NYXIE_SITE_URL);
  return {
    base: "./",
    plugins: [
      react(),
      {
        name: "nyxie-production-metadata",
        transformIndexHtml(html) {
          if (!siteUrl) return html;
          const shareImage = `${siteUrl}assets/media/anchor-b.webp`;
          return html
            .replace(
              /<meta property="og:image" content="[^"]*assets\/media\/anchor-b\.webp" \/>/,
              `<meta property="og:image" content="${shareImage}" />`,
            )
            .replace(
              "</head>",
              `    <link rel="canonical" href="${siteUrl}" />\n    <meta property="og:url" content="${siteUrl}" />\n  </head>`,
            );
        },
      },
    ],
    server: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
    },
    preview: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
    },
  };
});
