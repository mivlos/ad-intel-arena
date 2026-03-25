# Ad Intelligence Arena — evaluation methodology

A repeatable framework for objectively scoring the output of every platform in the Ad Intelligence Arena (ad-intel-arena.vercel.app). Designed so any evaluator — human or AI — can score a response in under 10 minutes with consistent results.

---

## 1. How this methodology works

The Arena runs identical queries against four platforms simultaneously: Zappi (baseline), Claude Opus 4.6, Gemini 2.5 Pro, and OpenAI o3. Each platform receives the same question and produces a strategic response. This methodology scores each response using binary evaluation criteria — every criterion is a yes/no question with an observable threshold. There are no subjective scales (1-7, 1-10). Binary scoring eliminates evaluator variance and produces clean improvement signals.

### Why binary, not scaled

Scaled scoring compounds probability variance at each evaluation step. With binary evals, variance is bounded — an output either passes or doesn't. With a 7-point scale, the evaluator's judgment adds noise at every criterion, and that noise multiplies across criteria. The result: your aggregate score becomes unreliable, and you can't distinguish real improvement from evaluator variance.

### Scoring formula

Each response is scored against the applicable eval set:

```
response_score = criteria_passed / criteria_total
```

When comparing platforms across multiple queries:

```
platform_score = sum(all_passed across all queries) / sum(all_total across all queries)
```

Ties are broken by Level 2 intensity measures (section 5).

---

## 2. Determining the eval set for any query

The Arena supports two modes: **Creative Intelligence** and **Audience Insights**. The query itself determines which eval criteria apply. Before scoring, classify the query into one of three types, then apply the corresponding eval set.

### Query type A: audience and messaging strategy

Queries that ask who to target and what to say to them.

**Trigger patterns:** "what messaging will resonate," "how do we reach [audience]," "what do [demographic] care about," "target [segment] with [category]," "positioning for [market]."

**Example:** "We want to target 18-24 year old women in Dubai with athleisure — what messaging will resonate?"

→ Apply **Eval Set A** (section 3.1)

### Query type B: creative approach and execution

Queries that ask how to make the advertising work creatively.

**Trigger patterns:** "what creative approaches," "will [technique] work for," "what ad formats," "how should we shoot/produce," "creative strategy for," "what tone/style."

**Example:** "What creative approaches resonate with Gen Z women for beauty brands?"

→ Apply **Eval Set B** (section 3.2)

### Query type C: effectiveness validation

Queries that ask whether a specific approach will work or request evidence for/against a strategy.

**Trigger patterns:** "will [approach] work for," "is [strategy] effective," "should we use [tactic]," "compare [approach A] vs [approach B]."

**Example:** "Will humour-based advertising work for financial services targeting 45-65 year olds?"

→ Apply **Eval Set C** (section 3.3)

### Hybrid queries

Some queries span two types. When this happens, apply criteria from both eval sets but score out of the combined total. Flag the query as hybrid in your scoring sheet.

---

## 3. Eval sets

### 3.1 Eval Set A — audience and messaging strategy

Use for queries about who to target and what to say to them. Seven criteria.

| ID | Criterion | Test | Threshold |
|----|-----------|------|-----------|
| A1 | **Demographic data specificity** | Does the response include quantified statistics about the target audience from named sources? Not qualitative descriptions — actual numbers (percentages, population counts, spending data, penetration rates, media consumption hours). | ≥3 distinct quantified data points, each attributed to a named source |
| A2 | **Cultural/contextual nuance** | Does the response address multiple distinct cultural, social, or contextual dynamics specific to the target audience and market? Beyond the single most obvious dimension (e.g., beyond just "modesty" for Middle East, beyond just "digital natives" for Gen Z). | ≥3 distinct dynamics, each with a specific implication for messaging |
| A3 | **Executable messaging territories** | Does the response provide named, distinct messaging territories that a creative team could brief against? Not just themes or values — specific territory names with tagline-level copy or positioning language. | ≥2 named territories with specific copy/tagline suggestions |
| A4 | **Research citation density** | Does the response cite specific, named research organisations, reports, or data sources? Not "research shows" or "studies indicate" — actual organisation names paired with specific claims. | ≥5 named sources with associated findings |
| A5 | **Local execution specificity** | Does the response name specific locations, venues, institutions, creators, cultural references, or brands relevant to the target market? Not city-level or country-level generalities. | ≥3 specific local references (venues, neighbourhoods, institutions, named individuals) |
| A6 | **Pitfall identification** | Does the response identify distinct mistakes to avoid, with specific consequences or evidence for why they'd fail? Not generic "be careful with" warnings. | ≥4 distinct pitfalls, each with a stated consequence |
| A7 | **Category coherence** | Are ALL recommendations relevant to the product category in the query? Zero leakage from unrelated categories (e.g., food taxonomy appearing in a fashion brief). | 100% relevance — any off-category recommendation is a fail |

