# Lab 3 — AI Use and Reflection

**LLM used:** Claude (Anthropic)

## Key Prompts

| # | Prompt (paraphrased) | Purpose |
|---|---|---|
| 1 | "pls plan me the issue I need to do here. pls scope to only 5 if possible" | Break Lab 3's full scope into a manageable, ordered set of GitHub Issues before writing any code |
| 2 | "I think I want to allow Ticket's status to change without requirement" (dropping the transition matrix from BR-21) | Make a deliberate scope-reduction decision; got pushed back on for contradicting the handout's own BR-05 first, then a lighter compromise that kept both consistent |
| 3 | "lets go quickly with the code this time too" (drafting the remaining Business Rules) | Move from discussion into direct BR-06 onward drafting once the shape of the rules was agreed |
| 4 | "Auth mechanism: go with simple one and I don't know where to check lab2 using JWT can you tell me how to check?" | Decide between session-cookie and JWT auth by first confirming what Lab 2 actually used, rather than guessing |
| 5 | "there's a redline at tickets Ticket[] in model RequesterUser" | Debug a Prisma schema error during the RequesterUser→User rename migration |
| 6 | "npx prisma migrate dev" repeated across several turns (P3015 missing-file error, enum ordering, RENAME CONSTRAINT syntax error) | Work through a multi-step, multi-error database migration one root cause at a time rather than resetting and starting over |
| 7 | "there is a redline at const ticket = await prisma.$transaction..." | Fix a compile error that turned out to also be a real BR-18 business-logic gap (itPriority never being set at creation) |
| 8 | "then we npx prisma migrate dev right?" / later debugging a 403 on My Tickets after adding Internal Notes routes | Trace a real authorization bug (a blanket role-gate middleware intercepting unrelated requests) back to its actual cause rather than patching the symptom |
| 9 | "sign in work but get a blank white page" | Debug an infinite redirect loop between the auth guard and the mandatory password-change screen |
| 10 | "curl both show 200 now" (after finding the /api/admin 403 was caused by route mount ordering in app.ts) | Trace a second instance of the same class of bug (broad route prefix silently intercepting more specific routes) using curl to isolate frontend vs. backend |
| 11 | "can't we automate the screenshot artifact like lab-02?" | Extend Lab 2's existing Playwright responsive-screenshot pattern to Lab 3's new screens instead of taking manual screenshots |

## My Reflection

The AI agent was most valuable this sprint for the parts that required holding
a lot of context at once — tracing a bug like the two blanket-middleware
authorization issues back through several router files and the mount order in
`app.ts`, or working through a broken database migration across multiple
failed attempts without losing track of what had already been tried. Several
of the bugs this sprint weren't things I'd have caught by just running the
happy path — writing the Issue 5 test suite itself surfaced a real
accessibility defect (form labels with no `htmlFor`/`id` pairing) that had
nothing to do with the feature I was testing, and the responsive screenshot
pass caught a missing mobile nav collapse and a wrong post-login redirect for
Administrators. That matched the point of doing Spec DD/Test DD in the first
place: writing the tests and QA checklist before assuming the feature was
done is what actually found the gaps.

The judgment calls I had to make myself, rather than delegate, were the scope
decisions the handout left open on purpose — how far to simplify the status
transition rules (BR-21), whether to use session cookies or JWTs, and where
the "self-claim only" limitation on ticket ownership should be flagged as a
known gap rather than silently expanded beyond what the API spec asked for.
Debugging sessions were the clearest example of the AI agent working best as
a reasoning partner rather than an answer machine: the migration errors and
the two authorization-bypass bugs took several rounds of "here's the exact
error, why is this happening" before landing on the real cause, and I came
out of each one understanding the underlying mechanism (Postgres migration
ordering, Express middleware matching by prefix) rather than just having a
working fix.