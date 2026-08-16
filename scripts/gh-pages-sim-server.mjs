// Minimal static file server that mimics GitHub Pages' behavior: a project
// site rooted at /<repo>/ and any unmatched path served with 404.html's
// content (status 404), so the SPA fallback trick can be tested locally.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../dist", import.meta.url)));
const base = "/testflow-enterprise";
const port = Number(process.argv[2] || 8792);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (!pathname.startsWith(base)) {
    res.writeHead(404).end("Not Found");
    return;
  }
  pathname = pathname.slice(base.length) || "/";
  if (pathname.endsWith("/")) pathname += "index.html";

  const filePath = path.join(root, pathname);
  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      "content-type": MIME[path.extname(filePath)] ?? "application/octet-stream",
    });
    res.end(data);
  } catch {
    const notFound = await readFile(path.join(root, "404.html"));
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end(notFound);
  }
});

server.listen(port, () => console.log(`gh-pages-sim listening on :${port}`));
