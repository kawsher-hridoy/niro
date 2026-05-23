# ADR-NNNN — <Short decision title>

> Copy this file when making a major architectural decision. Number it
> sequentially (`0002-`, `0003-`, etc.). Keep ADRs short — link out
> rather than duplicate.

- **Date:** YYYY-MM-DD
- **Status:** Proposed | Accepted | Superseded by ADR-NNNN | Deprecated
- **Owner:** <name>
- **Context tags:** backend / frontend / ai / security / deploy / docs

## Context

What's the situation that forced this decision? What constraints are in
play (time, headcount, regulatory, technical)? 2–4 sentences.

## Decision

The decision itself, stated as a single declarative sentence.

## Why this one

Rationale. What does this approach buy us that the alternatives don't?

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| ... | ... |
| ... | ... |

## Consequences

- **Positive:** what improves.
- **Negative:** what gets worse or harder.
- **Neutral:** what changes but isn't strictly better or worse.

## Affected code / docs

- `path/to/file.py`
- `docs/section/file.md`
- `DESIGN.md §N` (if applicable)

## Revisit when

A signal that would prompt us to reopen this decision. e.g.,
*"if Azure deprecates `gpt-chat-latest` before 15 June"*.

---

## How to use ADRs

ADRs document **load-bearing** architectural choices — things that, if
reversed, would require non-trivial code changes. For smaller decisions
(naming, library picks, scope cuts), just add an entry to
`docs/decisions.md`.

Examples of when to write an ADR:
- Switching from REST to GraphQL.
- Replacing PostgreSQL with another DB.
- Adopting a new authentication scheme.
- Adding a queue / worker service.
- Changing the AI provider abstraction shape.

Examples of when NOT to write an ADR (use `decisions.md` instead):
- Picking shadcn/ui over hand-rolled components.
- Renaming the project.
- Adjusting demo script timing.
