import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);let root=here,port=4173;
for(let i=0;i<args.length;i++){if(args[i]==='--dir')root=path.resolve(here,args[++i]);else if(args[i]==='--port')port=Number(args[++i]);}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
http.createServer((req,res)=>{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.endsWith('/'))pathname+='index.html';let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root)){res.writeHead(403);return res.end('Forbidden');}fs.readFile(file,(err,data)=>{if(err){fs.readFile(path.join(root,'index.html'),(e,fallback)=>{if(e){res.writeHead(404);res.end('Not found');}else{res.writeHead(200,{'Content-Type':mime['.html'],'Cache-Control':'no-store'});res.end(fallback);}});return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});}).listen(port,'0.0.0.0',()=>console.log(`Paper Island running at http://localhost:${port}`));
