// Daily Protocol service worker: caches the app and all media so it opens offline.
const VERSION="dp-v2";
const CORE=[
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "media/00dc4fef-0e9d-484a-b60d-017755a4f3f1.mp4",
  "media/042128a0-d184-40c8-b885-cf2c675c00c2.mp4",
  "media/05b506d1-6f11-4654-b5f7-499e94b75eec.mp4",
  "media/09fc282d-04e3-4682-a055-1a205b7bf5a5.mp4",
  "media/16083aef-5dda-40f0-ae0a-f1e841c7f633.mp4",
  "media/16aea5ca-bf7f-4de9-b813-f90ecd2d41f5.mp4",
  "media/3483591f-f85f-47e4-af95-faebdeda5218.jpg",
  "media/43782c37-cf9b-4105-bd86-23d5fd74c9f0.jpg",
  "media/68fe4897-c525-4549-9b91-30e480c1b8dd.mp4",
  "media/6993a809-6f41-4851-b2d4-f68e85a2a61b.mp4",
  "media/6d43ac7a-2947-4c69-946b-a4f4510d0c38.mp4",
  "media/7b2bbecc-36c8-4455-99ae-9399f22e00c7.mp4",
  "media/84912d37-f4c9-41bc-9a7f-e7df0fd4ca19.jpg",
  "media/896f04b6-20f1-434f-84f4-5331d3f2f8ee.jpg",
  "media/a783355d-1d47-4618-ae84-c9da8932c1e8.jpg",
  "media/aa663113-6d39-40d6-b91a-f127f941debb.mp4",
  "media/aaf41834-6bbe-4282-b34f-d1880a37d9ad.mp4",
  "media/accfb440-3f17-4e1c-b8f4-f4d3eb319ee0.mp4",
  "media/b88937bf-3b41-4abe-8838-dd139ef10771.mp4",
  "media/c8b1c532-2c4f-4ef1-91ae-279dfa3930b6.jpg",
  "media/da69dd86-d57d-4568-9b1e-f9c480b0b2a0.mp4",
  "media/e6d08a99-e77d-4a2a-a791-8996bf5ee952.mp4",
  "media/e847d2b4-a02d-4d74-b951-4d690af58f9c.mp4",
  "media/ea82b47c-09d7-485a-afb9-6261b7b332d2.jpg",
  "media/fa9f29c9-e940-444b-8998-829bfa8aa992.mp4"
];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

// Safari asks for video in byte ranges; answer those from the cached file.
async function rangeResponse(req){
  const cached=await caches.match(req.url,{ignoreSearch:true});
  if(!cached)return fetch(req);
  const buf=await cached.arrayBuffer(),size=buf.byteLength;
  const m=/bytes=(\d*)-(\d*)/.exec(req.headers.get("range")||"");
  let start=m&&m[1]?+m[1]:0,end=m&&m[2]?+m[2]:size-1;
  if(m&&!m[1]&&m[2]){start=size-+m[2];end=size-1}
  end=Math.min(end,size-1);
  return new Response(buf.slice(start,end+1),{status:206,headers:{
    "Content-Type":cached.headers.get("Content-Type")||"video/mp4",
    "Content-Range":`bytes ${start}-${end}/${size}`,
    "Content-Length":String(end-start+1),"Accept-Ranges":"bytes"}});
}

self.addEventListener("fetch",e=>{
  const req=e.request;if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(req.headers.has("range")){e.respondWith(rangeResponse(req));return}
  if(req.mode==="navigate"){
    e.respondWith(fetch(req).then(r=>{const copy=r.clone();caches.open(VERSION).then(c=>c.put("index.html",copy));return r}).catch(()=>caches.match("index.html")));
    return;
  }
  if(url.origin===location.origin){
    e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req)));
    return;
  }
  if(/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(caches.open(VERSION).then(async c=>{
      const hit=await c.match(req);
      const net=fetch(req).then(r=>{c.put(req,r.clone());return r}).catch(()=>hit);
      return hit||net;
    }));
  }
});
