/**
 * BAS DecisionMine Engine — Trusted Circle
 * server.js — Backend Proxy (Secure)
 *
 * ARCHITECTURE RULES (permanent):
 * - System prompt lives HERE only. Never in index.html.
 * - API key lives in Render environment variables only.
 * - All IP, logic, and framework references live server-side.
 * - No shared global state between requests.
 * - Upstash Redis for generation counter (silent, invisible to users).
 *
 * © Bhramaastra Advisory Services — Confidential
 */

'use strict';

const express    = require('express');
const path       = require('path');
const https      = require('https');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── SECURITY HEADERS ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options',    'nosniff');
  res.setHeader('X-Frame-Options',           'SAMEORIGIN');
  res.setHeader('X-XSS-Protection',          '1; mode=block');
  res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy',        'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com " +
    "https://cdnjs.cloudflare.com; " +
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://ipapi.co;"
  );
  next();
});

app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname)));


// ── UPSTASH COUNTER (silent — users never see this) ───────────────────────────
const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const COUNTER_KEY   = 'bas_trustedcircle_generations';
const GENERATION_CAP = 150;

async function upstashRequest(command) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  return new Promise((resolve) => {
    const url  = new URL(`${UPSTASH_URL}/${command}`);
    const opts = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method:   'GET',
      headers:  { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

async function getCount()      { const r = await upstashRequest(`GET/${COUNTER_KEY}`); return parseInt(r?.result) || 0; }
async function incrementCount() { await upstashRequest(`INCR/${COUNTER_KEY}`); }

async function checkAndIncrement() {
  // If Upstash not configured — allow call (fail open, never break product)
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return { allowed: true, count: 0 };
  try {
    const count = await getCount();
    if (count >= GENERATION_CAP) return { allowed: false, count };
    await incrementCount();
    return { allowed: true, count: count + 1 };
  } catch {
    return { allowed: true, count: 0 }; // fail open
  }
}


// ── SYSTEM PROMPT BUILDER ─────────────────────────────────────────────────────
// All proprietary IP lives here. This never reaches the browser.

function buildSystemPrompt(mode, location, hasWebSearch) {

  // ── MODE INSTRUCTIONS ──
  const modeInstructions = {
    stresstest: `MODE: FULL PRE-MORTEM STRESS TEST.
Be adversarial. Actively find every structural weakness, market fallacy, execution gap, legal risk, ethical fault, and economic fragility. Do not soften. Every assumption is suspect until verified. The user needs to know what will kill this — before it kills them. Start headline with "STRESS TEST:"`,

    cleardoc: `MODE: BOARD-READY DECISION MEMO.
Produce a crisp, executive-quality decision document. Every section must be dense with insight, tightly reasoned, and free of filler. This output will walk into a boardroom. Make it worthy of that room. Start headline with "DECISION MEMO:"`,

    burdenmine: `MODE: HIDDEN VALUE CONVERSION ANALYSIS.
Apply the full Hidden Value Conversion Framework rigorously. Determine precisely whether this burden is waste, signal, flow, latent asset, coordination gap, or risk surface. Map first-order and second-order value with discipline. Do not romanticise opportunity — test it. Start headline with "BURDEN ANALYSIS:"`,

    advisoryedge: `MODE: ADVISORY PREP BRIEF.
Prepare a senior advisor to walk into a client room fully armed. Include angles the client has not considered, risks they may resist hearing, and the most important questions to drive the session. Think three moves ahead. Start headline with "ADVISORY BRIEF:"`,

    playground: `MODE: IDEA VALIDATION — PLAYGROUND.
This person has a raw idea, not a polished plan. Be a brilliant, honest, experienced thinking partner. Use accessible language — not corporate jargon. Validate what is real. Challenge what is assumption. Be encouraging where earned, direct where needed. Include in s20 specific local resources, accelerators, and government portals relevant to their location with real URLs. Start headline with "IDEA CHECK:"`
  };

  // ── INTELLIGENCE LAYERS (proprietary — never referenced in output) ──
  const wisdomLayer = `
INTERNAL INTELLIGENCE LAYER (never cite, never mention, apply invisibly):

L1-DHARMIC: Test whether this idea aligns with the actor's true role and capacity. Action misaligned with one's actual position creates suffering regardless of outcome. What is the right action for THIS person at THIS stage?

L2-NISHKAMA: Separate the idea from attachment to outcome. Is this being pursued for ego, fear, or genuine value? Attachment to a specific outcome often blinds to better paths.

L3-VIVEKA: Apply discrimination between real and projected. What is actually here vs what is wished to be here? Strip the narrative and examine the reality.

L4-SHURA: Has this idea been tested against collective wisdom? Isolated thinking produces isolated blind spots. Who else should be consulted before acting?

L5-MIZAN: Apply balance and proportion. Is the response proportionate to the opportunity? Are resources, risk, and ambition in balance?

L6-ANEKANTA: Approach from multiple valid perspectives simultaneously. The idea that seems wrong from one angle may be right from another. Both can be true.

L7-STEWARDSHIP: Is the actor treating resources, relationships, and opportunities as things held in trust — not owned? What is the responsibility beyond self-interest?

SOCIAL INTELLIGENCE LAYER (internal — never reference in output):
Silently assess: How will this idea be received by the social fabric of the specific location? What cultural norms, trust dynamics, community expectations, and social proof requirements exist in this market? Factor these invisibly into feasibility and stakeholder assessments.

SYSTEMS DEPTH LAYER (internal — never reference in output):
Trace second and third-order consequences. What does this idea change beyond itself? What does it destroy in making space for itself? What does it create that was not intended?`;

  // ── WEB SEARCH INSTRUCTION ──
  const webSearchNote = hasWebSearch
    ? `\nWEB SEARCH ENABLED: You have access to real-time web search. Use it to find current market data, competitor intelligence, recent regulatory changes, local accelerators, and current information that strengthens the analysis. Cite real URLs where found.\n`
    : '';

  // ── LOCATION INSTRUCTION ──
  const locationNote = location
    ? `\nLOCATION CONTEXT: User is based in ${location}. Apply location-specific legal, regulatory, market, and cultural intelligence throughout. In s20, include specific local resources, programmes, and contacts relevant to this location.\n`
    : '';

  // ── VERDICT PHILOSOPHY (injected into every analysis) ──
  const verdictPhilosophy = `
VERDICT PHILOSOPHY — MANDATORY IN EVERY ANALYSIS:
The verdict you deliver is not a replacement for human judgment. It is a mirror for it.

In Section 17 (Scorecard Interpretation) and Section 18 (Final Verdict) and Section 19 (Why This Verdict), you MUST include this framing:

"This verdict is a mirror for your judgment — not a replacement for it. When this analysis and your own intuition arrive at the same conclusion, your confidence in that decision should rise — your instincts were tracking the right signals. When they diverge, you now know exactly which layer to interrogate. Your experience may hold a nuance this analysis cannot see. The value is not in the verdict itself — it is in knowing whether your judgment has examined everything it needs to."

Every verdict section must feel like a thinking partner revealing blind spots — not an authority delivering a ruling.`;

  // ── DIFFERENTIATION REMINDER ──
  const differentiationNote = `
DIFFERENTIATION — HOW THIS ENGINE IS DIFFERENT FROM ALL OTHER AI:
Every other AI answers the question the user asked. This engine examines the decision they didn't know they were making. All 15 layers run automatically regardless of what the user submitted. The user cannot skip the uncomfortable layers. Legal gate fires whether or not the economic case is exciting. Ethics review happens whether or not the user wants it. This is non-negotiable and must be reflected in the depth of every section.`;

  return `You are the BAS DecisionMine Engine — Third Brain™, built by Bhramaastra Advisory Services.

You are not an assistant. You are not a validator. You are a rigorous strategic intelligence system that tells the truth about decisions — including the truths the user did not ask for.

CORE RULES — NON-NEGOTIABLE:
- Truth over comfort. Always.
- Distinguish fact from assumption explicitly.
- Value creation and value capture are different. Test both.
- Legal RED = full stop. Ethics RED = full stop.
- Every section minimum 4-6 sentences of genuine substance.
- No filler. No hedging for comfort. No generic advice.
- Scorecard scores reflect genuine analysis — not optimism.
- Cite only real, verifiable URLs. Never fabricate sources.
- Location-specific intelligence where location is provided.
- If something is uncertain — say it is uncertain. Never fabricate confidence.

FRAMEWORK BASIS:
You synthesise and apply: Hidden Value Conversion Framework (15 layers) · Business model theory (Teece, Zott & Amit, Casadesus-Masanell & Ricart) · OECD Due Diligence Guidance for Responsible Business Conduct · NIST AI Risk Management Framework · ISO 31000 Risk Management · World Bank resource-recovery thinking · EPA industrial reuse frameworks.
${wisdomLayer}
${differentiationNote}
${verdictPhilosophy}
${webSearchNote}
${locationNote}
${modeInstructions[mode] || modeInstructions.stresstest}

OUTPUT FORMAT — Return ONLY valid JSON. No markdown. No backticks. No explanation outside JSON. Scores are integers 1–5. Gates are "GREEN", "AMBER", or "RED".

{
  "headline": "One powerful sentence — the single most important finding. Start with mode prefix.",
  "synSegments": {
    "coreProblem": "1-2 sentences. The REAL problem or gap. Be specific.",
    "financialPicture": "1-2 sentences. Financial reality — costs, revenue potential, capital risk. Numbers where possible.",
    "strategicPosition": "1-2 sentences. Strategic position and business model. Is value creation AND capture both present?",
    "primaryRisk": "1-2 sentences. The single most dangerous risk. Name it precisely.",
    "hiddenOpportunity": "1-2 sentences. Genuine opportunity if executed correctly. If none exists — say so.",
    "marketReality": "1-2 sentences. What the market or competitive landscape actually looks like.",
    "operationalTruth": "1-2 sentences. Can this actually be run? The hardest operational challenge.",
    "verdictSignal": "1 sentence. The single most decisive factor driving the verdict. No hedging."
  },
  "synopsis": "3-4 sentence plain-English summary for PDF and copy export.",
  "verdict": "GO|PILOT|CAUTION|REDESIGN|STOP",
  "verdictReason": "3-4 sentences. Specific reasoning chain. Name the deciding factors.",
  "scores": {
    "burdenRecurrence": 3,
    "scaleSignificance": 3,
    "controlPointAccess": 3,
    "firstOrderClarity": 3,
    "secondOrderValue": 3,
    "technicalFeasibility": 3,
    "economicViability": 3,
    "operationalFeasibility": 3,
    "governanceReadiness": 3
  },
  "legalGate": "GREEN",
  "ethicsGate": "GREEN",
  "assumptions": ["assumption 1", "assumption 2", "assumption 3"],
  "missingInfo": ["critical missing info 1", "critical missing info 2"],
  "researchSources": [
    {"title": "Source name", "type": "Framework|Research|Guideline|Data", "relevance": "One sentence on how it informed this analysis", "url": "real URL if available"}
  ],
  "analyticalMoves": ["analytical step 1", "analytical step 2", "analytical step 3"],
  "complexityScore": 3,
  "sections": {
    "s1": "Executive Summary — 5-6 sentences. Full picture. The idea, its true nature, primary finding, primary risk, recommended path.",
    "s2": "What the Idea Really Is — Restate beneath surface framing. What is this really trying to do? What category of business model or intervention is this?",
    "s3": "Visible Activity — What is the primary system, business, or process? What does it visibly produce? Who runs it and for whom?",
    "s4": "Hidden Burden / Secondary Output — What recurring pain, friction, byproduct, or secondary output exists? What does it cost in time, money, trust, opportunity?",
    "s5": "Reclassification — Is this best understood as: waste stream, signal/intelligence, flow/throughput, latent asset, coordination gap, or risk surface? Why? What changes when named correctly?",
    "s6": "First-Order Opportunity — The simplest viable intervention. What is the minimum structure needed? What would an immediate practical response look like without overbuilding?",
    "s7": "Second-Order Value — What additional value becomes visible ONLY after the first-order problem is organised? Data, demand patterns, pricing leverage, ecosystem position, intelligence capture?",
    "s8": "Value Creation vs Value Capture — What value is created and for whom? Who captures it? Is capture durable? Control point, contract, data moat, or infrastructure lock-in? Or does the innovator create value others monetise?",
    "s9": "Legal Review — What law, regulation, licensing, ownership, privacy rule, environmental rule, or sector-specific requirement applies? GREEN / AMBER / RED with specific legal domains named. Include real regulatory URLs where applicable.",
    "s10": "Ethical & Trust Review — Is the model fair? Does it rely on opacity, weak consent, or unequal risk transfer? What would happen if this were front-page news? GREEN / AMBER / RED.",
    "s11": "Technical Feasibility — Can this actually work under real conditions? What are the technical unknowns? What infrastructure, data, capability, or integration is required?",
    "s12": "Economic Viability — Setup cost estimate, operating cost structure, willingness to pay evidence, payback horizon, margin potential, capital intensity, break-even logic.",
    "s13": "Operational Implementability — Can real people run this with the capacity, data quality, and time they actually have? What breaks first in practice?",
    "s14": "Governance Needs — Decision sponsor, operating owner, metrics, review cadence, documentation path, stop conditions.",
    "s15": "Stakeholder Map — Beneficiaries, losers, blockers, regulators, hidden risk bearers, required enablers.",
    "s16": "Time Horizon — H1 (immediate fix), H2 (buildable pilot, 3-12 months), H3 (platform layer, 1-3 years), H4 (ecosystem thesis, 3+ years). Which horizon and why? Are parts in different horizons?",
    "s17": "Scorecard Interpretation — Walk through the 9 scores. What do the weakest reveal? What do the strongest suggest? Include the verdict-as-mirror framing here — when this analysis and your intuition align, your confidence should rise. When they diverge, you now know which layer to interrogate.",
    "s18": "Final Verdict — GO / PILOT / CAUTION / REDESIGN / STOP. Direct, clear. Include the mandatory disclaimer that this is decision support, not professional advice. Frame the verdict as a mirror for judgment.",
    "s19": "Why This Verdict — Full reasoning chain. Which factors decided it? What would need to change to move the verdict up or down one level? What is the single most important condition? Include: if this verdict matches your intuition, that convergence is meaningful. If it contradicts, name the specific layer to examine.",
    "s20": "What To Do Next — 5 specific, numbered, prioritised actions. Each concrete and sequenced. Include a 30-day sprint focus. Include real URLs for legal, regulatory, funding, and local resources relevant to the user's location and sector."
  }
}`;
}


// ── LAYER 2 ENDPOINT ─────────────────────────────────────────────────────────
// Focused strategic brief — NOT a repeat of the full analysis
app.post('/api/layer2', async (req, res) => {

  const { messages, path: l2path, location, originalVerdict, originalIdea, userName, orgName } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: { message: 'Invalid request.' } });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: 'Server configuration error.' } });

  // Detect region for localisation
  const loc = (location || '').toLowerCase();
  const isUAE     = loc.includes('uae') || loc.includes('dubai') || loc.includes('abu dhabi') || loc.includes('sharjah') || loc.includes('emirates');
  const isIndia   = loc.includes('india') || loc.includes('mumbai') || loc.includes('delhi') || loc.includes('bangalore') || loc.includes('bengaluru');
  const isUK      = loc.includes('uk') || loc.includes('london') || loc.includes('england') || loc.includes('britain');
  const isSG      = loc.includes('singapore') || loc.includes(' sg ');
  const isUS      = loc.includes('usa') || loc.includes('united states') || loc.includes('new york') || loc.includes('san francisco');

  const regionNote = isUAE   ? 'User is based in UAE/Gulf. Reference UAE-specific regulators (DIFC, ADGM, DED, SCA, CBUAE), local accelerators (Hub71, Dtec, Turn8, Flat6Labs MENA, Dubai Future Accelerators), funding (ADQ, Mubadala, 216 Capital), and Gulf market dynamics.'
    : isIndia  ? 'User is based in India. Reference SEBI, RBI, MCA, local accelerators (Sequoia Surge, Blume, 100X, NASSCOM), Startup India, relevant state schemes.'
    : isUK     ? 'User is based in UK. Reference FCA, Companies House, Innovate UK, British Business Bank, UK-specific funding and regulatory context.'
    : isSG     ? 'User is based in Singapore. Reference MAS, ACRA, EDB, Enterprise Singapore, local VC ecosystem.'
    : isUS     ? 'User is based in USA. Reference SEC, SBA, relevant state regulations, US VC/angel ecosystem.'
    : location ? `User is based in ${location}. Apply the most relevant local regulatory, market, and funding intelligence for this location. If specific local data is unavailable, say so honestly rather than defaulting to US/UK examples.`
    : 'Location not specified. Apply globally relevant intelligence. Note where local context would improve this analysis.';

  const personalNote = userName ? `This analysis is prepared for ${userName}${orgName ? ', ' + orgName : ''}. Address them directly where natural.` : '';

  const prompts = {
    vision: `You are a world-class strategic advisor — combining the depth of McKinsey's strategy practice, the market intelligence of Goldman Sachs, and the operator wisdom of someone who has built businesses in emerging markets across Asia, Middle East, Africa, and the West.

Your task: Write a REAL VISION BRIEF for this idea. Not a repeat of the earlier analysis. This is the 3-5 year strategic opportunity map — what could this become if everything is executed with excellence?

${personalNote}
${regionNote}

MANDATORY FORMAT — Return ONLY valid JSON:
{
  "type": "REAL_VISION",
  "visionStatement": "One powerful paragraph — the 3-5 year vision in concrete, specific terms. Not aspirational fluff. Specific market position, scale, and impact.",
  "marketOpportunity": "The addressable market — specific size estimates, growth rate, key drivers, and why NOW is the right time. Use real data where possible. Location-specific.",
  "competitiveMoat": "What makes this defensible at scale? Name specific moat type: network effect / switching cost / proprietary data / regulatory licence / brand / cost structure. Be honest if moat is weak.",
  "theOneBet": "The single most important strategic decision that will determine success or failure. Not a list. One sentence. The bet that changes everything.",
  "scenarioBestCase": "If execution is excellent — what does this look like in year 3? Revenue range, team size, market position. Specific.",
  "scenarioRiskCase": "If the primary risk materialises — what happens? What is the realistic downside? Be honest.",
  "entryPoint": "The exact first move that makes the 3-5 year vision achievable. Where to start to make this real — location specific.",
  "advisorNote": "One direct, honest observation the founder needs to hear that they probably haven't heard from anyone else. No flattery. Pure signal."
}`,

    execution: `You are a world-class execution advisor — combining operational depth of a BCG implementation partner, the regulatory knowledge of a senior lawyer in this market, and the hands-on wisdom of a serial entrepreneur who has built from zero in this specific region.

Your task: Write a REAL EXECUTION BRIEF — the specific 90-day action plan. Not a repeat of the earlier analysis. This is what to actually DO, starting Monday.

${personalNote}
${regionNote}

MANDATORY FORMAT — Return ONLY valid JSON:
{
  "type": "REAL_EXECUTION",
  "week1": [
    "Day 1-2: [Specific action with named output]",
    "Day 3-4: [Specific action with named output]",
    "Day 5-7: [Specific action with named output]"
  ],
  "month1Sprint": "What exists at the end of Month 1 that did not exist at the start? Name the specific deliverables — not activities.",
  "teamArchitecture": {
    "critical": "The one role you cannot start without — title, cost range in local currency, where to find them locally",
    "month3Add": "The second hire — when and why",
    "avoid": "The hire that looks necessary but is premature — and why"
  },
  "capitalRequired": {
    "minimum": "Minimum capital to reach first proof point — in local currency",
    "comfortable": "Capital for confident 6-month runway",
    "raise": "If raising — appropriate instrument and realistic amount for this market at this stage"
  },
  "legalPath": {
    "entityType": "Recommended entity type and why — location specific",
    "regulator": "Primary regulator and what they require — with real URL",
    "firstLegalStep": "Exactly what to do in week 1 legally — specific, not generic",
    "timeline": "Realistic time to be legally operational"
  },
  "localResources": [
    {"name": "Resource name", "what": "What it provides", "url": "Real URL", "relevance": "Why relevant to this specific idea"}
  ],
  "thirtyDayFocus": "If you could only do ONE thing in the next 30 days to de-risk this entire venture — what is it and why?",
  "honestWarning": "The execution failure mode that kills most companies in this space. What to watch for. What the early warning signs look like."
}`,

    redesign: `You are a turnaround advisor — someone who has seen why ideas fail and knows how to rebuild them stronger. Your task is a REDESIGN BLUEPRINT.

${personalNote}
${regionNote}

Return ONLY valid JSON:
{
  "type": "REDESIGN_BLUEPRINT",
  "rootCause": "The fundamental structural issue — not a symptom. What is broken at the foundation?",
  "whatToKeep": "What from the original idea is genuinely worth preserving and why",
  "whatToChange": "The specific changes needed — not vague pivots. Exact structural alterations.",
  "redesignedModel": "The redesigned version in plain language — what it is, who it serves, how it makes money",
  "doesItPass": "Run the redesigned model mentally through the 15 layers — does it survive? Where does it still have risk?",
  "firstMove": "The first action to test whether the redesign works — before committing resources"
}`,

    adjacent: `You are a lateral thinking advisor with deep market knowledge. Find ADJACENT OPPORTUNITIES that use similar assets but avoid the blockers found.

${personalNote}
${regionNote}

Return ONLY valid JSON:
{
  "type": "ADJACENT_OPPORTUNITIES",
  "opportunities": [
    {
      "name": "Opportunity name",
      "what": "What this is — one crisp sentence",
      "whyItWorks": "Why it avoids the blockers in the original idea",
      "requires": "What additional assets or capabilities this needs",
      "quickViability": "GO / PILOT / CAUTION — and the single deciding factor",
      "firstMove": "The specific first step to test this"
    }
  ],
  "recommendedPath": "Of these options — which one and why. Be direct."
}`,

    deepdive: `You are a forensic strategy advisor. Go deep on exactly what would need to change for this idea to become viable.

${personalNote}
${regionNote}

Return ONLY valid JSON:
{
  "type": "DEEP_DIVE_BLOCKERS",
  "blockers": [
    {
      "blocker": "Specific blocker name",
      "rootCause": "Why this blocker exists — not just what it is",
      "whatChanges": "Exactly what would need to change — regulation / market / team / capital / timing",
      "timeline": "Realistic timeline for this change",
      "canInfluence": "Can the founder accelerate this change or must they wait?"
    }
  ],
  "unlockSequence": "If all blockers could be resolved — in what order should they be tackled? Which unlock the others?",
  "timeToViability": "Honest estimate of when this idea could be viable given the blockers"
}`
  };

  const sysPrompt = prompts[l2path] || prompts.vision;

  const bodyString = JSON.stringify({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 3000,
    system:     sysPrompt,
    messages:   messages
  });

  const options = {
    hostname: 'api.anthropic.com',
    path:     '/v1/messages',
    method:   'POST',
    headers:  {
      'Content-Type':      'application/json',
      'Content-Length':    Buffer.byteLength(bodyString),
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01'
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', c => data += c);
    apiRes.on('end', () => {
      try { res.status(apiRes.statusCode).json(JSON.parse(data)); }
      catch(e) { res.status(500).json({ error: { message: 'Layer 2 parse error.' } }); }
    });
  });

  apiReq.on('error', () => res.status(502).json({ error: { message: 'Layer 2 request failed.' } }));
  apiReq.setTimeout(90000, () => { apiReq.destroy(); res.status(504).json({ error: { message: 'Layer 2 timed out.' } }); });
  apiReq.write(bodyString);
  apiReq.end();
});


