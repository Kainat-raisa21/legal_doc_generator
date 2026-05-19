/**
 * LexForge — AI Legal Agent
 * LangGraph-inspired state machine implemented in vanilla JS
 * Uses Groq's free API with Llama 3.3 70B
 *
 * Graph nodes:
 *   analyze → clarify → draft → review → END
 */

// ══════════════════════════════════════════
//  AGENT STATE
// ══════════════════════════════════════════

class AgentState {
  constructor() {
    this.reset();
  }

  reset() {
    this.phase         = 'idle';      // idle | analyze | clarify | draft | review | done
    this.docType       = null;
    this.userRequest   = '';
    this.clarifications = [];         // {question, answer}[]
    this.pendingQuestion = null;
    this.questionCount = 0;
    this.generatedDoc  = '';
    this.reviewNotes   = '';
    this.context       = {};          // extracted entities
    this.history       = [];          // full conversation for the LLM
  }
}

// ══════════════════════════════════════════
//  GROQ API WRAPPER
// ══════════════════════════════════════════

async function callLLM(messages, systemPrompt, maxTokens = 2048) {
  const apiKey = getConfig('groqKey');
  if (!apiKey) throw new Error('NO_KEY');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API Error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ══════════════════════════════════════════
//  LANGGRAPH NODES
// ══════════════════════════════════════════

/**
 * Node: ANALYZE
 * Extracts document type, parties, key entities from the user's request.
 * Returns JSON context.
 */
async function nodeAnalyze(state) {
  const system = `You are a legal document analysis agent. Given a user's request, extract structured information.
Respond ONLY with a valid JSON object — no markdown, no explanation.
JSON schema:
{
  "docType": "string (e.g. NDA, Employment Contract, etc.)",
  "parties": ["string"],
  "keyTerms": { "anyKey": "anyValue" },
  "jurisdiction": "string or null",
  "missingInfo": ["list of critical missing information needed to draft the document"]
}`;

  const messages = [
    {
      role: 'user',
      content: `User request: "${state.userRequest}"\nSelected document type: "${state.docType || 'not specified'}"\nJurisdiction setting: "${getConfig('jurisdiction')}"`
    }
  ];

  const raw = await callLLM(messages, system, 512);
  let parsed;
  try {
    // strip any accidental markdown fences
    const clean = raw.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    parsed = {
      docType: state.docType || 'General Legal Document',
      parties: [],
      keyTerms: {},
      jurisdiction: getConfig('jurisdiction'),
      missingInfo: ['Party names', 'Effective date', 'Governing jurisdiction']
    };
  }

  state.context = parsed;
  if (!state.docType && parsed.docType) state.docType = parsed.docType;
  return state;
}

/**
 * Node: CLARIFY
 * Decides whether to ask a clarifying question or proceed to drafting.
 * Returns {shouldDraft: bool, question: string|null}
 */
async function nodeClarify(state) {
  const maxQ = parseInt(getConfig('maxQuestions') || '4', 10);

  if (state.questionCount >= maxQ) {
    return { shouldDraft: true, question: null };
  }

  // Build answered/unanswered lists
  const answered = state.clarifications.map(c => c.question);
  const missing   = (state.context.missingInfo || []).filter(m => !answered.includes(m));

  if (missing.length === 0) {
    return { shouldDraft: true, question: null };
  }

  const system = `You are a legal assistant determining the single most important clarifying question to ask before drafting a legal document.
Respond ONLY with a JSON object: {"shouldDraft": false, "question": "string"}
If all necessary info is present, respond: {"shouldDraft": true, "question": null}
Keep questions short, specific, and professionally worded. Focus on information that materially changes the document.`;

  const messages = [
    {
      role: 'user',
      content: `Document type: ${state.docType}
Context gathered: ${JSON.stringify(state.context)}
Questions already asked: ${JSON.stringify(answered)}
Missing information: ${JSON.stringify(missing)}
Question ${state.questionCount + 1} of max ${maxQ}`
    }
  ];

  const raw = await callLLM(messages, system, 256);
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { shouldDraft: true, question: null };
  }
}

/**
 * Node: DRAFT
 * Generates the full legal document.
 */
