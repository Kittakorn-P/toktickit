# TokTickIT — Sprint 4 AI Use and Reflection

**LLM used:** Claude (Anthropic)

## Key Prompts

| # | Prompt (paraphrased) | Purpose |
|---|---|---|
| 1 | "let first plan out the issue and plan for the work... lets plan to stick around 5 issue if possible" | Break Lab 4's full scope into a manageable, ordered set of GitHub Issues before writing any code |
| 2 | "ok I was done creating the issue on GitHub let's jump right into specification.md" | Move straight from issue planning into drafting the engineering contract, once the branch/issue structure existed |
| 3 | "here the reviewer comment on the PR for issue 2... what action will we take now?" (closed/cancelled tickets still accepting actions, a 500 on non-string input, a non-atomic stale-update check, edit rights wrongly restricted to the author, no double-click guard) | Work through a real PR review comment-by-comment: which fixes were correctness bugs vs. which were deliberately deferred to a later PR, and correcting a wrong assumption in the spec itself rather than just patching code around it |
| 4 | "so right now there is 2 StaffTicketDetail.test in both lab3 and lab4 test can you clarify which one is this" | Catch a self-inflicted regression early — a new feature's added API call broke an existing, unrelated test file's mocks — and get it diagnosed precisely enough to patch without touching unrelated test logic |
| 5 | "it still persist but its probably by lab02, just ignore it" | Decide which `act()` warnings were worth root-causing (an early-vs-late state update race specific to one test's assertion order) versus which were safe to treat as known noise and move on from |
| 6 | "does this issue 3 feature name is feature/lab4-actions-taken-ui? If yes I accidentally push wrong one :( HOW TO REVERT" | Recover from a git workflow mistake (committed to the wrong feature branch) without losing the work, using `cherry-pick` instead of redoing it |
| 7 | "all pass but when I run `npx vitest run` it fails why?" (a staff-dashboard test passed in isolation but failed intermittently in the full suite) | Diagnose a flaky test caused by a shared test database and parallel test-file execution, rather than assume the dashboard feature itself was broken |

## My Reflection

Sprint 4's AI-agent use was heaviest on two things: carrying a growing, mutually-
referencing spec/code/test surface without letting any one piece drift out of
sync, and distinguishing real bugs from test-authoring mistakes when something
failed. A reviewer catching that Actions Taken edit rights should belong to any
IT Staff member, not just the original author, was a genuine error in my own
spec assumption from Issue 2 — worth fixing in `specification.md` itself
(with the old wording struck through, not silently deleted) rather than only
in code, since a grader reading the spec shouldn't see a claim the code no
longer matches. The staff-dashboard flakiness was the sharpest example of
needing to actually reason about *why* a test behaves differently under
`vitest run tests/lab-04` versus the full suite — the fix wasn't anything in
the dashboard route, it was recognizing that two sequential snapshots of a
genuinely org-wide, shared-database count will legitimately drift apart once
other test files are running concurrently against the same table.

The judgment calls that were mine to make, not the agent's: deciding Dashboard
should become the landing page for every role including Administrator
(replacing the old `/admin/users` redirect), accepting a whole-page
loading/error state for dashboards instead of building out true per-card
failure isolation (a deliberate simplification from the original `ui-spec.md`
wording), and choosing to defer the "cannot resolve without at least one
Action Taken" gate to its own PR rather than fold it into Issue 2. The git
branch mixup was also a useful reminder to actually run `git status` before
trusting which branch a commit landed on, rather than assuming the terminal
prompt's branch name is always right at the moment of typing a command.