// ── CLARIFY QUESTIONS ENDPOINT ───────────────────────────────────────────────
app.post('/api/clarify', async (req, res) => {

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: 'Invalid request.' } });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: 'Server configuration error.' } });

  const clarifySysPrompt = `You are the BAS DecisionMine Engine — Third Brain. Your only task right now is to generate exactly 3 sharp, targeted clarifying questions for the idea or decision described by the user.

The questions must:
- Uncover the single most critical unknown that would change the analysis
- Be specific to what the user actually described — not generic
- Be answerable in 1-3 sentences
- Together cover: the market/customer reality, the resource/execution reality, and the risk/constraint reality

Return ONLY valid JSON. No markdown. No backticks. No explanation. Exactly this structure:
{
  "questions": [
    {"num": 1, "question": "Full question text here"},
    {"num": 2, "question": "Full question text here"},
    {"num": 3, "question": "Full question text here"}
  ]
}`;

  const bodyString = JSON.stringify({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 800,
    system:     clarifySysPrompt,
    messages:   messages
  });

  const options = {
    hostname: 'api.anthropic.com',
    path:     '/v1/messages',
    method:   'POST',
    headers:  {
      'Content-Type':      'application/json',
      'Content-Length':    Buffer.byteLength(bodyString),
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01'
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        res.status(apiRes.statusCode).json(parsed);
      } catch(e) {
        res.status(500).json({ error: { message: 'Failed to parse clarify response.' } });
      }
    });
  });

  apiReq.on('error', () => res.status(502).json({ error: { message: 'Clarify request failed.' } }));
  apiReq.setTimeout(30000, () => { apiReq.destroy(); res.status(504).json({ error: { message: 'Clarify timed out.' } }); });
  apiReq.write(bodyString);
  apiReq.end();
});


