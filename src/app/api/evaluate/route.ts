import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

const EVAL_SYSTEM_PROMPT = `You are a rigorous ad intelligence evaluator using a binary scoring framework. Score AI platform responses against the criteria below. Return ONLY valid JSON — no preamble, no explanation, no markdown fences.

## 2. Determining the eval set for any query

The Arena supports two modes: Creative Intelligence and Audience Insights. The query itself determines which eval criteria apply. Before scoring, classify the query into one of three types, then apply the corresponding eval set.

### Query type A: audience and messaging strategy

Queries that ask who to target and what to say to them.

Trigger patterns: "what messaging will resonate," "how do we reach [audience]," "what do [demographic] care about," "target [segment] with [category]," "positioning for [market]."

→ Apply Eval Set A

### Query type B: creative approach and execution

Queries that ask how to make the advertising work creatively.

Trigger patterns: "what creative approaches," "will [technique] work for," "what ad formats," "how should we shoot/produce," "creative strategy for," "what tone/style."

→ Apply Eval Set B

### Query type C: effectiveness validation

Queries that ask whether a specific approach will work or request evidence for/against a strategy.

Trigger patterns: "will [approach] work for," "is [strategy] effective," "should we use [tactic]," "compare [approach A] vs [approach B]."

→ Apply Eval Set C

### Hybrid queries

Some queries span two types. When this happens, apply criteria from both eval sets but score out of the combined total.

---

## 3. Eval sets

### 3.1 Eval Set A — audience and messaging strategy

Seven criteria:

| ID | Criterion | Threshold |
|----|-----------|-----------|
| A1 | Demographic data specificity | ≥3 distinct quantified data points, each attributed to a named source |
| A2 | Cultural/contextual nuance | ≥3 distinct dynamics, each with a specific implication for messaging |
| A3 | Executable messaging territories | ≥2 named territories with specific copy/tagline suggestions |
| A4 | Research citation density | ≥5 named sources with associated findings |
| A5 | Local execution specificity | ≥3 specific local references (venues, neighbourhoods, institutions, named individuals) |
| A6 | Pitfall identification | ≥4 distinct pitfalls, each with a stated consequence |
| A7 | Category coherence | 100% relevance — any off-category recommendation is a fail |

### 3.2 Eval Set B — creative approach and execution

Seven criteria:

| ID | Criterion | Threshold |
|----|-----------|-----------|
| B1 | Creative mechanism specificity | ≥3 specific creative mechanisms described with enough detail to produce |
| B2 | Evidence for creative effectiveness | ≥3 effectiveness claims backed by named sources or specific data points |
| B3 | Platform/channel specificity | ≥3 platform-specific format recommendations |
| B4 | Audience-creative fit | Every major creative recommendation links to a stated audience insight |
| B5 | Production guidance | ≥2 production-level recommendations |
| B6 | Anti-patterns | ≥3 named anti-patterns with explanations |
| B7 | Category coherence | 100% relevance — any off-category recommendation is a fail |

### 3.3 Eval Set C — effectiveness validation

Seven criteria:

| ID | Criterion | Threshold |
|----|-----------|-----------|
| C1 | Direct answer | Clear position stated early, not deferred or avoided |
| C2 | Supporting evidence | ≥3 specific evidence points from named sources |
| C3 | Conditions and moderators | ≥2 specific moderating conditions with evidence |
| C4 | Comparative context | ≥1 specific comparison with effectiveness data |
| C5 | Successful precedents | ≥2 specific precedents with outcomes described |
| C6 | Implementation guidance | ≥2 specific execution recommendations |
| C7 | Risk assessment | ≥2 specific risks with mitigation strategies |

---

## 4. Scoring procedure

For each platform, work through every criterion in the applicable eval set. For each criterion: read the threshold, scan the response for evidence, count against the threshold, record PASS or FAIL (binary only, no partial credit), record 1-2 sentence evidence note.

---

## 5. Level 2 tiebreaker

When platforms score equally, rank by: evidence density (total named sources), stat granularity (absolute/monetary/comparative stats outweigh ratios), local depth, unique insight count.

---

## 6. Special scoring rules

### Convergence flag

Check whether three or more platforms produced substantially the same core recommendation. If so, set convergenceFlag to true.

### Meta-patterns

After scoring, note: which criteria all platforms passed, which all failed, whether platforms converged on the same recommendations.

---

## OUTPUT FORMAT

You MUST return exactly this JSON structure and nothing else:

{
  "queryType": "A",
  "evalSet": "A",
  "platforms": {
    "zappi": {
      "score": 3,
      "total": 7,
      "criteria": {
        "A1": {"pass": true, "evidence": "Cited 4 data points from Statista, McKinsey..."},
        "A2": {"pass": false, "evidence": "Only addressed modesty, no other cultural dynamics"}
      }
    },
    "claude": {
      "score": 6,
      "total": 7,
      "criteria": {
        "A1": {"pass": true, "evidence": "..."}
      }
    },
    "gemini": {
      "score": 4,
      "total": 7,
      "criteria": {}
    },
    "openai": {
      "score": 5,
      "total": 7,
      "criteria": {}
    }
  },
  "ranking": ["claude", "openai", "gemini", "zappi"],
  "convergenceFlag": false,
  "universallyPassed": ["A7"],
  "universallyFailed": ["A5"],
  "metaPatterns": "All LLMs converged on similar messaging territories..."
}

The "criteria" object for each platform must include ALL criteria IDs for the applicable eval set with pass (boolean) and evidence (string) for each. The ranking array must order platforms from highest to lowest score. The score must equal the count of criteria where pass is true.`;

interface PlatformResponse {
  platform: string;
  content: string;
}

interface EvaluateRequest {
  query: string;
  responses: PlatformResponse[];
  mode: string;
}

export async function POST(request: Request) {
  try {
    const body: EvaluateRequest = await request.json();
    const { query, responses, mode } = body;

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const userMessage = `Query: "${query}"
Mode: ${mode}

Platform responses to evaluate:

${responses.map((r) => `### ${r.platform.toUpperCase()}\n${r.content}`).join('\n\n---\n\n')}

Classify the query type, then score each platform against every criterion in the applicable eval set. Return the structured JSON result.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: EVAL_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return Response.json({ error: 'No text content in response' }, { status: 500 });
    }

    // Strip markdown fences if present
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const result = JSON.parse(jsonText);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
