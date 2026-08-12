# Lab 1 — AI Use and Reflection  (fill this in)

**LLM/agent used:** <Claude (Anthropic), via claude.ai chat interface>

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Asked why `gh: command not found` appeared 
    | Learned GitHub CLI wasn't installed; installed it via Homebrew myself |
| 2 | Asked why `git push` failed with "src refspec does not match" 
    | Understood that Git branches need at least one commit to exist; made an initial commit myself before retrying |
| 3 | Asked to explain the difference between the general Git cheat sheet and the labsheet's branch rules
    | Corrected my branch structure to use `lab1-staging` instead of `main`, per the actual assignment rules |
| 4 | Asked for hints (not code) to implement `/api/health` 
    | Wrote the Express route myself; Claude only pointed me toward the syntax pattern already used elsewhere in the stub file |
| 5 | Asked why my Vitest test for categories kept showing "skipped" 
    | Discovered `describe.todo()`/`it.todo()` syntax; rewrote it into a real test myself |
| 6 | Asked why my test failed with an unexpected `createdAt` field 
    | Learned to use Prisma's `select` option to control returned fields, rather than being given the fixed code directly |
| 7 | Asked for hints on writing `handleCheck` async logic in React 
    | Wrote the try/catch and state-setting logic myself after being guided through each piece |
| 8 | Asked how to mock an API call in a Vitest UI test 
    | Learned `vi.spyOn()` and `findByText()` and wrote both UI tests myself |


## Reflection
My prompts an the AI usage got better as the lab went on, before I'd just paste errors and just to 'fix' it for me but I learned to ask 'why' something failed instead, which helped me actually understand Git and Prisma instead of just copying a fix.