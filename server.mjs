import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".svg": "image/svg+xml"
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const requested = pathname === "/" ? "index.html" : pathname.slice(1);
    const safePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
    let filePath = join(root, safePath);

    let info = await stat(filePath);
    if (info.isDirectory()) {
      filePath = join(filePath, "index.html");
      info = await stat(filePath);
    }

    const extension = extname(filePath).toLowerCase();
    const commonHeaders = {
      "Accept-Ranges": "bytes",
      "Content-Type": mime[extension] || "application/octet-stream",
      "Cache-Control": [".html", ".css", ".js"].includes(extension)
        ? "no-cache"
        : "public, max-age=3600"
    };
    const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);

    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
      if (start > end || start >= info.size) {
        response.writeHead(416, { "Content-Range": `bytes */${info.size}` });
        response.end();
        return;
      }
      response.writeHead(206, {
        ...commonHeaders,
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${info.size}`
      });
      if (request.method === "HEAD") response.end();
      else createReadStream(filePath, { start, end }).pipe(response);
      return;
    }

    response.writeHead(200, { ...commonHeaders, "Content-Length": info.size });
    if (request.method === "HEAD") response.end();
    else createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Nyxie Wonderland: http://127.0.0.1:${port}`);
});