### 3.2 Eval Set B — creative approach and execution

Use for queries about how to make advertising work creatively. Seven criteria.

| ID | Criterion | Test | Threshold |
|----|-----------|------|-----------|
| B1 | **Creative mechanism specificity** | Does the response describe specific creative techniques, formats, or executional approaches rather than abstract strategic principles? ("Day-in-the-life content series featuring transitions between settings" vs "show authenticity.") | ≥3 specific creative mechanisms described with enough detail to produce |
| B2 | **Evidence for creative effectiveness** | Does the response cite effectiveness data for the recommended approaches? Named studies, campaign results, testing norms, or benchmark data. | ≥3 effectiveness claims backed by named sources or specific data points |
| B3 | **Platform/channel specificity** | Does the response specify which platforms or channels suit each creative approach, with format-specific recommendations? Not just "use social media" — specific platform mechanics (Reels vs Stories, AR lenses, etc.). | ≥3 platform-specific format recommendations |
| B4 | **Audience-creative fit** | Does the response explicitly connect each creative recommendation to a specific audience insight or behaviour? Not just "this audience likes TikTok" — "this audience behaviour [X] means creative approach [Y] will work because [Z]." | Every major creative recommendation links to a stated audience insight |
| B5 | **Production guidance** | Does the response include any production-level specificity: visual language, tone references, casting notes, colour palette, shooting considerations, or styling direction? | ≥2 production-level recommendations |
| B6 | **Anti-patterns** | Does the response identify specific creative approaches that would fail with this audience, with reasoning? | ≥3 named anti-patterns with explanations |
| B7 | **Category coherence** | Are ALL creative recommendations relevant to the product category and audience in the query? | 100% relevance — any off-category recommendation is a fail |

### 3.3 Eval Set C — effectiveness validation

Use for queries asking whether a specific approach will work. Seven criteria.

| ID | Criterion | Test | Threshold |
|----|-----------|------|-----------|
| C1 | **Direct answer** | Does the response give a clear yes/no/conditional answer to the question asked, within the first two paragraphs? Not buried after 500 words of context. | Clear position stated early, not deferred or avoided |
| C2 | **Supporting evidence** | Does the response cite specific effectiveness data (campaign results, testing norms, benchmark data) supporting or challenging the proposed approach? | ≥3 specific evidence points from named sources |
| C3 | **Conditions and moderators** | Does the response identify conditions under which the approach works vs fails? Not a blanket yes or no — specific moderating variables (audience segment, tone variant, category context, market). | ≥2 specific moderating conditions with evidence |
| C4 | **Comparative context** | Does the response compare the proposed approach to alternatives? "Humour works, but X works better/differently for this audience." | ≥1 specific comparison with effectiveness data |
| C5 | **Successful precedents** | Does the response cite specific real-world examples of the approach working (or failing) in similar contexts? Named campaigns, brands, or case studies. | ≥2 specific precedents with outcomes described |
| C6 | **Implementation guidance** | Does the response provide actionable guidance on how to execute the approach well if it does work? Not just "yes it works" but "here's how to make it work." | ≥2 specific execution recommendations |
| C7 | **Risk assessment** | Does the response identify what could go wrong and how to mitigate it? | ≥2 specific risks with mitigation strategies |

---

