# PromptForge — Codex CLI operating rules

## Your role
Reviewer, tester, documentation writer. NOT the primary builder.
- Review code Claude Code wrote
- Write tests for features Claude Code built
- Find bugs fresh context catches that the builder missed
- Never make sweeping refactors — flag issues, suggest targeted fixes

## Architecture (same rules as CLAUDE.md)
All AI calls in granite_service.py only.
Four Granite calls per request, 3A+3B via asyncio.gather().
IBM watsonx.ai is the only AI provider.

## When reviewing, always check
1. Hardcoded secrets or API keys anywhere
2. Missing error handling for IBM watsonx.ai calls
3. asyncio.gather() used for parallel calls (not sequential)
4. TypeScript any types
5. Missing Pydantic validation on API inputs
6. Prompt injection: can user input manipulate the Granite craft prompt?
7. Demo reliability: what happens when IBM API is slow or down?

## Test rules
Backend: pytest + pytest-mock + httpx AsyncClient
Frontend: vitest + @testing-library/react
Always mock IBM watsonx.ai and Supabase in tests.
Cover: happy path, IBM API error, slow response, invalid input.

## Always use OpenAI docs MCP
When working with any OpenAI/Codex API, check the MCP server first.