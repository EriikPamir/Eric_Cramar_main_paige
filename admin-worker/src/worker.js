/* Tiny backend for the Eric Kramar Studio admin panel (admin.html on the
   static site). Cloudflare Worker, no framework — matches the plain-JS
   spirit of the rest of the project. It has exactly one job: let Eric log
   in with a login+password emailed fresh each time, then let him commit
   changes to data/projects.json, data/pricing.json and new screenshot
   files straight into the GitHub repo (which GitHub Pages then rebuilds).

   Routes (all under /api/):
     POST /request-code   generate a fresh one-time login+password, email it
     POST /login          exchange that login+password for a session cookie
     POST /logout          clear the session cookie
     GET  /session          200 if the session cookie is still valid
     GET  /data              current projects.json + pricing.json
     POST /projects            overwrite data/projects.json
     POST /pricing              overwrite data/pricing.json
     POST /upload           commit an uploaded screenshot, return its path

   State: the only server-side state is the single pending login/password
   pair, held in Workers KV with a 15-minute TTL so it disappears on its
   own if never used. Sessions are stateless signed cookies — no KV needed
   for those. */

const SESSION_COOKIE = "eks_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h
const CODE_TTL_SECONDS = 60 * 15; // 15m

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      let response;
      if (url.pathname === "/api/request-code" && request.method === "POST") {
        response = await handleRequestCode(env);
      } else if (url.pathname === "/api/login" && request.method === "POST") {
        response = await handleLogin(request, env);
      } else if (url.pathname === "/api/logout" && request.method === "POST") {
        response = handleLogout();
      } else if (url.pathname === "/api/session" && request.method === "GET") {
        response = await handleSessionCheck(request, env);
      } else if (url.pathname === "/api/data" && request.method === "GET") {
        response = await withAuth(request, env, () => handleGetData(env));
      } else if (url.pathname === "/api/projects" && request.method === "POST") {
        response = await withAuth(request, env, () => handleSaveJsonFile(request, env, "data/projects.json"));
      } else if (url.pathname === "/api/pricing" && request.method === "POST") {
        response = await withAuth(request, env, () => handleSaveJsonFile(request, env, "data/pricing.json"));
      } else if (url.pathname === "/api/upload" && request.method === "POST") {
        response = await withAuth(request, env, () => handleUpload(request, env));
      } else {
        response = jsonResponse({ error: "Not found" }, 404);
      }

      return withCors(response, cors);
    } catch (err) {
      return withCors(jsonResponse({ error: String((err && err.message) || err) }, 500), cors);
    }
  },
};

/* ---------------- Auth ---------------- */

async function handleRequestCode(env) {
  const login = randomToken(8);
  const password = randomToken(12);

  await env.ADMIN_KV.put(
    "pending_credential",
    JSON.stringify({ login, password }),
    { expirationTtl: CODE_TTL_SECONDS }
  );

  await sendEmail(
    env,
    "Your Eric Kramar Studio admin login",
    "<p>Login: <strong>" + login + "</strong></p>" +
      "<p>Password: <strong>" + password + "</strong></p>" +
      "<p>This code expires in 15 minutes and can only be used once.</p>"
  );

  return jsonResponse({ ok: true });
}

async function handleLogin(request, env) {
  const body = await request.json().catch(() => ({}));
  const raw = await env.ADMIN_KV.get("pending_credential");
  if (!raw) return jsonResponse({ error: "No pending code — request a new one." }, 401);

  const pending = JSON.parse(raw);
  if (body.username !== pending.login || body.password !== pending.password) {
    return jsonResponse({ error: "Incorrect login or password." }, 401);
  }

  await env.ADMIN_KV.delete("pending_credential"); // single use

  const token = await signSession(env, Date.now() + SESSION_TTL_SECONDS * 1000);
  const response = jsonResponse({ ok: true });
  response.headers.append("Set-Cookie", buildCookie(SESSION_COOKIE, token, SESSION_TTL_SECONDS));
  return response;
}

function handleLogout() {
  const response = jsonResponse({ ok: true });
  response.headers.append("Set-Cookie", buildCookie(SESSION_COOKIE, "", 0));
  return response;
}

async function handleSessionCheck(request, env) {
  const valid = await isSessionValid(request, env);
  return jsonResponse({ ok: valid });
}

