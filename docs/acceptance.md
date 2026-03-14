# Acceptance criteria

## BLOCKING — cannot submit without these
- [ ] POST /api/forge returns ForgeResponse with populated good_result AND bad_result
- [ ] good_result is visibly richer/longer than bad_result (the whole point)
- [ ] crafted_prompt is 150+ words (not just repeating the input)
- [ ] All 4 Granite calls are REAL (not stubs) — verifiable in API calls panel
- [ ] GET /api/library returns array (seeded data minimum)
- [ ] Frontend three-column layout renders without errors
- [ ] CraftedPrompt typewriter animation fires on result
- [ ] ResultPanel shows green/red bordered before/after
- [ ] Demo preset buttons pre-fill and trigger the forge
- [ ] App deployed at live URL (Railway or Replit)
- [ ] GitHub repo public with README

## HIGH PRIORITY
- [ ] IBM API calls panel showing real latencies per call
- [ ] Save to Library modal works and persists to Supabase
- [ ] /library page shows community prompts with category filter
- [ ] Mobile responsive (375px width usable)
- [ ] npm run build zero errors, npx tsc --noEmit zero errors
- [ ] Total forge latency under 15 seconds (Granite can be slow)

## NICE TO HAVE
- [ ] Upvoting in community library
- [ ] Prompt score displayed ("14x richer")
- [ ] Demo Mode button (auto-runs habit tracker demo)
- [ ] Copy prompt button in CraftedPrompt panel
- [ ] Forge event analytics logged to Supabase