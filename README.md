# ⚖ LexForge — AI Legal Document Generator

A beautiful, production-grade AI-powered legal document generator built with vanilla HTML, CSS, and JavaScript. Powered by Claude (Anthropic AI).

## Features

- 🤖 **AI-powered drafting** via Claude (Anthropic API)
- 📄 **20+ document types** — NDAs, contracts, leases, policies, and more
- 🌍 **Jurisdiction-aware** — documents tailored to your specified region
- 🎨 **Premium white & purple design** with responsive layout
- 📥 **Download / Copy / Print** generated documents
- 🔒 **No backend required** — API key used client-side only (never stored)
- ⚡ **Single page app** — just 3 files to host

---

## Quick Start (GitHub Pages)

### 1. Create a new repository on GitHub

Name it anything, e.g. `lexforge` or `legal-doc-generator`.

### 2. Upload the files

Upload these three files to your repository root:
```
index.html
style.css
app.js
```

### 3. Enable GitHub Pages

1. Go to **Settings → Pages**
2. Under **Source**, select **main** branch and **/ (root)**
3. Click **Save**
4. Your site will be live at: `https://yourusername.github.io/repositoryname`

---

## Usage

1. **Get an Anthropic API key** at [console.anthropic.com](https://console.anthropic.com)
2. Open the site and enter your API key in the form
3. Select a document type (or pick from the card grid)
4. Fill in party names, jurisdiction, effective date
5. Add any special clauses in the details box
6. Click **Generate Legal Document**
7. Copy, download, or print the result

**Keyboard shortcut:** `Ctrl+Enter` (or `Cmd+Enter` on Mac) to generate

---

## File Structure

```
├── index.html    # Main HTML structure & layout
├── style.css     # All styles — white/purple theme
├── app.js        # AI generation logic & UI interactions
└── README.md     # This file
```

---

## Tech Stack

- **Pure HTML5 / CSS3 / Vanilla JS** — no frameworks, no build step
- **Anthropic API** (`claude-sonnet-4-20250514`) — document generation
- **Google Fonts** — Cormorant Garamond + Outfit + DM Mono
- **CSS Custom Properties** — full theme system

---

## Legal Disclaimer

LexForge is not a law firm and does not provide legal advice. Documents generated are AI-drafted templates for informational purposes only. Always consult a qualified attorney before executing any legal document.

---

## Customization

### Change the color theme
Edit the CSS variables at the top of `style.css`:
```css
:root {
  --purple-600: #6d28d9;  /* Main brand color */
  --purple-500: #7c3aed;  /* Accent */
  /* ... */
}
```

### Add more document types
In `index.html`, add `<option>` elements to the `#docType` select, and optionally add a new `.doc-card` in the grid.

### Change the AI model
In `app.js`, find the `generateDocument` function and update:
```js
model: 'claude-sonnet-4-20250514',
```
