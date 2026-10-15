/* Starlight Hospice contact form backend: the Cloudflare Worker starlighthospice-contact, on the route www.starlighthospice.org/api/contact*.
   The website itself stays on GitHub Pages. This Worker only answers that one address: it checks the message,
   then emails it to the office through Resend. Nothing is stored here.

   Secret:   RESEND_API_KEY (from this folder: npx wrangler secret put RESEND_API_KEY)
   Settings: CONTACT_TO, CONTACT_FROM, ALLOWED_ORIGINS and the CONTACT_LIMITER rate limit, in wrangler.jsonc
   Deploy:   from this folder, npx wrangler deploy */

const MAX_BODY_BYTES = 20000;
const MIN_FILL_MS = 1500; /* faster than any person can fill the form; such posts are asked to send again */
const PHONE = "(323) 282-7679";
const FAILURE = `Sorry, your message could not be sent. Please call us at ${PHONE}, any time of day.`;

const LIMITS = { name: 120, phone: 40, email: 160, relationship: 60, preferred: 10, message: 4000 };

/* Must match the options in contact.html */
const RELATIONSHIPS = new Set([
  "Myself",
  "A family member",
  "A friend",
  "A patient (I am a healthcare professional)",
  "Other",
]);
const PREFERRED = new Set(["Phone", "Email"]);

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (err) {
      console.error("contact: unexpected error", err && err.message);
      return reply(request, 500, { ok: false, message: FAILURE });
    }
  },
};

async function handle(request, env) {
  if (request.method !== "POST") {
    return json(405, { ok: false, message: "Method not allowed." }, { Allow: "POST" });
  }

  /* Only the website may post here. Browsers send Origin on every form post and fetch POST. */
  const url = new URL(request.url);
  const allowed = new Set([url.origin, ...list(env.ALLOWED_ORIGINS)]);
  const origin = request.headers.get("Origin");
  if (!origin || !allowed.has(origin)) {
    return json(403, { ok: false, message: "Forbidden." });
  }

  if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY_BYTES) {
    return reply(request, 413, { ok: false, message: "That message is too long. Please shorten it and try again." });
  }

  if (env.CONTACT_LIMITER) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const { success } = await env.CONTACT_LIMITER.limit({ key: `contact:${ip}` });
    if (!success) {
      return reply(request, 429, { ok: false, message: `Too many messages in a short time. Please wait a minute and try again, or call us at ${PHONE}.` });
    }
  }

  const raw = await readBody(request);
  if (!raw) {
    return reply(request, 400, { ok: false, message: `We could not read that message. Please try again, or call us at ${PHONE}.` });
  }

  /* Spam trap: a hidden field people never see. Bots that fill it get a quiet success. */
  if (clean(raw.website, 200)) {
    return reply(request, 200, { ok: true });
  }
  /* A form sent within moments of the page loading is almost certainly a bot, but ask instead of dropping it,
     so a fast person with autofill is never silently lost. */
  const started = Number(raw.started || 0);
  if (started && Date.now() - started < MIN_FILL_MS) {
    return reply(request, 422, { ok: false, message: "Please check your details, then press Send message again." });
  }

  const data = {};
  for (const [key, max] of Object.entries(LIMITS)) data[key] = clean(raw[key], max, key === "message");
  if (!PREFERRED.has(data.preferred)) data.preferred = "Phone";

  const errors = validate(data);
  if (Object.keys(errors).length) {
    const count = Object.keys(errors).length;
    return reply(request, 422, { ok: false, message: count === 1 ? "1 field needs attention." : `${count} fields need attention.`, errors });
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
    console.error("contact: RESEND_API_KEY, CONTACT_TO or CONTACT_FROM is not configured");
    return reply(request, 503, { ok: false, message: FAILURE });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: list(env.CONTACT_TO),
      ...(data.email ? { reply_to: data.email } : {}),
      subject: `Website message from ${data.name}`,
      text: emailText(data),
      html: emailHtml(data),
      tags: [{ name: "source", value: "website_contact" }],
    }),
  });

  if (!res.ok) {
    /* Log the status and Resend's reason only, never the visitor's details */
    const detail = await res.text().catch(() => "");
    console.error("contact: Resend rejected the message", res.status, detail.slice(0, 300));
    return reply(request, 502, { ok: false, message: FAILURE });
  }

  return reply(request, 200, { ok: true });
}

/* Helpers */

function list(value) {
  return String(value || "").split(",").map((s) => s.trim()).filter(Boolean);
}

async function readBody(request) {
  const type = (request.headers.get("Content-Type") || "").toLowerCase();
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    if (type.includes("application/x-www-form-urlencoded")) return Object.fromEntries(new URLSearchParams(text));
    if (type.includes("application/json")) {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    }
  } catch {
    return null;
  }
  return null;
}