async function nodeDraft(state) {
  const formality = getConfig('formality') || 'Professional (Standard)';
  const jurisdiction = getConfig('jurisdiction') || 'United States (General)';

  const clarificationsSummary = state.clarifications
    .map(c => `Q: ${c.question}\nA: ${c.answer}`)
    .join('\n\n');

  const system = `You are an expert legal document drafter with 20 years of experience.
Draft a complete, professional ${state.docType} document.
Formality level: ${formality}
Jurisdiction: ${jurisdiction}

Requirements:
- Use proper legal structure with numbered sections and subsections
- Include all standard clauses for this document type
- Insert [PARTY NAME], [DATE], [ADDRESS] placeholders where specific info is missing
- Use clear headings for each section
- Include signature blocks at the end
- Add a disclaimer at the very end noting this is a draft template
- Format using plain text with clear section headers (use ALL CAPS for main headings)

Output ONLY the document text — no preamble, no explanation.`;

  const messages = [
    {
      role: 'user',
      content: `Original request: "${state.userRequest}"
Document type: ${state.docType}
Extracted context: ${JSON.stringify(state.context, null, 2)}
Clarifications provided:
${clarificationsSummary || '(none provided — use standard placeholders)'}

Please draft the complete document now.`
    }
  ];

  const doc = await callLLM(messages, system, 3000);
  state.generatedDoc = doc;
  return state;
}

/**
 * Node: REVIEW
 * Reviews the draft for completeness and flags issues.
 */
async function nodeReview(state) {
  const system = `You are a senior legal reviewer. Review the provided draft document.
Respond ONLY with a JSON object:
{
  "issues": ["list of potential issues or missing elements"],
  "suggestions": ["list of improvement suggestions"],
  "overallQuality": "Good|Fair|Needs Revision",
  "disclaimer": "standard disclaimer string"
}`;

  const messages = [
    {
      role: 'user',
      content: `Review this ${state.docType} draft:\n\n${state.generatedDoc.slice(0, 3000)}`
    }
  ];

  const raw = await callLLM(messages, system, 512);
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    state.reviewNotes = JSON.parse(clean);
  } catch {
    state.reviewNotes = {
      issues: [],
      suggestions: [],
      overallQuality: 'Good',
      disclaimer: 'This document is a draft template for informational purposes only and does not constitute legal advice.'
    };
  }
  return state;
}

// ══════════════════════════════════════════
//  LANGGRAPH RUNNER
// ══════════════════════════════════════════

class LegalDocGraph {
  constructor() {
    this.state = new AgentState();
    this.onStep  = null;  // callback(stepName)
    this.onError = null;  // callback(error)
  }

  reset() {
    this.state.reset();
  }

  /**
   * Entry point: user sends a message.
   * Returns {type: 'question'|'document'|'error', content: string}
   */
  async run(userMessage) {
    const s = this.state;

    // Store message in history
    s.history.push({ role: 'user', content: userMessage });

    try {
      // ── PHASE: idle / first message ──────────────────────
      if (s.phase === 'idle') {
        s.userRequest = userMessage;
        s.phase = 'analyze';

        this._step('analyze');
        s = await nodeAnalyze(s); // mutates state

        s.phase = 'clarify';
        s.questionCount = 0;
      }
      // ── PHASE: answering a clarification ─────────────────
      else if (s.phase === 'clarify' && s.pendingQuestion) {
        s.clarifications.push({ question: s.pendingQuestion, answer: userMessage });
        s.pendingQuestion = null;
        // Update context with new info
        s.context.missingInfo = (s.context.missingInfo || []).filter(
          m => !s.clarifications.some(c => c.question === m)
        );
      }
      // ── Continue / add more info ──────────────────────────
      else if (s.phase === 'done') {
        // User wants revision — restart with context
        s.phase = 'clarify';
        s.userRequest += '\n\nUser revision request: ' + userMessage;
        s.questionCount = 0;
        s.generatedDoc = '';
      }

      // ── CLARIFY LOOP ──────────────────────────────────────
      if (s.phase === 'clarify') {
        this._step('clarify');
        const clarifyResult = await nodeClarify(s);

        if (!clarifyResult.shouldDraft && clarifyResult.question) {
          s.pendingQuestion = clarifyResult.question;
          s.questionCount++;
          s.history.push({ role: 'assistant', content: clarifyResult.question });
          return { type: 'question', content: clarifyResult.question };
        }

        // Proceed to draft
        s.phase = 'draft';
      }

      // ── DRAFT ─────────────────────────────────────────────
      if (s.phase === 'draft') {
        this._step('draft');
        s = await nodeDraft(s);
        s.phase = 'review';
      }

      // ── REVIEW ────────────────────────────────────────────
      if (s.phase === 'review') {
        this._step('review');
        s = await nodeReview(s);
        s.phase = 'done';
        this._step('done');

        s.history.push({ role: 'assistant', content: '(document generated)' });

        return {
          type: 'document',
          content: s.generatedDoc,
          review: s.reviewNotes,
          docType: s.docType
        };
      }

    } catch (err) {
      s.phase = 'idle';
      if (this.onError) this.onError(err);
      throw err;
    }
  }

  _step(name) {
    this.state.phase = name;
    if (this.onStep) this.onStep(name);
  }
}

// Export global instance
window.LegalDocGraph = LegalDocGraph;
window.agentGraph = new LegalDocGraph();
