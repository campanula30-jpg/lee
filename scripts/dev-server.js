import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const [, , ...args] = process.argv;
const port = Number(process.env.PORT ?? readFlag('--port') ?? 4173);
const rootDir = resolve(readFlag('--dir') ?? '.');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function readFlag(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
}

function safePath(pathname) {
  const decodedPath = decodeURIComponent(pathname.split('?')[0]);
  const normalizedPath = normalize(decodedPath).replace(/^([/\\])+/, '');
  const filePath = resolve(join(rootDir, normalizedPath || 'index.html'));
  if (filePath !== rootDir && !filePath.startsWith(`${rootDir}${sep}`)) return null;
  return filePath;
}

async function resolveFile(pathname) {
  const requestedPath = safePath(pathname);
  if (!requestedPath) return null;
  try {
    const fileStat = await stat(requestedPath);
    if (fileStat.isDirectory()) return resolveFile(`${pathname.replace(/\/$/, '')}/index.html`);
    return requestedPath;
  } catch {
    return null;
  }
}

const server = createServer(async (request, response) => {
  try {
    const filePath = await resolveFile(new URL(request.url, `http://${request.headers.host}`).pathname);
    if (!filePath) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(`Server error: ${error.message}`);
  }
});

server.listen(port, () => {
  console.log(`Shift Palette is running at http://localhost:${port}/`);
  console.log(`Serving files from ${rootDir}`);
  console.log('Press Ctrl+C to stop.');
});