function clean(value, max, multiline = false) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  let s = String(value).normalize("NFC");
  /* Strip control characters (the message keeps its line breaks and tabs) and invisible direction marks */
  s = multiline ? s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") : s.replace(/[\u0000-\u001F\u007F]/g, " ");
  s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "").trim();
  return s.slice(0, max);
}

/* Same rules and wording as the checks in main.js, keyed by field name */
function validate(d) {
  const e = {};
  if (!d.name) e.name = "Enter your full name.";
  if (!/\d{3}.*\d{3}.*\d{4}/.test(d.phone)) e.phone = "Enter a phone number with area code, for example (323) 555-0100.";
  if (d.email && !/^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[A-Za-z]{2,}$/.test(d.email)) e.email = "Enter an email address in the format name@example.com.";
  if (!RELATIONSHIPS.has(d.relationship)) e.relationship = "Choose who the care is for.";
  return e;
}

function rows(d) {
  return [
    ["Name", d.name],
    ["Phone", d.phone],
    ["Email", d.email || "Not given"],
    ["Care is for", d.relationship],
    ["Best way to reach", d.preferred],
  ];
}

function closing(d) {
  return d.email ? `Reply to this email to answer ${d.name} directly.` : `No email address was given. Call ${d.name} at ${d.phone}.`;
}

function emailText(d) {
  return [
    "New message from the contact form at starlighthospice.org",
    "",
    ...rows(d).map(([k, v]) => `${k}: ${v}`),
    "",
    "Message:",
    d.message || "(No message)",
    "",
    closing(d),
  ].join("\n");
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function emailHtml(d) {
  const tel = d.phone.replace(/[^\d+]/g, "");
  const tr = rows(d).map(([k, v]) => {
    const value = k === "Phone" ? `<a href="tel:${esc(tel)}" style="color:#283891">${esc(v)}</a>` : esc(v);
    return `<tr><th scope="row" style="padding:8px 16px 8px 0;color:#5b6181;font:15px/1.4 Arial,sans-serif;text-align:left;vertical-align:top;white-space:nowrap">${esc(k)}</th><td style="padding:8px 0;color:#0b1030;font:16px/1.5 Arial,sans-serif">${value}</td></tr>`;
  }).join("");
  return `<!doctype html><html lang="en"><body style="margin:0;padding:32px 16px;background:#f3f4f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;border-top:6px solid #feca34">
<tr><td style="padding:32px">
<p style="margin:0 0 6px;color:#283891;font:bold 15px/1.4 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase">Starlight Hospice website</p>
<h1 style="margin:0 0 20px;color:#0b1030;font:normal 26px/1.25 Arial,sans-serif">New message from ${esc(d.name)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0">${tr}</table>
<h2 style="margin:28px 0 8px;color:#283891;font:bold 15px/1.4 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase">Message</h2>
<p style="margin:0 0 28px;color:#0b1030;font:16px/1.6 Arial,sans-serif;white-space:pre-wrap">${esc(d.message || "(No message)")}</p>
<p style="margin:0;color:#5b6181;font:15px/1.5 Arial,sans-serif">${esc(closing(d))}</p>
</td></tr></table></body></html>`;
}

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...SECURITY_HEADERS, ...extra },
  });
}

/* JSON for main.js, and a small page of its own for a visitor whose browser posted the form without JavaScript */
function reply(request, status, body) {
  const accept = request.headers.get("Accept") || "";
  const type = request.headers.get("Content-Type") || "";
  if (accept.includes("application/json") || type.includes("application/json")) return json(status, body);

  const title = body.ok ? "Message sent" : "Message not sent";
  const lead = body.ok ? "Thank you. Your message was sent. A member of our team will contact you soon." : body.message;
  const items = Object.values(body.errors || {}).map((m) => `<li>${esc(m)}</li>`).join("");
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} | Starlight Hospice</title>
<style>
body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; box-sizing: border-box; background: #0b1030; color: #0b1030; font: 18px/1.6 Varela, Arial, sans-serif; }
main { max-width: 34rem; padding: 40px 32px; border-radius: 24px; background: #ffffff; border-top: 6px solid #feca34; }
img { display: block; margin-bottom: 20px; }
h1 { margin: 0 0 12px; font-size: 2rem; line-height: 1.2; font-weight: normal; }
p, ul { margin: 0 0 16px; color: #3b4160; }
a { color: #283891; text-underline-offset: .2em; }
a:focus-visible { outline: 3px solid #283891; outline-offset: 3px; border-radius: 4px; }
</style>
</head>
<body>
<main>
<img src="/logo.png" alt="Starlight Hospice" width="64" height="64">
<h1>${title}</h1>
<p>${esc(lead)}</p>
${items ? `<ul>${items}</ul>` : ""}
<p>${body.ok ? "" : `You can also call us at <a href="tel:+13232827679">${PHONE}</a>, any time of day. `}<a href="/contact.html">Back to the contact page</a></p>
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      ...SECURITY_HEADERS,
    },
  });
}
