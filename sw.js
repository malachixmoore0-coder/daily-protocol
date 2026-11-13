// Daily Protocol service worker: caches the app and all media so it opens offline.
const VERSION="dp-v7";
const CORE=[
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "looks/chrome.mp4",
  "looks/core.mp4",
  "looks/hourglass.mp4",
  "looks/neon.mp4",
  "looks/quest.mp4",
  "looks/solar.mp4",
  "media/41281ee9-204a-4f68-8ddd-fc6e9454fe04.mp4",
  "media/19bc688a-a052-4ffb-8055-73a84754d378.mp4",
  "media/b60f6256-11f6-4b77-91ba-2f7303cbfed7.mp4",
  "media/7b3bb65b-7edf-4607-88db-ebe5cf6949ca.mp4",
  "media/26b0b6c8-ac83-434b-b522-3faff8747757.mp4",
  "media/b1a64a6f-d4d6-4fce-bc86-a9d418070df8.mp4",
  "media/08867923-1453-46a2-9b37-dcf6736648f2.mp4",
  "media/f9a933f9-d76a-43f7-8a7a-f9a2e7cf1c9d.mp4",
  "media/0361af22-780b-40e2-af48-8791d0f44bd8.mp4",
  "media/96ac8e0d-b077-495f-90c8-b26fde53cc97.mp4",
  "media/43c6f251-774a-4db3-b3b7-f3df224db1e7.mp4",
  "media/d2e698eb-e9d8-48e4-b7d1-b2c9fdf221e3.mp4",
  "media/63aa477e-c86f-4e08-9586-cf22681bb835.mp4",
  "media/0ab7e3c3-5d14-4783-b179-71e9b4133b94.mp4",
  "media/b5edf217-c27f-43a9-baec-488c2b5f358d.mp4",
  "media/9b097d02-715d-4ed1-b24a-616239d55f5d.mp4",
  "media/126656ac-37c9-4712-93bc-59bd3659a2c9.mp4",
  "media/b9c23d8e-2e16-4c0b-8a58-91b895805f67.mp4",
  "media/31c7880b-2cf2-4e8e-a1c2-2b742a794247.mp4",
  "media/5e6478e1-0ad4-4868-a944-25db48c3df43.mp4",
  "media/0f592230-e097-4e5e-8691-589fe7dd18d7.mp4",
  "media/4c1b8329-7f6e-483d-8bb3-f64b05e63eb6.mp4",
  "media/e10eef69-22fe-49aa-90ff-f1cd0d87a9a8.mp4",
  "media/29f67202-2eaf-4464-9aae-70ae77fd7f69.mp4",
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

// Push notifications from the reminder server.
self.addEventListener("push",e=>{
  let d={};
  try{d=e.data?e.data.json():{}}catch(_){d={body:e.data&&e.data.text()}}
  e.waitUntil(self.registration.showNotification(d.title||"Daily Protocol",{
    body:d.body||"",tag:d.tag||undefined,renotify:!!d.tag,
    icon:"icons/icon-192.png",badge:"icons/icon-192.png",data:{url:d.url||"./"}}));
});

self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const url=new URL((e.notification.data&&e.notification.data.url)||"./",self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list){if("focus" in c){if("navigate" in c)c.navigate(url).catch(()=>{});return c.focus()}}
    return self.clients.openWindow(url);
  }));
});
