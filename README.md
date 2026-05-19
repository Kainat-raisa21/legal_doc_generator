# ⚖ LexForge — AI Legal Document Generator

A fully client-side AI legal document generator powered by a **LangGraph-inspired multi-agent state machine** and **Llama 3.3 70B** via Groq's free API. No backend required — deploy directly to GitHub Pages.

## 🚀 Quick Start (GitHub Pages)

1. **Fork or clone** this repository
2. Go to **Settings → Pages** in your GitHub repo
3. Set source to `main` branch, `/ (root)` folder
4. Your site will be live at `https://yourusername.github.io/your-repo-name`

## 🔑 Getting a Free Groq API Key

1. Visit [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Go to **API Keys** and create a new key
4. Paste the key (`gsk_...`) into the **⚙ Configuration** panel on the site

**Groq free tier** includes generous rate limits for Llama 3.3 70B — more than enough for personal use.

## 🧠 How the AI Agent Works

LexForge uses a **LangGraph-style state machine** with 4 specialized nodes:

```
User Input
    │
    ▼
┌─────────┐     ┌──────────┐     ┌───────┐     ┌────────┐
│ ANALYZE │ ──► │ CLARIFY  │ ──► │ DRAFT │ ──► │ REVIEW │
│         │     │ (loop)   │     │       │     │        │
│ Extract │     │ Ask key  │     │ Full  │     │ Check  │
│ context │     │questions │     │ doc   │     │quality │
└─────────┘     └──────────┘     └───────┘     └────────┘
```

- **Analyze** — Extracts document type, parties, jurisdiction, and missing info from your request
- **Clarify** — Asks targeted follow-up questions (up to your configured max)
- **Draft** — Generates the complete legal document with proper sections and clauses
- **Review** — Checks completeness and flags potential issues

## 📄 Supported Document Types

- Non-Disclosure Agreement (NDA)
- Employment Contract
- Lease Agreement
- Independent Contractor Agreement
- Service Agreement
- Partnership Agreement
- Terms of Service
- Privacy Policy
- Loan Agreement
- LLC Operating Agreement
- Will & Testament
- Settlement Agreement
- Power of Attorney
- Cease & Desist Letter
- IP Assignment Agreement
- Promissory Note

## ⚙ Configuration Options

| Setting | Description |
|---|---|
| Groq API Key | Your free key from console.groq.com |
| Jurisdiction | Legal jurisdiction for document context |
| Formality Level | Professional / Formal / Plain English |
| Max Clarifying Questions | 2 (quick) / 4 (balanced) / 6 (thorough) |

## 🛠 Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript — zero dependencies
- **AI Agent**: LangGraph-inspired state machine (pure JS)
- **LLM**: Llama 3.3 70B Versatile via Groq API (free tier)
- **Hosting**: GitHub Pages (no server needed)

## 📁 File Structure

```
├── index.html   — Main UI
├── style.css    — White & purple theme
├── agent.js     — LangGraph state machine + LLM nodes
├── app.js       — UI logic, document types, config
└── README.md    — This file
```

## ⚠ Legal Disclaimer

LexForge generates document drafts for **informational and starting-point purposes only**. Documents produced are not a substitute for professional legal advice. Always have important legal documents reviewed by a licensed attorney in your jurisdiction before signing or relying on them.

## 📜 License

MIT License — free to use, modify, and distribute.