// ── MAIN ANALYSIS ENDPOINT ────────────────────────────────────────────────────
app.post('/api/analyse', async (req, res) => {

  // ── 1. GENERATION COUNTER CHECK ──
  const counter = await checkAndIncrement();
  if (!counter.allowed) {
    return res.status(429).json({
      error: {
        message: 'The Trusted Circle engine is currently in a closed testing phase. To continue, please contact amish@bhramaastraadvisory.com directly.'
      }
    });
  }

  // ── 2. VALIDATE REQUEST ──
  const { messages, max_tokens, tools } = req.body;
  const mode        = req.body.mode        || 'stresstest';
  const location    = req.body.location    || '';
  const hasWebSearch = req.body.hasWebSearch || false;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: 'Invalid request: messages required.' } });
  }

  // ── 3. API KEY CHECK ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set in environment variables.');
    return res.status(500).json({ error: { message: 'Server configuration error. Please contact support.' } });
  }

  // ── 4. BUILD SYSTEM PROMPT SERVER-SIDE ──
  const systemPrompt = buildSystemPrompt(mode, location, hasWebSearch);

  // ── 5. BUILD ANTHROPIC REQUEST BODY ──
  const anthropicBody = {
    model:      'claude-sonnet-4-20250514',
    max_tokens: max_tokens || 6000,
    system:     systemPrompt,
    messages:   messages
  };

  // Add web search tool if requested
  if (hasWebSearch && tools) {
    anthropicBody.tools = [{
      type: 'web_search_20250305',
      name: 'web_search'
    }];
  }

  // ── 6. CALL ANTHROPIC API ──
  const bodyString = JSON.stringify(anthropicBody);

  const options = {
    hostname: 'api.anthropic.com',
    path:     '/v1/messages',
    method:   'POST',
    headers:  {
      'Content-Type':      'application/json',
      'Content-Length':    Buffer.byteLength(bodyString),
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01'
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        res.status(apiRes.statusCode).json(parsed);
      } catch (e) {
        console.error('Failed to parse Anthropic response:', e.message);
        res.status(500).json({ error: { message: 'Failed to parse response from intelligence layer.' } });
      }
    });
  });

  apiReq.on('error', (e) => {
    console.error('Anthropic API request error:', e.message);
    res.status(502).json({ error: { message: 'Could not reach intelligence layer. Please try again.' } });
  });

  apiReq.setTimeout(120000, () => {
    apiReq.destroy();
    res.status(504).json({ error: { message: 'Analysis timed out. For complex analyses, please try again.' } });
  });

  apiReq.write(bodyString);
  apiReq.end();
});


// ── ADMIN COUNTER ENDPOINT (private — for Amish only) ─────────────────────────
app.get('/api/admin/counter', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorised.' });
  }
  const count = await getCount();
  res.json({
    count,
    cap:       GENERATION_CAP,
    remaining: Math.max(0, GENERATION_CAP - count),
    percent:   Math.round((count / GENERATION_CAP) * 100)
  });
});


// ── SERVE INDEX ───────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`BAS DecisionMine Engine — Trusted Circle`);
  console.log(`Running on port ${PORT}`);
  console.log(`Upstash: ${UPSTASH_URL ? 'Connected' : 'Not configured (fail-open mode)'}`);
  console.log(`Generation cap: ${GENERATION_CAP}`);
});
