/**
 * LexForge — App Logic
 * Handles UI, document types, config, and agent orchestration
 */

// ══════════════════════════════════════════
//  DOCUMENT TYPES
// ══════════════════════════════════════════

const DOC_TYPES = [
  { icon: '🤝', name: 'Non-Disclosure Agreement', desc: 'Protect confidential information between parties', short: 'NDA' },
  { icon: '📋', name: 'Employment Contract', desc: 'Full-time or part-time employment terms', short: 'Employment' },
  { icon: '🏠', name: 'Lease Agreement', desc: 'Residential or commercial property rental', short: 'Lease' },
  { icon: '🤝', name: 'Independent Contractor Agreement', desc: 'Freelancer or contractor services', short: 'Contractor' },
  { icon: '💼', name: 'Service Agreement', desc: 'Business service terms and conditions', short: 'Service' },
  { icon: '📊', name: 'Partnership Agreement', desc: 'Business partnership terms and profit sharing', short: 'Partnership' },
  { icon: '🛒', name: 'Terms of Service', desc: 'Website or app terms for users', short: 'ToS' },
  { icon: '🔒', name: 'Privacy Policy', desc: 'Data collection and usage disclosure', short: 'Privacy' },
  { icon: '💰', name: 'Loan Agreement', desc: 'Personal or business loan terms', short: 'Loan' },
  { icon: '🏢', name: 'LLC Operating Agreement', desc: 'LLC structure, rights and responsibilities', short: 'LLC' },
  { icon: '📜', name: 'Will & Testament', desc: 'Last will and estate distribution', short: 'Will' },
  { icon: '⚖', name: 'Settlement Agreement', desc: 'Dispute resolution and settlement terms', short: 'Settlement' },
  { icon: '🔑', name: 'Power of Attorney', desc: 'Legal authority delegation document', short: 'POA' },
  { icon: '📝', name: 'Cease & Desist Letter', desc: 'Formal demand to stop an action', short: 'C&D' },
  { icon: '💡', name: 'IP Assignment Agreement', desc: 'Transfer of intellectual property rights', short: 'IP Transfer' },
  { icon: '🤲', name: 'Promissory Note', desc: 'Written promise to pay a specified sum', short: 'Promissory' },
];

// ══════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════

let selectedDocType = null;
let isProcessing    = false;
let currentDoc      = '';
let currentDocType  = '';
let configVisible   = false;

// ══════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════

function getConfig(key) {
  return localStorage.getItem('lexforge_' + key) || '';
}

function setConfig(key, value) {
  localStorage.setItem('lexforge_' + key, value);
}

function saveConfig() {
  setConfig('groqKey',     document.getElementById('groqKey').value.trim());
  setConfig('jurisdiction', document.getElementById('jurisdiction').value);
  setConfig('formality',   document.getElementById('formality').value);
  setConfig('maxQuestions', document.getElementById('maxQuestions').value);
  showToast('Configuration saved ✓');
}

function loadConfig() {
  const key = getConfig('groqKey');
  if (key) document.getElementById('groqKey').value = key;

  const jur = getConfig('jurisdiction');
  if (jur) {
    const sel = document.getElementById('jurisdiction');
    for (let o of sel.options) { if (o.value === jur) { sel.value = jur; break; } }
  }

  const fmt = getConfig('formality');
  if (fmt) {
    const sel = document.getElementById('formality');
    for (let o of sel.options) { if (o.value === fmt) { sel.value = fmt; break; } }
  }

  const mq = getConfig('maxQuestions');
  if (mq) document.getElementById('maxQuestions').value = mq;
}

function toggleConfig() {
  configVisible = !configVisible;
  document.getElementById('configBody').style.display = configVisible ? 'block' : 'none';
  document.getElementById('configArrow').textContent  = configVisible ? '▲' : '▼';
}

// ══════════════════════════════════════════
//  DOCUMENT GRID
// ══════════════════════════════════════════

function renderDocGrid() {
  const grid = document.getElementById('docGrid');
  grid.innerHTML = DOC_TYPES.map((d, i) => `
    <div class="doc-card" id="docCard${i}" onclick="selectDocType(${i})">
      <div class="doc-card-icon">${d.icon}</div>
      <div class="doc-card-name">${d.name}</div>
      <div class="doc-card-desc">${d.desc}</div>
    </div>
  `).join('');
}