## 4. Scoring procedure

Follow this sequence for every Arena query.

### Step 1: Classify the query

Read the query. Determine type A, B, C, or hybrid using the trigger patterns in section 2. Record the classification.

### Step 2: Wait for all responses

Allow all four platforms to complete their responses. Do not score partial outputs.

### Step 3: Score each platform independently

For each platform, work through every criterion in the applicable eval set. For each criterion:

1. **Read the criterion and threshold** — know exactly what you're looking for
2. **Scan the response for evidence** — look for the specific observable elements
3. **Count against the threshold** — does it meet the minimum?
4. **Record PASS or FAIL** — binary only, no partial credit
5. **Record evidence** — note what you found (for passes) or what was missing (for fails). Keep evidence to 1-2 sentences. This creates the audit trail.

### Step 4: Calculate scores

```
Platform score = PASS count / Total criteria
```

### Step 5: Rank platforms

Order by score descending. In case of ties, proceed to Level 2 (section 5).

### Step 6: Record the meta-pattern

After scoring all four platforms, note:

- Which criteria did ALL platforms pass? (These may be too easy — tighten for next iteration.)
- Which criteria did ALL platforms fail? (These may be unreasonable — examine whether the thresholds are right.)
- Did any platform score 0 on ALL criteria? (This usually indicates a structural/architectural issue, not a quality issue.)
- Did platforms converge on the same recommendations? (Indicates consensus in training data rather than differentiated insight.)

---

## 5. Level 2 tiebreaker protocol

When two or more platforms score equally on Level 1, apply these intensity measures within the same dimensions. These are not new criteria — they measure depth within existing passes.

| Dimension | Measure | How to compare |
|-----------|---------|----------------|
| **Evidence density** | Count total named sources across the entire response | Higher count = stronger |
| **Stat granularity** | Classify each stat as: ratio/multiplier (3.2x), percentage (73%), absolute number (270k women), monetary value (AED 450), or comparison (38% vs 52%) | More absolute/monetary/comparative stats = stronger |
| **Local depth** | Count specific named locations, venues, people, institutions | Higher count = stronger |
| **Creative execution detail** | Does each territory include a scene-by-scene or step-by-step execution description? | Fully scripted > territory-level > theme-level |
| **Unique insight count** | Count insights that appear in this platform's response but not in any other platform's | More unique insights = more differentiated |
| **Measurement framework** | Does the response include specific KPIs, benchmarks, or ROI estimates from named sources? | Present with data > present without data > absent |

Score each platform on each Level 2 dimension (simple tally or present/absent). The platform with more Level 2 wins takes the overall position.

---

## 6. Special scoring rules

### 6.1 The Zappi baseline rule

Zappi functions as the baseline in the Arena. Its architecture is fundamentally different from the three LLM platforms: it queries a proprietary concept testing database rather than generating from general knowledge. This means:

- **When Zappi has data for the query**, its responses carry unique evidential weight — real consumer testing data, norms, and benchmarks that LLMs cannot provide. Weight Zappi's proprietary data citations more heavily in Level 2 tiebreakers when this is the case.
- **When Zappi has no data for the query**, score it on the same criteria as the LLMs. A "no data available" response that offers to pivot is better than serving irrelevant data from an adjacent category. An explicit data gap acknowledgement passes the honesty test but still fails the criteria.
- **Category coherence (A7/B7/C7) is weighted as critical for Zappi.** If the platform serves recommendations from an unrelated product taxonomy (e.g., food/beverage tags for a fashion query), this is a more severe failure than an LLM generating a weak answer in the right category. It signals the system will serve confidently wrong output rather than nothing.

### 6.2 The convergence flag

After scoring, check whether three or more platforms produced substantially the same core recommendation (same messaging territory, same primary insight, same creative approach). If so, flag the query result as **convergent** in your scoring sheet. Convergent results suggest consensus training data rather than novel strategic thinking. This doesn't change scores, but it contextualises the value: the insight may be directionally correct but competitively undifferentiated.

### 6.3 Hallucination and fabrication check

For any quantified claim or named source citation, apply a trust-but-verify posture:

- **If a stat sounds too precise to be general knowledge** (e.g., "73% of Dubai Gen Z women say..."), the evaluator should note it as UNVERIFIED unless they can confirm the source. This does not change the binary score — the criterion tests whether citations are present and structured, not whether they're accurate. Accuracy verification is a separate workstream.
- **If two platforms cite contradictory numbers from the same named source**, flag both as CONFLICTING. This is useful metadata for the Arena's developers.
- **If a platform cites a source that does not exist** (verifiable via web search), this is a Level 2 penalty: deduct 1 from that platform's Level 2 evidence density score for each fabricated source.

### 6.4 Non-response handling

If a platform returns an error, timeout, or refusal to answer:

- Score it as 0/N on all applicable criteria
- Note the reason (error, timeout, content policy, etc.)
- Do not penalise beyond the 0 score — it's already the minimum

---

## 7. Recording template

Use this format for each Arena evaluation. Copy and fill in for every query you test.

```
## Evaluation record

**Date:** [YYYY-MM-DD]
**Query:** [exact text of the query submitted]
**Query type:** [A / B / C / Hybrid (A+B) / etc.]
**Eval set applied:** [A / B / C / A+B / etc.]

### Level 1 scores

| Platform | Score | % | Criteria passed | Criteria failed |
|----------|-------|---|-----------------|-----------------|
| Zappi    |  /7   |   |                 |                 |
| Claude   |  /7   |   |                 |                 |
| Gemini   |  /7   |   |                 |                 |
| GPT-o3   |  /7   |   |                 |                 |

### Per-criterion evidence

#### Zappi

| Criterion | Pass/Fail | Evidence |
|-----------|-----------|----------|
| [ID]      |           |          |

[Repeat for Claude, Gemini, GPT-o3]

### Level 2 tiebreaker (if needed)

| Dimension | Zappi | Claude | Gemini | GPT-o3 |
|-----------|-------|--------|--------|--------|
| Evidence density (source count) | | | | |
| Stat granularity | | | | |
| Local depth (named refs) | | | | |
| Creative execution detail | | | | |
| Unique insight count | | | | |
| Measurement framework | | | | |

### Meta-patterns

- **Convergence flag:** [Yes/No — did 3+ platforms converge on the same core recommendation?]
- **Universally passed criteria:** [list]
- **Universally failed criteria:** [list]
- **Fabrication flags:** [any sources that couldn't be verified]
- **Conflicts:** [any contradictory claims across platforms]

### Ranking

1. [Platform] — [score] — [one-line rationale]
2. [Platform] — [score] — [one-line rationale]
3. [Platform] — [score] — [one-line rationale]
4. [Platform] — [score] — [one-line rationale]
```

---

## 8. Aggregating across multiple queries

When running multiple queries through the Arena to build a comprehensive comparison:

### Minimum query set

For a robust comparison, run at least one query from each type (A, B, C). The three example queries pre-loaded in the Arena cover this well:

- Type A: "We want to target 18-24 year old women in Dubai with athleisure — what messaging will resonate?"
- Type B: "What creative approaches resonate with Gen Z women for beauty brands?"
- Type C: "Will humour-based advertising work for financial services targeting 45-65 year olds?"

### Aggregate scoring

```
platform_aggregate = sum(passed across all queries) / sum(total across all queries)
```

### Consistency score

Beyond aggregate performance, track consistency:

```
consistency = 1 - (standard_deviation_of_per_query_scores / mean_score)
```

A platform that scores 100%, 100%, 0% (aggregate 67%) is less reliable than one scoring 71%, 71%, 57% (aggregate 66%) despite the similar average. The consistency score captures this.

### Category strength map

After multiple queries, build a per-platform strength map:

| Platform | Type A (audience) | Type B (creative) | Type C (validation) | Aggregate |
|----------|-------------------|--------------------|--------------------|-----------|
| Zappi    |                   |                    |                    |           |
| Claude   |                   |                    |                    |           |
| Gemini   |                   |                    |                    |           |
| GPT-o3   |                   |                    |                    |           |

This reveals whether platforms have category-specific strengths rather than uniform quality.

