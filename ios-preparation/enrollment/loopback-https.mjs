import {createServer} from 'node:https';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

// Test harness for the production-shaped Request/Response boundary.
export async function startLoopbackHttps({origin, key, cert, handle}) {
 const base = new URL(origin);
 const server = createServer({key, cert, requestTimeout: 10000, headersTimeout: 5000}, async (incoming, outgoing) => {
  try {
   if (!incoming.url?.startsWith('/') || incoming.url.startsWith('//') || incoming.url.includes('\\') ||
       incoming.headers.host !== base.host) {
    outgoing.writeHead(400).end();
    return;
   }
   const method = incoming.method;
   const body = method === 'GET' || method === 'HEAD' ? {} : {body: Readable.toWeb(incoming), duplex: 'half'};
   const request = new Request(base.origin + incoming.url, {method, headers: incoming.headers, ...body});
   const result = await handle(request);
   outgoing.writeHead(result.status, Object.fromEntries(result.headers));
   if (result.body) await pipeline(Readable.fromWeb(result.body), outgoing);
   else outgoing.end();
  } catch {
   if (outgoing.headersSent) outgoing.destroy();
   else outgoing.writeHead(503, {'Cache-Control': 'no-store'}).end();
  }
 });
 await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
 });
 return {
  port: server.address().port,
  close: () => new Promise(resolve => {
   server.close(resolve);
   server.closeAllConnections();
  })
 };
}
