# Eric Kramar Studio LLC — Website

Premium marketing site for Eric Kramar Studio LLC — a small independent digital studio (Pennsylvania, USA). Positioning: *"We build the digital presence your business deserves."*

Plain HTML/CSS/JS — no build step, no framework. Open any file and edit it directly; refresh the browser to see the change.

## Running locally

No install needed. Either open `index.html` directly in a browser, or serve it locally (recommended, so relative paths and the theme toggle behave exactly like production):

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Structure

```
index.html              Home page — hero, services, work, process, pricing, about, why-us, FAQ, contact
start-a-project.html    Dedicated project-inquiry form
privacy.html            Privacy Policy (draft — have a lawyer review before relying on it)
terms.html              Terms of Service (draft — same caveat)
admin.html              Owner-only panel — edit pricing, upload work screenshots (see "Admin panel" below)
site.webmanifest        PWA/icon manifest

data/
  projects.json          Work-tile screenshots (keyed "01"-"05") + any admin-added portfolio tiles ("extra")
  pricing.json           Admin-editable overrides for the 4 pricing cards' name/price

css/
  variables.css          Design tokens — colors (light+dark), fonts, spacing, radii. Start here for any visual tweak.
  base.css               Reset + global element defaults + layout utility classes (.container, .section, ...)
  components.css         Reusable pieces — nav, buttons, cards, forms, accordion, footer, gallery lightbox
  sections.css           Page-specific layout for each section (hero, services, work tiles, pricing, ...) + responsive rules
  animations.css         Scroll-reveal classes, hero motion, keyframes
  admin.css              Bare-bones styling for admin.html only

js/
  i18n-data.js           Translation dictionaries (en/ru/es) — see "Languages" below
  i18n.js                Applies translations based on data-i18n attributes + the language switcher
  theme.js               Light/dark toggle, persisted in localStorage
  nav.js                 Sticky header, mobile menu, active-link highlighting
  animations.js          Scroll-reveal (IntersectionObserver) + hero scroll-scrub + process stepper fill
  faq.js                 FAQ accordion open/close
  form.js                Start-a-Project form validation + submission (see below)
  particle-logo.js       Renders every [data-particle-logo] (hero + about) as an interactive
                         particle field sampled from images/Logo.png — glow colors, idle
                         wander, hover/scroll scatter strength are tunable constants at the top
  cube.js                Cursor-tracking 3D cube (Luxury/3D Product work tile), pure CSS 3D
  node-network.js        Animated node graph (AI/Technology work tile), canvas-based
  project-gallery.js     Powers the "View Project" lightbox from data/projects.json + renders
                         any admin-added portfolio tiles after the built-in five
  pricing-override.js    Applies data/pricing.json's name/price on top of the static defaults
  admin.js               Front-end for admin.html — talks to the Worker in admin-worker/

images/
  Logo.png               Studio mark — used as nav logo, hero centerpiece, and background accent
  favicon/                Generated favicon set (all sizes) — regenerate from Logo.png if the logo changes
  portfolio/              Screenshots uploaded through admin.html land here automatically

admin-worker/            Cloudflare Worker source — the only backend piece; GitHub Pages
                         itself serves everything above as static files. See "Admin panel" below.
```

## Before going live — things that still need real values

1. **Business email** — set to `contact@erickramar.com` in `js/form.js` (`STUDIO_EMAIL`), `start-a-project.html`'s form action, and the `mailto:` links across the site. FormSubmit will email that inbox a one-time confirmation link after the first real submission — click it once to activate delivery.
2. **Social links** — not set up yet. Commented-out, ready-to-use blocks are in `index.html` (footer and contact section, search for "Social links"). Uncomment and fill in real URLs once profiles exist.
3. **Phone number** (optional) — a commented example is next to the contact email in `index.html`.
4. **Legal pages** — `privacy.html` and `terms.html` are a thorough, US-small-business-oriented draft (CCPA/COPPA-aware privacy policy, Pennsylvania-governed terms with a standard liability cap). They were written to a good US-law standard but are still AI-drafted, not attorney-certified — worth a quick pass by a Pennsylvania attorney before relying on them commercially, especially once e-commerce/payment flows are involved.
5. **Work / Showcase** — the five projects are demonstration placeholders (abstract illustrations, no real screenshots). Their "View Project" buttons open a lightbox gallery fed by `data/projects.json`; add real screenshots through `admin.html` as client work is completed (see "Admin panel" below) — until then they show a "coming soon" message.
6. **Admin panel backend** — `admin.html` needs `admin-worker/` deployed and `js/admin.js`'s `API_BASE` pointed at it before it works (see "Admin panel" below). Until then the page loads fine but every action fails with "Failed to fetch".