---

## 9. Auto-research mutation loop (for improving platform outputs)

When a platform consistently fails specific criteria, use the mutation patterns below to diagnose and fix the root cause. This section is for the Arena's developers or anyone tuning the system prompts behind each platform.

### Failure signal → mutation strategy

| Signal | Meaning | Action |
|--------|---------|--------|
| Same criterion fails every query | The system prompt never instructs this | **Add missing instruction** — write a specific directive for the failing dimension |
| Criterion fails on some queries but not others | Instruction exists but is weak | **Strengthen** — add quantified thresholds, negative examples, or verification checkpoints |
| Criterion passes but Level 2 is weak | The output technically meets the threshold but lacks depth | **Add quality gate** — raise the minimum or add a substance check |
| Multiple criteria fail together | Structural problem in the response architecture | **Restructure workflow** — change the order of generation or add intermediate steps |
| Score plateaus after 3+ prompt iterations | Diminishing returns from prompt changes | **Tighten the evals** — the criteria may be too loose, or accept the score |

### Mutation discipline

- **One change per iteration.** If you change three things at once and the score improves, you don't know which change helped.
- **Snapshot before mutating.** Save the current system prompt version before making changes.
- **Record what changed.** Every iteration should log: what was modified, why (which failing criterion, what root cause), and the score before/after.
- **Stop at 90%+ or plateau.** Don't chase 100% if the last 10% requires gaming the evals rather than genuinely improving output quality.

### Example mutation for a common failure

**Criterion A4 (Research Citation Density) fails at 40% rate across queries.**

Root cause: The system prompt says "support claims with evidence" but doesn't specify a minimum count or require named sources.

Mutation: Replace "support claims with evidence" with "every key insight must cite a named research organisation with a specific finding. Aim for 10+ named sources per response. Generic references to 'research shows' or 'studies indicate' without naming the source are a failure mode."

Expected impact: A4 pass rate should increase from 60% to 85%+ in one iteration.

---

## 10. Interpreting results for stakeholders

### For a product/marketing audience

Lead with the ranking and the evidence gap. "GPT-o3 and Claude both scored 100% on our 7-point binary eval, but o3 cited 12 named research sources vs Claude's 7 — that's the edge that matters when you're briefing a creative agency." Avoid: presenting raw percentages without context.

### For a technical audience

Lead with the eval design and mutation opportunities. "Gemini fails A1 and A4 consistently — these are missing instruction problems, not capability problems. Two prompt mutations would likely close the gap." Avoid: treating the ranking as fixed rather than improvable.

### For an executive audience

Lead with the structural insight. "Three general-purpose LLMs produced creative strategy briefs that pass every quality criterion we set. Zappi's proprietary platform scored 0/7 on the same query — not because the technology is weaker, but because it had no data for this category and market. The strategic question isn't which AI is smarter, it's where proprietary data coverage provides value that general knowledge can't." Avoid: making it about AI capability rather than data architecture.

---

## Appendix: validation checklist for new eval criteria

Before adding any criterion to an eval set, validate it against these rules:

1. **Is it binary?** Can you answer it with yes or no? If you need a scale, break it into multiple binary questions.
2. **Is it observable?** Can you point at something specific in the output? If it requires taste or judgment ("is it well-written?"), rewrite it as an observable check ("does it use specific examples rather than abstract statements?").
3. **Does it discriminate?** Would a genuinely good output pass, a mediocre output partially pass, and a bad output fail? If everything passes or everything fails, the criterion is too loose or too tight.
4. **Is it independent?** Could this criterion fail while others pass? If failing criterion X automatically fails criterion Y, they're not independent — merge them or drop one.
5. **Is it gameable?** Could a model technically pass this check without actually improving quality? If yes, rewrite to require substance rather than structure. "Contains a pitfalls section" is gameable; "identifies 4+ pitfalls with specific consequences" is harder to game.
6. **Is the threshold right?** Too low = false positives (bad outputs pass). Too high = false negatives (good outputs fail). Calibrate against 3 imaginary outputs: excellent, mediocre, poor.
