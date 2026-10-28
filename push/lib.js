// Pure helpers for the push server: schedule math, VAPID signing and RFC 8291 encryption.

const MAX_REMINDERS = 40;

// ---------- prefs + schedule math ----------
export function applyPrefs(s, body) {
  if (typeof body.tz === "string" && body.tz.length < 64) {
    try { new Intl.DateTimeFormat("en-US", { timeZone: body.tz }); s.tz = body.tz; } catch { /* keep old tz */ }
  }
  s.tz = s.tz || "America/New_York";
  if (Array.isArray(body.reminders)) {
    s.reminders = body.reminders.slice(0, MAX_REMINDERS).filter((r) => r && /^\d{2}:\d{2}$/.test(r.t)).map((r) => ({
      id: clip(r.id, 24), t: r.t,
      days: Array.isArray(r.days) ? r.days.filter((d) => d >= 0 && d <= 6) : null,
      title: clip(r.title, 80), body: clip(r.body, 200), url: clip(r.url, 40),
    }));
  }
  s.reminders = s.reminders || [];
}

export const clip = (x, n) => (typeof x === "string" ? x.slice(0, n) : "");

// Wall-clock parts of an instant in a time zone.
export function partsIn(ms, tz) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second, wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday) };
}

// The instant when the wall clock in tz reads y-mo-d h:mi.
export function instantFor(y, mo, d, h, mi, tz) {
  const want = Date.UTC(y, mo - 1, d, h, mi);
  let t = want;
  for (let i = 0; i < 3; i++) {
    const p = partsIn(t, tz);
    const seen = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
    t += want - seen;
  }
  return t;
}

// Every reminder occurrence in (from, to].
export function dueBetween(s, from, to) {
  const out = [];
  const start = partsIn(from - 36 * 3600 * 1000, s.tz);
  const base = Date.UTC(start.y, start.mo - 1, start.d);
  const spanDays = Math.ceil((to - from) / 86400000) + 3;
  for (let k = 0; k <= spanDays; k++) {
    const day = new Date(base + k * 86400000);
    const y = day.getUTCFullYear(), mo = day.getUTCMonth() + 1, d = day.getUTCDate(), wd = day.getUTCDay();
    for (const r of s.reminders || []) {
      if (r.days && r.days.length && !r.days.includes(wd)) continue;
      const [h, mi] = r.t.split(":").map(Number);
      const at = instantFor(y, mo, d, h, mi, s.tz);
      if (at > from && at <= to) out.push({ at, r });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

export function nextDue(s, now) {
  const list = dueBetween(s, now, now + 8 * 86400000);
  return list[0] || null;
}

// ---------- crypto helpers ----------
export function b64u(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unb64u(str) {
  const s = atob(str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
export function rid(n) { return b64u(crypto.getRandomValues(new Uint8Array(n))); }
function concat(...parts) {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export async function vapidJwt(privateJwk, aud, sub) {
  const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ typ: "JWT", alg: "ES256" })}.${enc({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub })}`;
  const key = await crypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned)));
  return `${unsigned}.${b64u(sig)}`;
}

async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, bytes * 8));
}

// RFC 8291 message encryption (aes128gcm, single record).
export async function encryptPayload(sub, plaintext) {
  const te = new TextEncoder();
  const uaPublic = unb64u(sub.keys.p256dh), authSecret = unb64u(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdh, concat(te.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(plaintext, new Uint8Array([2]))));
  const header = new Uint8Array(21 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, ct);
}

