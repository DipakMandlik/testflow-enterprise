// Turns the TanStack Start "node-server" build output into a plain static
// site GitHub Pages can serve.
//
// The app itself never uses server loaders or server functions — all state
// lives client-side in TmsProvider/localStorage (see src/lib/tms/store.tsx) —
// so the only thing the server build buys us is a correctly rendered HTML
// shell. We boot that server once, capture the HTML it renders for the site
// root, and ship that as a static index.html alongside the client assets.
//
// Deep links (e.g. /testflow-enterprise/dashboard) can't be pre-rendered one
// file per route without enumerating every dynamic execution/test-case id,
// so we rely on the standard GitHub Pages SPA fallback: 404.html redirects
// to index.html with the real path encoded in the query string, and an
// inline script in index.html restores it via history.replaceState before
// the app boots. See https://github.com/rafgraph/spa-github-pages.
import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const distDir = path.join(root, "dist");
const publicOutDir = path.join(root, ".output/public");
const serverEntry = path.join(root, ".output/server/index.mjs");
const base = process.env.GH_PAGES_BASE || "/";
const port = 8790;

const REDIRECT_RESTORE_SCRIPT = `
    // GitHub Pages SPA fallback: restore the real path encoded by 404.html
    // (see rafgraph/spa-github-pages) before the router boots.
    (function () {
      var l = window.location;
      if (l.search[1] === "/") {
        var decoded = l.search.slice(1).split("&").map(function (s) {
          return s.replace(/~and~/g, "&");
        });
        var path = decoded.shift();
        window.history.replaceState(
          null,
          "",
          l.pathname.slice(0, -1) + path + (decoded.length ? "?" + decoded.join("&") : "") + l.hash,
        );
      }
    })();
`;

const NOT_FOUND_REDIRECT_SCRIPT = (segments) => `
    // GitHub Pages has no server-side rewrites, so deep links 404 here.
    // Encode the intended path/query/hash and bounce to index.html, which
    // restores it before the app boots. See rafgraph/spa-github-pages.
    (function () {
      var l = window.location;
      l.replace(
        l.protocol + "//" + l.host +
          l.pathname.split("/").slice(0, ${segments} + 1).join("/") + "/?/" +
          l.pathname.slice(1).split("/").slice(${segments}).join("/").replace(/&/g, "~and~") +
          (l.search ? "&" + l.search.slice(1).replace(/&/g, "~and~") : "") +
          l.hash,
      );
    })();
`;

async function waitForServer(url, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server at ${url} never became ready`);
}

async function main() {
  if (!existsSync(serverEntry)) {
    throw new Error(`Missing ${serverEntry} — run "vite build" first.`);
  }

  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  const server = spawn(process.execPath, [serverEntry], {
    env: { ...process.env, PORT: String(port), NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  server.stdout.on("data", (d) => (serverLog += d));
  server.stderr.on("data", (d) => (serverLog += d));

  try {
    const rootUrl = `http://localhost:${port}${base}`;
    await waitForServer(rootUrl);

    const res = await fetch(rootUrl);
    if (!res.ok) {
      throw new Error(`Root render returned ${res.status}\n${serverLog}`);
    }
    let html = await res.text();

    html = html.replace("<head>", `<head><script>${REDIRECT_RESTORE_SCRIPT}</script>`);

    await writeFile(path.join(distDir, "index.html"), html, "utf8");

    // base is "/" or "/<repo>/" — either way it's exactly one meaningful
    // path segment (or zero) to preserve when restoring the real path.
    const segments = base === "/" ? 0 : base.split("/").filter(Boolean).length;
    const notFoundHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><script>${NOT_FOUND_REDIRECT_SCRIPT(segments)}</script></head><body></body></html>`;
    await writeFile(path.join(distDir, "404.html"), notFoundHtml, "utf8");

    await cp(publicOutDir, distDir, { recursive: true });
    await writeFile(path.join(distDir, ".nojekyll"), "");

    console.log(`Static site written to ${distDir}`);
  } finally {
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
