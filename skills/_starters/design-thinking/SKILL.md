---
name: design-thinking
description: "Apply the Stanford d.school 5-stage process: Empathize, Define, Ideate, Prototype, Test. Human-centered problem solving for any domain."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: research
  tags: "design-thinking, ux, research, ideation, prototyping"
---

# Design Thinking: Stanford d.school 5-Stage Process

Apply design thinking to [FILL-IN: problem-domain] using the Stanford d.school framework. This is a human-centered problem-solving process, not a linear checklist. Expect to move back and forth between stages as you learn.

## When to Use

- Tackling a problem where user needs are unclear or assumed
- Generating novel solutions when incremental improvement has stalled
- Validating assumptions before committing engineering resources
- Do NOT use when: you already know the solution and just need to build it — design thinking is for exploration, not execution

## The Five Stages

### Stage 1 — Empathize

Understand the people you are designing for. Not through surveys. Through observation and interviews.

**Research participants:** [FILL-IN: research-participants]

Interview principles:
- Ask "why" at least three times per statement. The first answer is almost never the real answer.
- Do not lead witnesses. "Do you find this frustrating?" is a leading question. "How do you feel about this process?" is not.
- Observe what people do, not just what they say. Behavior and self-report diverge constantly.
- Target 5-8 participants for qualitative research. Five participants surface 85% of usability issues (Nielsen's law). More interviews extend time; they rarely extend insight.

Artifacts: interview notes, observation recordings, direct quotes. No interpretation yet — that comes in Define.

### Stage 2 — Define

Synthesize your empathy research into a clear problem statement. Do not jump to solutions.

**Point of View (PoV) statement format:**

> **[User]** needs **[need]** because **[insight]**.

- **User** — the specific person from your research, not a generic demographic
- **Need** — a verb: accomplish, understand, feel, navigate — not a product feature
- **Insight** — the surprising or non-obvious thing you learned that reframes the problem

A PoV statement is valid when it is both specific enough to constrain the solution space and open enough to allow creative responses. "Sarah, a first-time manager, needs to know when her team is struggling because she can't see what she can't name" is a valid PoV. "Users need a better dashboard" is not.

Use an affinity diagram to cluster your interview notes before writing the PoV: sort observations into themes, look for patterns across participants, identify contradictions (contradictions are often the most valuable insights).

### Stage 3 — Ideate

Generate many ideas before evaluating any. Quantity before quality. Diverge before converging.

**How Might We (HMW) questions** — reframe the PoV statement into generative questions:
- Take the need and turn it into "How might we [need]?"
- Generate 20+ HMW questions before choosing which to ideate on
- Pick 3-5 HMW questions that feel most generative, not most obvious

**Brainstorming rules:**
- Defer judgment — no "yes, but" in the ideation phase, only "yes, and"
- Go for volume — aim for 50+ ideas before the first filter pass
- Encourage wild ideas — a wild idea often contains a viable core
- Build on each other's ideas — combinations produce breakthroughs

Cluster ideas by theme. Vote on the most promising clusters, not individual ideas. Carry 3-5 concepts into prototyping.

### Stage 4 — Prototype

Build to think, not to validate. A prototype is a question made physical.

Principles:
- **Start with paper** — a hand-drawn interface takes 30 minutes; a coded interface takes 3 days. Spend 30 minutes on 6 variations, not 3 days on 1.
- **One concept per prototype** — if you combine ideas, you can't learn which part worked
- **Build what you'll throw away** — attachment to a prototype prevents learning from testing it
- **Prototype the riskiest assumption first** — what is the one thing that, if wrong, makes this concept unworkable?

Prototype fidelity should match the question you're asking. Concept testing: paper. Interaction testing: clickable wireframe. Technical feasibility: a functional spike. Do not overbuild.

### Stage 5 — Test

Show the prototype. Don't explain it. Watch and listen.

**Testing protocol:**
- Give participants a task, not a tour: "Imagine you're trying to [task from your PoV statement]. Use this to do it."
- Stay silent while they work. Resist the urge to help or explain. Confusion is data.
- Ask: "What did you expect to happen?" after every moment of hesitation or confusion.
- Debrief immediately: note what worked, what failed, what surprised you.

**Five-user rule:** Five participants are sufficient to identify patterns in qualitative testing. Do not spend weeks recruiting for a test that will be thrown away.

## When to Go Back

Design thinking is non-linear. Common backtrack triggers:

- Prototype testing reveals participants don't recognize the problem you're solving → Return to Empathize
- Stakeholders reject the PoV as too narrow → Return to Define
- All ideas feel incremental and unexciting → Return to Ideate with different HMW questions
- Testing a prototype and realizing you're testing the wrong assumption → Return to Prototype with a more targeted question

## Supporting Files

- Template: [resources/templates/empathy-map.md](resources/templates/empathy-map.md)
- Template: [resources/templates/how-might-we.md](resources/templates/how-might-we.md)
