import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = fileURLToPath(new URL('../web/', import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function safePath(urlPath) {
  const cleaned = (urlPath === '/' ? 'index.html' : urlPath).replace(/^\/+/, '');
  const full = normalize(join(ROOT, cleaned));
  if (!full.startsWith(normalize(ROOT))) {
    return null;
  }
  return full;
}

const server = createServer(async (req, res) => {
  const path = safePath(new URL(req.url, `http://${req.headers.host}`).pathname);
  if (!path) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const content = await readFile(path);
    const type = MIME[extname(path)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Truco web rodando em http://${HOST}:${PORT}`);
});
