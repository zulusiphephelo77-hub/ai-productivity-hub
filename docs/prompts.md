# AI Prompts — Sample Prompts & Tested Outputs

Each prompt below was drafted and tested in Gemini Pro, then verified working inside the live Aurora Workplace AI dashboard. One representative tested example is included per feature.

---

## 1. Smart Email Generator

**Prompt:**
You are a professional email writing assistant. Write a workplace email based on the details below.

Context: {brief description of the situation}
Recipient type: {client / manager / team member}
Tone: {formal / friendly / persuasive}
Key points to include: {bullet points}

Requirements:

Keep it concise (under 150 words unless context demands more)
Match the specified tone consistently
Include a clear subject line
End with an appropriate call to action or sign-off
Do not invent facts, dates, or names not provided in the context


**Tested output — client status update (warm, concise, confident tone):**
> Subject: Q3 dashboard update and next check-in
>
> Hi Elena, We've identified the cause of the Q3 analytics dashboard discrepancy: the scheduled batch sync missed late-clearing webhook events, resulting in a 15% underreporting gap. Our team is staging a backfill and will validate the updated totals... Could you confirm your presentation deadline and your preferred time for our next check-in? That will help us align the update with your preparation schedule.
>
> Best, [Your name]

**Why it's a good result:** rather than assuming an unstated deadline, the model asked a clarifying question back to the client — direct evidence of the "do not invent facts" instruction working correctly.

---

## 2. Meeting Notes Summarizer

**Prompt:**
You are a meeting notes assistant. Summarize the raw notes below into a structured format.

Raw notes: {paste notes}

Output in this exact structure:

Summary (2-3 sentences, key outcome of the meeting)
Key Decisions (bullet list)
Action Items (bullet list, format: Task – Owner – Deadline if mentioned, otherwise "Owner/Deadline not specified")
Open Questions (anything unresolved)

Only include information present in the notes. If a section has nothing relevant, write "None noted."

**Tested output — excerpt:**
> **Action Items**
> - Rewrite the batch sync script with exponential backoff and 250-record batches — Priya — exact deadline not specified
> - Review and approve Priya's deployment pull request — Marcus — before 19:00 today
> - Notify Elena Vance of the timeline — Sipho — by 17:00 today
>
> **Risks**
> - Client commitment risk: Sipho's 17:00 update precedes the backfill and validation — distinguish the planned reconciliation timeline from confirmed completion.

**Why it's a good result:** the model went beyond the spec by adding a Risks section that flagged a genuine sequencing problem (a client commitment being made before the underlying fix is confirmed) — and it explicitly noted that the meeting date and time zone weren't provided rather than guessing.

---

## 3. AI Task Planner / Scheduler
You are a productivity planning assistant. Build a schedule from the task list below.

Tasks: {list of tasks with any known deadlines/urgency}
Available time: {e.g. 8 hours, Mon-Fri}

Output:

A prioritized task list (High/Medium/Low, with 1-sentence reasoning per item)
A structured day-by-day or time-blocked schedule
One time-optimization suggestion (e.g. batching similar tasks)

If urgency isn't stated, infer it from deadlines only — flag any assumption you make.
**Prompt:**

**Tested output — excerpt (Day 1 recovery schedule):**
> | Priority / window | Task | Owner | Milestone |
> |---|---|---|---|
> | P0 · Hours 0–0.5 | Contain and scope: assign owners, identify affected reports, preserve logs | Incident lead + reporting lead | M1: Recovery scope established |
> | P0 · Hours 0.5–2 | Audit ingestion: inspect rate-limit responses, estimate backfill duration | Ingestion owner + data analyst | M2: Affected ranges documented |
> | P0 · Hours 2–3 | Prepare and test recovery; define rollback steps | Ingestion owner | M3: Backfill go/no-go passed |

**Why it's a good result:** it explicitly flagged its own planning assumption ("the 8-hour window is the immediate recovery target... owners below are proposed roles, not confirmed assignments") and built in decision gates (e.g. "if estimated recovery exceeds the available window, escalate immediately") rather than a flat static list.

---

## 4. AI Research Assistant

**Prompt:**
You are a research assistant. Summarize the topic/article below for a busy professional.

Topic/text: {paste article or topic}

Output:

Summary (3-4 sentences, plain language)
Key Insights (3-5 bullet points)
Practical Recommendation (1-2 sentences on how this applies to the user's work)
Caveat: note if the source material is limited, one-sided, or if this should be verified further

Do not present speculation as fact. Distinguish clearly between what the source states and any inference you make.

**Tested output — excerpt:**
> The Apex Retail Q3 discrepancy is the motivating example, but its cause, scope, and financial impact are not established in the supplied information. Any connection to API throttling remains a hypothesis to verify.
>
> **Suggested research angle — Completeness assurance:** compare source-to-target counts and totals, time-window reconciliation, missing-partition checks, and freshness thresholds.

**Why it's a good result:** rather than treating the incident as a confirmed root cause, the model correctly labeled it a hypothesis needing verification, and produced a structured research plan (evaluation criteria, verification questions, decision path) instead of a generic summary — a strong demonstration of separating stated fact from inference.