function selectDocType(index) {
  // Deselect previous
  if (selectedDocType !== null) {
    document.getElementById(`docCard${selectedDocType}`)?.classList.remove('selected');
  }
  selectedDocType = index;
  document.getElementById(`docCard${index}`)?.classList.add('selected');

  const doc = DOC_TYPES[index];
  agentGraph.state.docType = doc.name;

  const badge = document.getElementById('selectedDocBadge');
  document.getElementById('selectedDocName').textContent = doc.icon + ' ' + doc.name;
  badge.style.display = 'flex';

  // Scroll to generator
  document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('userInput').focus();

  // Auto-message if this is the first interaction
  if (agentGraph.state.phase === 'idle') {
    document.getElementById('userInput').placeholder =
      `Describe your ${doc.name} needs, or press Send to get started…`;
  }
}

function clearDocType() {
  if (selectedDocType !== null) {
    document.getElementById(`docCard${selectedDocType}`)?.classList.remove('selected');
  }
  selectedDocType = null;
  agentGraph.state.docType = null;
  document.getElementById('selectedDocBadge').style.display = 'none';
  document.getElementById('userInput').placeholder = 'Describe your document or ask a question…';
}

// ══════════════════════════════════════════
//  AGENT STEP INDICATORS
// ══════════════════════════════════════════

const STEPS = ['analyze', 'clarify', 'draft', 'review'];

function updateStepUI(phase) {
  STEPS.forEach(s => {
    const el = document.getElementById('step-' + s);
    if (!el) return;
    el.classList.remove('active', 'done');
  });

  const idx = STEPS.indexOf(phase);
  if (idx === -1) {
    // done — mark all green
    if (phase === 'done') STEPS.forEach(s => document.getElementById('step-' + s)?.classList.add('done'));
    return;
  }

  STEPS.forEach((s, i) => {
    const el = document.getElementById('step-' + s);
    if (!el) return;
    if (i < idx)  el.classList.add('done');
    if (i === idx) el.classList.add('active');
  });
}

// Hook agent step callback
agentGraph.onStep = updateStepUI;
agentGraph.onError = (err) => console.error('Agent error:', err);

// ══════════════════════════════════════════
//  CHAT UI
// ══════════════════════════════════════════

