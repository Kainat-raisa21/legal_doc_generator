/* ========================================
   LEXFORGE — AI Legal Document Generator
   app.js — Main Application Logic
   ======================================== */

'use strict';

// ─── State ───────────────────────────────────────────────────────────────────
let selectedTone = 'formal';
let generatedDocument = '';
let isGenerating = false;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Set today's date as default effective date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('effectiveDate').value = today;

  // Restore API key from sessionStorage (not localStorage for security)
  const savedKey = sessionStorage.getItem('lf_api_key');
  if (savedKey) {
    document.getElementById('apiKey').value = savedKey;
  }
});

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function scrollToGenerator() {
  document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
}

function selectTone(btn) {
  document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedTone = btn.dataset.tone;
}

function selectDocType(card) {
  // Deselect all cards
  document.querySelectorAll('.doc-card').forEach(c => c.classList.remove('active'));
  card.classList.add('active');

  // Set the select value
  const docTypeSelect = document.getElementById('docType');
  const type = card.dataset.type;
  for (let opt of docTypeSelect.options) {
    if (opt.value === type) {
      docTypeSelect.value = type;
      break;
    }
  }

  // Scroll to generator
  setTimeout(() => scrollToGenerator(), 200);
  showToast(`📄 Selected: ${type}`, 'success');
}

function toggleApiKey() {
  const input = document.getElementById('apiKey');
  input.type = input.type === 'password' ? 'text' : 'password';
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.className = `toast ${type}`;
  }, 3200);
}

function setLoading(loading) {
  isGenerating = loading;
  const btn = document.getElementById('generateBtn');
  const btnText = document.getElementById('generateBtnText');
  const loader = document.getElementById('generateLoader');

  btn.disabled = loading;
  if (loading) {
    btnText.classList.add('hidden');
    loader.classList.remove('hidden');
  } else {
    btnText.classList.remove('hidden');
    loader.classList.add('hidden');
  }
}

function showOutputEmpty() {
  document.getElementById('outputEmpty').classList.remove('hidden');
  document.getElementById('outputContent').classList.add('hidden');
  document.getElementById('outputError').classList.add('hidden');
  document.getElementById('outputActions').style.display = 'none';
}

function showOutputContent(text, meta) {
  document.getElementById('outputEmpty').classList.add('hidden');
  document.getElementById('outputError').classList.add('hidden');
  document.getElementById('outputContent').classList.remove('hidden');
  document.getElementById('outputActions').style.display = 'flex';

  // Build meta tags
  const metaEl = document.getElementById('docMeta');
  metaEl.innerHTML = meta.map(m => `<span class="meta-tag">${m}</span>`).join('');

  // Set document text
  document.getElementById('docText').textContent = text;
}

function showOutputError(msg) {
  document.getElementById('outputEmpty').classList.add('hidden');
  document.getElementById('outputContent').classList.add('hidden');
  document.getElementById('outputError').classList.remove('hidden');
  document.getElementById('outputActions').style.display = 'none';
  document.getElementById('errorMsg').textContent = msg;
}

// ─── Document Actions ─────────────────────────────────────────────────────────
function copyDocument() {
  if (!generatedDocument) return;
  navigator.clipboard.writeText(generatedDocument)
    .then(() => showToast('✅ Copied to clipboard!', 'success'))
    .catch(() => showToast('❌ Copy failed. Please try manually.', 'error'));
}

