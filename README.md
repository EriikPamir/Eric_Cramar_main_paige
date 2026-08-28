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
site.webmanifest        PWA/icon manifest

css/
  variables.css          Design tokens — colors (light+dark), fonts, spacing, radii. Start here for any visual tweak.
  base.css               Reset + global element defaults + layout utility classes (.container, .section, ...)
  components.css         Reusable pieces — nav, buttons, cards, forms, accordion, footer
  sections.css           Page-specific layout for each section (hero, services, work tiles, pricing, ...) + responsive rules
  animations.css         Scroll-reveal classes, hero motion, keyframes

js/
  theme.js               Light/dark toggle, persisted in localStorage
  nav.js                 Sticky header, mobile menu, active-link highlighting
  animations.js          Scroll-reveal (IntersectionObserver) + hero scroll-scrub + process stepper fill
  faq.js                 FAQ accordion open/close
  form.js                Start-a-Project form validation + submission (see below)

images/
  Logo.png               Studio mark — used as nav logo, hero centerpiece, and background accent
  favicon/                Generated favicon set (all sizes) — regenerate from Logo.png if the logo changes
```

## Before going live — things that still need real values

1. **Business email** — the contact form posts to [FormSubmit](https://formsubmit.co) using a placeholder address. Open `js/form.js` and replace `STUDIO_EMAIL` (top of the file) with the real inbox, then update the same address in `start-a-project.html`'s `<form action="...">`, and in the `mailto:` links in `index.html`, `privacy.html` and `terms.html`. FormSubmit will email that inbox a one-time confirmation link after the first real submission — click it once to activate.
2. **Social links** — commented-out, ready-to-use blocks are in `index.html` (footer and contact section, search for "Social links"). Uncomment and fill in real URLs when available.
3. **Phone number** (optional) — a commented example is next to the contact email in `index.html`.
4. **Legal pages** — `privacy.html` and `terms.html` are reasonable boilerplate, not legal advice. Have them reviewed before launch.
5. **Work / Showcase** — the five projects are demonstration placeholders (abstract illustrations, no real screenshots). Their "View Project" buttons are intentionally disabled until real case-study pages exist. Replace with real client work as it's completed.

## Editing tips

- Colors, fonts, spacing: everything lives in `css/variables.css` as CSS custom properties — change a value there and it updates everywhere.
- Adding a new FAQ question: copy one `.accordion-item` block in `index.html`'s `#faq` section — `js/faq.js` wires up any number of them automatically.
- Adding a new Work tile: copy one `<article class="work-tile">` block, alternate `section-alt`/no-class and the SVG's colors for visual rhythm.
