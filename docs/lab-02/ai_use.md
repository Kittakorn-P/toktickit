# Lab 2 — AI Use and Reflection

**LLM used:** Claude (Anthropic)

## Key Prompts

| # | Prompt (paraphrased) | Purpose |
|---|---|---|
| 1 | "Can you conclude me what to do in lab2. also pls remember our lab1" | Get oriented on scope before starting the engineering contract |
| 2 | "for this one can you do it for me" (drafting Business Rules for Requester selection/switching) | Draft specific BR wording after discussing the underlying tradeoffs together |
| 3 | "can you conclude all BR and put it in one md pls. just incase my format is missing something" | Consolidate scattered business rules into one reviewable document |
| 4 | "yes pls do" (generate the full api-spec.md draft) | Generate the full API contract after the spec's structure was agreed |
| 5 | "why is there so many this time" (questioning a 19-issue GitHub Issue breakdown) | Push back on over-granular task decomposition; got a corrected 13-issue version |
| 6 | "why we need to cd client before everything and what is cd .." | Understand a git/terminal fundamental rather than just copy-pasting commands |
| 7 | "still error [pasted Playwright install failure]" | Debug an environment-specific Playwright/macOS installation bug over several turns |
| 8 | "so we just gonna ignore the redline in vite.config since it has no effect right?" | Confirm understanding of a cosmetic TypeScript warning vs. a real functional bug |
| 9 | "explain why sometime you need to merge first to be able to do the next" | Understand branch dependency ordering before planning the Issue sequence |
| 10 | "ok so now I overwrite the 2 files you sent me right?" | Confirm exact file placement before applying generated code |

## My Reflection

*(This section is yours to personalize — the draft below is a starting point,
not a final answer. Rewrite it in your own words based on what actually
stood out to you.)*

Working with an AI agent across this sprint was most useful for turning the
handout's intentionally incomplete requirements into concrete, numbered
Business Rules and Acceptance Criteria — having something to react to (agree,
push back on, or revise) was faster than starting from a blank page. The
places where I had to slow down and actually think were the judgment calls
the handout left open on purpose: 404-vs-403 for ownership violations, how to
pass the Requester identity on each request, and where to draw the line on
attachment removal confirmation. Debugging was the part where AI assistance
mattered least in a "just give me the answer" sense and most in a
"help me reason through the actual cause" sense — several bugs (duplicate
interface declarations, the Playwright macOS install failure, the
strict-mode locator ambiguity in tests) took multiple rounds of narrowing
down before the real cause was clear, and I ended up understanding my own
codebase and tooling better because of that back-and-forth rather than in
spite of it.