## Languages

The site supports English, Russian and Spanish via a small custom i18n system (no framework):

- All translatable text lives in `js/i18n-data.js` as three objects (`en`, `ru`, `es`) keyed by strings like `"hero.title"`. **Edit copy there, not in the HTML.**
- The HTML only carries `data-i18n="key"` (sets an element's text), `data-i18n-html="key"` (sets innerHTML — only used where a translation needs an inline tag, e.g. a `<br>` or `<strong>`), or `data-i18n-<attribute>="key"` (sets that attribute, e.g. `data-i18n-placeholder`, `data-i18n-aria-label`, `data-i18n-content`).
- `js/i18n.js` reads the visitor's saved choice from `localStorage` (defaults to English) and applies it on load; the switcher buttons in the nav (`<div class="lang-switch">`) call it directly.
- **To add a new translatable string**: add the key to all three objects in `js/i18n-data.js`, then add the matching `data-i18n` attribute to the HTML element (keep the English text as the element's own content — it's the fallback if a key is ever missing).
- **To add a fourth language**: add a new key (e.g. `"fr"`) to the object in `js/i18n-data.js` with the same set of keys as `en`, add a button (`<button type="button" data-lang="fr">FR</button>`) to each `.lang-switch` block across all 4 HTML files, and add `"fr"` to `I18N_SUPPORTED` in `js/i18n.js`.
- Form field `name`/`value` attributes in `start-a-project.html` are intentionally left in English regardless of UI language, so inquiry emails stay consistently readable — only the visible labels are translated.
- The RU/ES translations (including the legal pages) were AI-translated; they read naturally but haven't been checked by a native-speaking attorney — worth a pass if the business leans on them commercially outside English.

## Editing tips

- Colors, fonts, spacing: everything lives in `css/variables.css` as CSS custom properties — change a value there and it updates everywhere.
- Adding a new FAQ question: copy one `.accordion-item` block in `index.html`'s `#faq` section — `js/faq.js` wires up any number of them automatically.
- Adding a new Work tile: copy one `<article class="work-tile">` block, alternate `section-alt`/no-class and the SVG's colors for visual rhythm.
- **After editing any CSS or JS file, browsers may keep serving the old cached copy.** Every `<link>`/`<script>` tag has a `?v=N` on the end — bump that number (in all 4 HTML files) whenever you change a CSS/JS file and want visitors' browsers to fetch the new version immediately instead of waiting for their cache to expire.

## Admin panel (`admin.html`)

GitHub Pages only serves static files, so the parts that need to actually
*do* something — email a login code, save an upload, commit a JSON edit —
live in a small [Cloudflare Worker](https://developers.cloudflare.com/workers/)
in `admin-worker/`. It's the only backend piece in this whole project;
everything else stays plain HTML/CSS/JS. One-time setup:

1. **GitHub token** — create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) scoped to just this repo, with **Contents: Read and write** permission.
2. **Resend account** — sign up free at [resend.com](https://resend.com) and copy an API key. The free tier can email your own verified address without setting up a custom domain, which is all this needs.
3. **Cloudflare account** — sign up free at [cloudflare.com](https://cloudflare.com), then install Wrangler and log in:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
4. **Create the KV namespace** the Worker uses to hold the pending login code:
   ```bash
   cd admin-worker
   wrangler kv namespace create ADMIN_KV
   ```
   Paste the `id` it prints into `wrangler.toml`'s `kv_namespaces` block.
5. **Set the secrets** (never written to `wrangler.toml` or committed):
   ```bash
   wrangler secret put GITHUB_TOKEN
   wrangler secret put SESSION_SECRET   # any long random string
   wrangler secret put RESEND_API_KEY
   ```
6. **Deploy**:
   ```bash
   wrangler deploy
   ```
   It prints your Worker's URL (`https://eks-admin.<your-subdomain>.workers.dev`).
7. Paste that URL into `js/admin.js`'s `API_BASE` constant, bump the cache-busting version, commit and push.

After that, opening `admin.html` lets you request a one-time login+password
by email, log in, upload screenshots to any work tile (or add a brand new
one), and edit the 4 pricing cards' name/price — every save commits
straight to this repo, so the live site updates within about a minute.