function addMessage(role, content, type = 'text') {
  const container = document.getElementById('chatMessages');

  const div = document.createElement('div');
  div.className = `message ${role === 'user' ? 'user-message' : 'agent-message'}`;

  const iconDiv = document.createElement('div');
  iconDiv.className = 'msg-icon';
  iconDiv.textContent = role === 'user' ? 'YOU' : '⚖';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (type === 'question') {
    bubble.innerHTML = `<strong>I need a bit more information:</strong><br/><br/>${escapeHtml(content)}`;
  } else if (type === 'review') {
    const r = content;
    let html = `<strong>📋 Document Generated!</strong><br/><br/>`;
    if (r.overallQuality) html += `Quality: <strong>${r.overallQuality}</strong><br/>`;
    if (r.issues?.length) html += `<br/>⚠ Flagged:<ul style="margin-left:1rem;margin-top:0.25rem">${r.issues.slice(0,3).map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
    if (r.suggestions?.length) html += `<br/>💡 Suggestions:<ul style="margin-left:1rem;margin-top:0.25rem">${r.suggestions.slice(0,2).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`;
    html += `<br/><em style="font-size:0.78rem;color:#9CA3AF">You can ask me to revise any part of the document.</em>`;
    bubble.innerHTML = html;
  } else {
    bubble.textContent = content;
  }

  div.appendChild(iconDiv);
  div.appendChild(bubble);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function addLoadingBubble() {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'message agent-message loading-bubble';
  div.id = 'loadingBubble';
  div.innerHTML = `
    <div class="msg-icon">⚖</div>
    <div class="msg-bubble">
      <div class="dot-loader"><span></span><span></span><span></span></div>
    </div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeLoadingBubble() {
  document.getElementById('loadingBubble')?.remove();
}

function setStatus(text) {
  document.getElementById('statusText').textContent = text;
}

// ══════════════════════════════════════════
//  DOCUMENT OUTPUT
// ══════════════════════════════════════════

function renderDocument(docText, docType) {
  currentDoc     = docText;
  currentDocType = docType || 'legal-document';

  const output = document.getElementById('docOutput');
  const formatted = docText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold ALL CAPS headings
    .replace(/^([A-Z][A-Z\s\d&,.'-]{4,})$/gm, '<h2>$1</h2>')
    // Numbered section headers
    .replace(/^(\d+\.\s+[A-Z][^\n]{4,})$/gm, '<h3>$1</h3>');

  output.innerHTML = `<div class="doc-content">${formatted}</div>`;
  document.getElementById('docActions').style.display = 'flex';
}

// ══════════════════════════════════════════
//  SEND MESSAGE
// ══════════════════════════════════════════

async function sendMessage() {
  if (isProcessing) return;

  const input = document.getElementById('userInput');
  const text  = input.value.trim();
  if (!text) return;

  // Validate API key
  if (!getConfig('groqKey')) {
    toggleConfig();
    showToast('⚠ Please enter your Groq API key in Configuration');
    return;
  }

  isProcessing = true;
  input.value  = '';
  document.getElementById('sendBtn').disabled = true;

  // Show user message
  addMessage('user', text);

  // Show loading
  addLoadingBubble();
  setStatus('Agent thinking…');

  try {
    const result = await agentGraph.run(text);
    removeLoadingBubble();

    if (result.type === 'question') {
      addMessage('agent', result.content, 'question');
      setStatus('Awaiting your response');
    } else if (result.type === 'document') {
      renderDocument(result.content, result.docType);
      addMessage('agent', result.review, 'review');
      setStatus('Document ready');
      updateStepUI('done');
    }

  } catch (err) {
    removeLoadingBubble();
    updateStepUI('idle');

    let errMsg = 'Something went wrong. ';
    if (err.message === 'NO_KEY') {
      errMsg = 'No API key found. Please add your Groq API key in ⚙ Configuration below.';
      toggleConfig();
    } else if (err.message?.includes('401')) {
      errMsg = 'Invalid API key. Please check your Groq API key in Configuration.';
    } else if (err.message?.includes('429')) {
      errMsg = 'Rate limit reached. Please wait a moment and try again (Groq free tier limit).';
    } else if (err.message?.includes('fetch')) {
      errMsg = 'Network error. Please check your internet connection.';
    } else {
      errMsg += err.message;
    }

    addMessage('agent', '⚠ ' + errMsg);
    setStatus('Error — try again');
  }

  isProcessing = false;
  document.getElementById('sendBtn').disabled = false;
  input.focus();
}

// ══════════════════════════════════════════
//  KEYBOARD SHORTCUT
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('userInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});

// ══════════════════════════════════════════
//  DOCUMENT ACTIONS
// ══════════════════════════════════════════

function copyDoc() {
  if (!currentDoc) return;
  navigator.clipboard.writeText(currentDoc).then(() => showToast('Copied to clipboard ✓'));
}

function downloadDoc() {
  if (!currentDoc) return;
  const blob = new Blob([currentDoc], { type: 'text/plain' });
  triggerDownload(blob, sanitizeFilename(currentDocType) + '.txt');
}

function downloadDocHTML() {
  if (!currentDoc) return;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(currentDocType)}</title>
  <style>
    body{font-family:Georgia,serif;max-width:800px;margin:3rem auto;padding:2rem;color:#1a1a1a;line-height:1.8}
    h1{text-align:center;font-size:1.8rem;margin-bottom:2rem;color:#2D0A5E}
    h2{font-size:1.1rem;color:#5B21B6;border-bottom:1px solid #ddd;padding-bottom:0.25rem;margin:1.5rem 0 0.75rem}
    pre{white-space:pre-wrap;font-family:Georgia,serif}
    .disclaimer{margin-top:3rem;padding:1rem;border:1px solid #fbbf24;background:#fef3c7;font-size:0.85rem;border-radius:8px}
    .footer{text-align:center;color:#9ca3af;font-size:0.8rem;margin-top:2rem}
  </style>
</head>
<body>
  <h1>${escapeHtml(currentDocType)}</h1>
  <pre>${escapeHtml(currentDoc)}</pre>
  <div class="disclaimer">⚠ This document was generated by LexForge AI and is for informational purposes only. It does not constitute legal advice. Please consult a licensed attorney before use.</div>
  <div class="footer">Generated by LexForge &middot; Powered by Llama 3.3 via Groq</div>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html' });
  triggerDownload(blob, sanitizeFilename(currentDocType) + '.html');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded: ' + filename);
}

// ══════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function sanitizeFilename(str) {
  return (str || 'document').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase().slice(0, 50);
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  renderDocGrid();
  loadConfig();

  // Open config if no API key
  if (!getConfig('groqKey')) {
    setTimeout(() => {
      toggleConfig();
      showToast('👋 Welcome! Add your free Groq API key to get started.');
    }, 800);
  }
});