async function withAuth(request, env, handler) {
  const valid = await isSessionValid(request, env);
  if (!valid) return jsonResponse({ error: "Not authenticated" }, 401);
  return handler();
}

async function isSessionValid(request, env) {
  const cookie = getCookie(request, SESSION_COOKIE);
  if (!cookie) return false;
  return verifySession(env, cookie);
}

/* ---------------- Data endpoints ---------------- */

async function handleGetData(env) {
  const [projects, pricing] = await Promise.all([
    githubGetFile(env, "data/projects.json"),
    githubGetFile(env, "data/pricing.json"),
  ]);
  return jsonResponse({
    projects: projects ? JSON.parse(projects.content) : null,
    pricing: pricing ? JSON.parse(pricing.content) : null,
  });
}

async function handleSaveJsonFile(request, env, path) {
  const body = await request.json().catch(() => null);
  if (!body) return jsonResponse({ error: "Invalid JSON body" }, 400);

  const existing = await githubGetFile(env, path);
  await githubPutFile(
    env,
    path,
    JSON.stringify(body, null, 2) + "\n",
    "Admin panel: update " + path,
    existing ? existing.sha : undefined
  );
  return jsonResponse({ ok: true });
}

async function handleUpload(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !body.filename || !body.contentBase64) {
    return jsonResponse({ error: "Missing filename or contentBase64" }, 400);
  }

  const safeName = body.filename.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const path = "images/portfolio/" + Date.now() + "-" + safeName;

  await githubPutBase64File(env, path, body.contentBase64, "Admin panel: upload " + safeName);
  return jsonResponse({ ok: true, path });
}

/* ---------------- GitHub Contents API ---------------- */

async function githubGetFile(env, path) {
  const res = await githubFetch(env, path);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("GitHub read failed for " + path + ": " + res.status);
  const data = await res.json();
  return { sha: data.sha, content: utf8FromBase64(data.content) };
}

async function githubPutFile(env, path, contentString, message, sha) {
  return githubPutBase64File(env, path, utf8ToBase64(contentString), message, sha);
}

async function githubPutBase64File(env, path, base64Content, message, sha) {
  const body = {
    message,
    content: base64Content,
    branch: env.GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await githubFetch(env, path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("GitHub write failed for " + path + ": " + res.status + " " + text);
  }
  return res.json();
}

function githubFetch(env, path, init) {
  const url =
    "https://api.github.com/repos/" +
    env.GITHUB_OWNER +
    "/" +
    env.GITHUB_REPO +
    "/contents/" +
    path +
    "?ref=" +
    env.GITHUB_BRANCH;

  return fetch(url, {
    ...init,
    headers: {
      Authorization: "Bearer " + env.GITHUB_TOKEN,
      "User-Agent": "eks-admin-worker",
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(init && init.headers),
    },
  });
}

/* ---------------- Email (Resend) ---------------- */

async function sendEmail(env, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Eric Kramar Studio Admin <onboarding@resend.dev>",
      to: [env.ADMIN_EMAIL],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Failed to send email: " + res.status + " " + text);
  }
}

/* ---------------- Sessions (HMAC-signed, stateless) ---------------- */

async function signSession(env, expiresAt) {
  const payload = base64urlEncode(JSON.stringify({ exp: expiresAt }));
  const signature = await hmacSign(env.SESSION_SECRET, payload);
  return payload + "." + signature;
}

async function verifySession(env, token) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  const expected = await hmacSign(env.SESSION_SECRET, payload);
  if (!timingSafeEqual(signature, expected)) return false;

  try {
    const data = JSON.parse(base64urlDecode(payload));
    return typeof data.exp === "number" && Date.now() < data.exp;
  } catch (e) {
    return false;
  }
}

async function hmacSign(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return base64urlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

/* ---------------- Small helpers ---------------- */

function randomToken(length) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function base64urlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  return atob(padded);
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function utf8FromBase64(base64) {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function buildCookie(name, value, maxAgeSeconds) {
  return (
    name +
    "=" +
    encodeURIComponent(value) +
    "; Max-Age=" +
    maxAgeSeconds +
    "; Path=/; HttpOnly; Secure; SameSite=None"
  );
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

function withCors(response, cors) {
  const merged = new Response(response.body, response);
  Object.entries(cors).forEach(([key, value]) => merged.headers.set(key, value));
  return merged;
}