function downloadDocument() {
  if (!generatedDocument) return;
  const docType = document.getElementById('docType').value || 'Legal_Document';
  const sanitized = docType.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `LexForge_${sanitized}_${Date.now()}.txt`;

  const blob = new Blob([generatedDocument], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
  showToast('📥 Document downloaded!', 'success');
}

function printDocument() {
  if (!generatedDocument) return;
  const docType = document.getElementById('docType').value || 'Legal Document';
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${docType}</title>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.8;
      margin: 1.5in 1.25in;
      color: #000;
      white-space: pre-wrap;
    }
    @media print {
      body { margin: 1in; }
    }
  </style>
</head>
<body>${escapeHtml(generatedDocument)}</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateInputs() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const docType = document.getElementById('docType').value;

  if (!apiKey) {
    showToast('🔑 Please enter your Anthropic API key', 'error');
    document.getElementById('apiKey').focus();
    return false;
  }
  if (!apiKey.startsWith('sk-ant-')) {
    showToast('⚠ API key should start with sk-ant-...', 'error');
    document.getElementById('apiKey').focus();
    return false;
  }
  if (!docType) {
    showToast('📄 Please select a document type', 'error');
    document.getElementById('docType').focus();
    return false;
  }
  return true;
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────
function buildPrompt({ docType, partyA, partyB, jurisdiction, effectiveDate, details, tone }) {
  const toneInstruction = {
    formal:     'Use highly formal legal language with precise technical terminology appropriate for court filing.',
    standard:   'Use professional but accessible legal language suitable for standard business use.',
    simplified: 'Use clear, plain English while maintaining legal accuracy. Minimize jargon for easy understanding.',
  }[tone] || 'Use professional legal language.';

  const partiesLine = [partyA && `Party A: ${partyA}`, partyB && `Party B: ${partyB}`]
    .filter(Boolean).join('\n') || 'Parties: [Party A] and [Party B] (use clear placeholders)';

  const jurisdictionLine = jurisdiction
    ? `Jurisdiction: ${jurisdiction}`
    : 'Jurisdiction: [JURISDICTION] (use placeholder)';

  const dateLine = effectiveDate
    ? `Effective Date: ${new Date(effectiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
    : 'Effective Date: [DATE]';

  const detailsSection = details
    ? `\nAdditional Details & Special Clauses:\n${details}\n`
    : '';

  return `You are an expert legal document drafter with decades of experience across all areas of law. Generate a comprehensive, professional, and legally sound ${docType}.

DOCUMENT REQUIREMENTS:
${partiesLine}
${jurisdictionLine}
${dateLine}${detailsSection}

TONE & STYLE:
${toneInstruction}

FORMATTING REQUIREMENTS:
1. Begin with a proper document title in capital letters
2. Include all standard sections appropriate for this document type
3. Use clear section headings (numbered or named)
4. Include all necessary legal clauses, warranties, representations, and boilerplate
5. Add signature blocks at the end for all parties
6. Include a governing law clause based on the specified jurisdiction
7. Add standard severability, entire agreement, and modification clauses
8. Use [BRACKETED PLACEHOLDERS] for any values not provided

IMPORTANT:
- Make this document comprehensive and complete — not a template summary
- Include all standard legal provisions for this document type
- Ensure the document would be enforceable in the specified jurisdiction
- Do not add commentary, explanations, or disclaimers within the document itself
- Output ONLY the legal document text, nothing before or after it

Generate the complete ${docType} now:`;
}

// ─── Main Generator ───────────────────────────────────────────────────────────
async function generateDocument() {
  if (isGenerating) return;
  if (!validateInputs()) return;

  const apiKey = document.getElementById('apiKey').value.trim();
  const docType = document.getElementById('docType').value;
  const partyA = document.getElementById('partyA').value.trim();
  const partyB = document.getElementById('partyB').value.trim();
  const jurisdiction = document.getElementById('jurisdiction').value.trim();
  const effectiveDate = document.getElementById('effectiveDate').value;
  const details = document.getElementById('details').value.trim();

  // Save key to session (NOT localStorage)
  sessionStorage.setItem('lf_api_key', apiKey);

  setLoading(true);
  showOutputEmpty();

  const prompt = buildPrompt({ docType, partyA, partyB, jurisdiction, effectiveDate, details, tone: selectedTone });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `API error: ${response.status} ${response.statusText}`;

      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your Anthropic API key and try again.');
      } else if (response.status === 429) {
        throw new Error('Rate limit reached. Please wait a moment and try again.');
      } else if (response.status === 400) {
        throw new Error(`Bad request: ${errMsg}`);
      } else {
        throw new Error(errMsg);
      }
    }

    const data = await response.json();

    const content = data?.content;
    if (!content || !Array.isArray(content) || content.length === 0) {
      throw new Error('No content received from the AI. Please try again.');
    }

    const documentText = content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    if (!documentText.trim()) {
      throw new Error('The AI returned an empty document. Please adjust your details and try again.');
    }

    generatedDocument = documentText;

    // Build meta tags
    const meta = [];
    meta.push(docType);
    if (jurisdiction) meta.push(`📍 ${jurisdiction}`);
    if (partyA) meta.push(`👤 ${partyA}`);
    if (partyB) meta.push(`👥 ${partyB}`);
    meta.push(`Tone: ${selectedTone.charAt(0).toUpperCase() + selectedTone.slice(1)}`);

    showOutputContent(documentText, meta);
    showToast('✅ Document generated successfully!', 'success');

    // Scroll to output
    document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error('Generation error:', err);
    showOutputError(err.message || 'An unexpected error occurred. Please check your API key and try again.');
    showToast('❌ Generation failed', 'error');
  } finally {
    setLoading(false);
  }
}

// ─── Keyboard Shortcut: Ctrl+Enter to generate ────────────────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (!isGenerating) generateDocument();
  }
});

// ─── Sync doc type select → card highlight ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('docType');
  select.addEventListener('change', () => {
    const val = select.value;
    document.querySelectorAll('.doc-card').forEach(card => {
      card.classList.toggle('active', card.dataset.type === val);
    });
  });
});
