"""
Seed script for the PromptForge community library.

Inserts 3 demo-quality prompts (one per category) so the library feels alive
from the first demo. Each seed shows a dramatic before/after contrast.

Usage:
    cd backend && source venv/bin/activate
    python -m backend.scripts.seed_library
"""
from backend.db.supabase_client import supabase_client

SEED_PROMPTS = [
    # ------------------------------------------------------------------
    # 1. vibe_coding — "make me a todo app"
    # ------------------------------------------------------------------
    {
        "title": "Full-Stack Todo App with Auth & Persistence",
        "author_name": "PromptForge Team",
        "category": "vibe_coding",
        "original_input": "make me a todo app",
        "crafted_prompt": (
            "You are a senior full-stack engineer specializing in React and Node.js. "
            "Design and implement a production-ready todo application with the following "
            "specifications:\n\n"
            "**Tech stack:** React 18 + TypeScript (frontend), Express + TypeScript "
            "(backend), PostgreSQL (persistence), JWT (auth).\n\n"
            "**Features (must implement all):**\n"
            "1. User registration and login with hashed passwords (bcrypt, cost 12)\n"
            "2. Create, read, update, delete todos — each with title, description, "
            "due date, priority (low/medium/high), and status (pending/in-progress/done)\n"
            "3. Filter todos by status and priority; sort by due date or creation date\n"
            "4. Optimistic UI updates — changes appear instantly before server confirms\n"
            "5. Offline indicator — grey banner when network is unavailable\n\n"
            "**Architecture constraints:**\n"
            "- REST API follows OpenAPI 3.0; include the YAML spec in your output\n"
            "- Database schema uses proper foreign keys, indexes on user_id + status\n"
            "- Input validation with Zod on both client and server\n"
            "- Error boundaries on every async boundary; structured error responses\n\n"
            "**Output format:**\n"
            "1. File tree of the complete project\n"
            "2. Database schema SQL\n"
            "3. Key backend files (auth router, todo router, DB layer)\n"
            "4. Key frontend files (AuthContext, TodoList, TodoItem, API client)\n"
            "5. Docker Compose for local development\n"
            "6. Three unit tests demonstrating the most critical paths\n\n"
            "Be precise. Show complete file contents, not stubs."
        ),
        "crafted_result": (
            "# Full-Stack Todo Application\n\n"
            "## Project Structure\n"
            "```\n"
            "todo-app/\n"
            "├── backend/\n"
            "│   ├── src/\n"
            "│   │   ├── auth/         # JWT middleware, hash utils\n"
            "│   │   ├── todos/        # CRUD router + service layer\n"
            "│   │   ├── db/           # pg pool, migrations\n"
            "│   │   └── app.ts        # Express setup, error handler\n"
            "│   ├── Dockerfile\n"
            "│   └── package.json\n"
            "├── frontend/\n"
            "│   ├── src/\n"
            "│   │   ├── contexts/     # AuthContext, TodoContext\n"
            "│   │   ├── components/   # TodoList, TodoItem, Filters\n"
            "│   │   ├── api/          # typed fetch client with retry\n"
            "│   │   └── App.tsx\n"
            "│   └── package.json\n"
            "└── docker-compose.yml\n"
            "```\n\n"
            "## Database Schema\n"
            "```sql\n"
            "CREATE TABLE users (\n"
            "  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n"
            "  email      TEXT UNIQUE NOT NULL,\n"
            "  password   TEXT NOT NULL,\n"
            "  created_at TIMESTAMPTZ DEFAULT now()\n"
            ");\n\n"
            "CREATE TABLE todos (\n"
            "  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n"
            "  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n"
            "  title       TEXT NOT NULL,\n"
            "  description TEXT,\n"
            "  due_date    DATE,\n"
            "  priority    TEXT CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',\n"
            "  status      TEXT CHECK (status IN ('pending','in-progress','done')) DEFAULT 'pending',\n"
            "  created_at  TIMESTAMPTZ DEFAULT now()\n"
            ");\n"
            "CREATE INDEX idx_todos_user_status ON todos (user_id, status);\n"
            "```\n\n"
            "## Auth Router (Express)\n"
            "```typescript\n"
            "// POST /auth/register — hash password, return JWT\n"
            "// POST /auth/login   — verify hash, return JWT\n"
            "// Full implementation with Zod validation, bcrypt cost 12,\n"
            "// 15-minute access token + 7-day refresh token rotation\n"
            "```\n\n"
            "*(Complete file contents for all 14 files provided in full implementation)*"
        ),
        "raw_result": (
            "Here's a simple todo app:\n\n"
            "```javascript\n"
            "// index.html\n"
            "<input id='todo' /><button onclick='add()'>Add</button>\n"
            "<ul id='list'></ul>\n"
            "<script>\n"
            "  const todos = [];\n"
            "  function add() {\n"
            "    todos.push(document.getElementById('todo').value);\n"
            "    render();\n"
            "  }\n"
            "  function render() {\n"
            "    document.getElementById('list').innerHTML =\n"
            "      todos.map(t => `<li>${t}</li>`).join('');\n"
            "  }\n"
            "</script>\n"
            "```\n\n"
            "This creates a basic todo app. You can add more features like delete "
            "and edit if you want."
        ),
        "total_latency_ms": 2847.0,
    },

    # ------------------------------------------------------------------
    # 2. brainstorming — "ideas for my startup"
    # ------------------------------------------------------------------
    {
        "title": "Developer Productivity SaaS — Structured Startup Ideation",
        "author_name": "PromptForge Team",
        "category": "brainstorming",
        "original_input": "ideas for my startup",
        "crafted_prompt": (
            "You are a veteran startup advisor with exits at two B2B SaaS companies "
            "and a limited partner in a top-10 seed fund. I need a structured "
            "ideation session to identify high-potential startup ideas.\n\n"
            "**My background:** Solo technical founder, 6 years backend engineering, "
            "strong in Python/TypeScript, no sales experience yet.\n\n"
            "**Constraints:**\n"
            "- Bootstrap-friendly: $0 external capital for first 6 months\n"
            "- Sole founder: no co-founder, can hire one contractor in month 3\n"
            "- Target: $10k MRR within 12 months\n"
            "- Market: Developer tools or B2B productivity (my unfair advantage)\n\n"
            "**Framework to apply for each idea:**\n"
            "1. Problem statement (one sentence, specific pain)\n"
            "2. Target customer (title, company size, daily trigger for the pain)\n"
            "3. Solution sketch (what the MVP does in 60 days)\n"
            "4. Monetization (price point, billing model, why they'll pay)\n"
            "5. Why now (tailwind: regulation, tech shift, or market gap)\n"
            "6. Biggest risk + mitigation\n\n"
            "Generate exactly 5 ideas. Rank them by likelihood of reaching $10k MRR "
            "solo within 12 months. After the ranked list, give me the top idea's "
            "30-day action plan (specific daily tasks, not vague milestones).\n\n"
            "Be concrete. No generic advice. If an idea is overdone, say so and "
            "explain why this angle is differentiated."
        ),
        "crafted_result": (
            "# 5 Startup Ideas Ranked by $10k MRR Potential (Solo, 12 months)\n\n"
            "## Rank 1: AI-Powered Code Review Changelog\n"
            "**Problem:** Engineering managers spend 3+ hours/week writing sprint "
            "changelogs from PRs — a task too nuanced for basic scripts.\n"
            "**Customer:** Engineering Manager at 20-200 person startup; trigger is "
            "Monday standup prep or Friday release notes.\n"
            "**MVP (60 days):** GitHub App that reads merged PRs, groups by feature/"
            "fix/infra, and generates a human-readable changelog draft in the team's "
            "tone. Slack slash-command to trigger.\n"
            "**Price:** $49/mo per team (10 engineers). 204 teams = $10k MRR.\n"
            "**Why now:** GitHub Copilot normalized AI-in-dev-workflow; managers are "
            "primed to pay for AI that saves meeting-prep time.\n"
            "**Risk:** GitHub already building this → Mitigate by targeting Jira/"
            "Linear users where GitHub native tools don't reach.\n\n"
            "## Rank 2–5: [API Cost Monitor, PR Sentiment Analyzer, "
            "Internal Docs Freshness Checker, Staging Env Scheduler]\n"
            "*(Full analysis for each idea provided)*\n\n"
            "## 30-Day Action Plan for Rank 1\n"
            "**Week 1:** Days 1-3: Register GitHub App, OAuth flow working locally. "
            "Days 4-5: Cold-email 20 EMs from your LinkedIn — goal is 3 discovery "
            "calls. Days 6-7: Conduct calls, record pain score 1-10.\n"
            "**Week 2:** Build changelog generation with GPT-4o; test on your own "
            "repos. Refine prompt until 4 out of 5 outputs need <2 edits.\n"
            "*(Days 15-30 detailed with specific deliverables and success metrics)*"
        ),
        "raw_result": (
            "Here are some startup ideas:\n\n"
            "1. Build an app\n"
            "2. Create a SaaS product\n"
            "3. Make a marketplace\n"
            "4. Developer tools\n"
            "5. AI-powered something\n\n"
            "You should look for problems people have and try to solve them. "
            "Talk to potential customers to validate your idea first. "
            "Make sure there's a market for what you're building."
        ),
        "total_latency_ms": 3124.0,
    },

    # ------------------------------------------------------------------
    # 3. qa — "how does async work in python"
    # ------------------------------------------------------------------
    {
        "title": "Python Asyncio Deep Dive — Expert Tutorial with Edge Cases",
        "author_name": "PromptForge Team",
        "category": "qa",
        "original_input": "how does async work in python",
        "crafted_prompt": (
            "You are a Python core contributor who has worked on the asyncio library. "
            "Explain Python's async/await model to an experienced developer who knows "
            "Python well but has only used threading and multiprocessing so far.\n\n"
            "**Cover these topics in order:**\n\n"
            "1. **The event loop** — what it is, where it runs, how it decides what "
            "to execute next. Include a simplified pseudocode of the loop itself.\n\n"
            "2. **Coroutines vs threads** — concrete comparison: memory cost, "
            "context-switch cost, GIL interaction, and when each wins.\n\n"
            "3. **await mechanics** — exactly what happens at the CPU level when you "
            "await a coroutine: suspension, resumption, stack frames.\n\n"
            "4. **asyncio.gather vs asyncio.create_task vs await** — show three "
            "code examples doing the same work differently; measure the wall-clock "
            "difference with a real-world I/O example (HTTP calls).\n\n"
            "5. **Top 5 async pitfalls** with minimal reproducing examples:\n"
            "   a) Blocking the event loop with sync code\n"
            "   b) Forgetting to await a coroutine\n"
            "   c) Mixing sync and async libraries incorrectly\n"
            "   d) Task cancellation and cleanup\n"
            "   e) Thread-safety with asyncio.Queue vs queue.Queue\n\n"
            "6. **run_in_executor** — when and how to wrap synchronous libraries so "
            "they don't block the event loop.\n\n"
            "**Format:** Use code blocks for every example. Each pitfall must show "
            "the WRONG version first, then the CORRECT fix. End with a one-page "
            "cheat sheet (markdown table) summarizing when to use each primitive."
        ),
        "crafted_result": (
            "# Python Asyncio: A Deep Dive for Threading Veterans\n\n"
            "## 1. The Event Loop\n\n"
            "The event loop is a single-threaded scheduler that multiplexes I/O "
            "completion events onto coroutines:\n\n"
            "```python\n"
            "# Simplified pseudocode of asyncio's inner loop\n"
            "while ready_queue or io_selector:\n"
            "    # Run all callbacks that are ready right now\n"
            "    while ready_queue:\n"
            "        callback = ready_queue.popleft()\n"
            "        callback()  # runs until the next `await`\n"
            "    # Ask the OS: which sockets/files are ready?\n"
            "    events = io_selector.select(timeout=next_deadline)\n"
            "    for event in events:\n"
            "        ready_queue.append(event.callback)\n"
            "```\n\n"
            "Key insight: **nothing runs in parallel** — concurrency comes from "
            "voluntarily yielding at `await` points.\n\n"
            "## 2. Coroutines vs Threads\n\n"
            "| Dimension | Thread | Coroutine |\n"
            "|-----------|--------|-----------|\n"
            "| Memory (idle) | ~8 MB stack | ~200 bytes frame |\n"
            "| Context switch | ~1-10 µs (OS kernel) | ~0.1 µs (Python) |\n"
            "| GIL impact | Releases during I/O | N/A — single thread |\n"
            "| Best for | CPU-bound + I/O mix | High-concurrency I/O |\n\n"
            "## 3–6. [await mechanics, gather vs create_task, pitfalls, "
            "run_in_executor]\n\n"
            "*(Full tutorial with 12 code examples, 5 pitfall fix pairs, "
            "and cheat sheet table provided)*\n\n"
            "## Cheat Sheet\n\n"
            "| Primitive | Use when |\n"
            "|-----------|----------|\n"
            "| `await coro()` | Sequential, need result before continuing |\n"
            "| `asyncio.gather()` | Fire N coroutines, wait for all results |\n"
            "| `create_task()` | Fire and forget, cancel later if needed |\n"
            "| `run_in_executor()` | Wrapping blocking sync library calls |"
        ),
        "raw_result": (
            "Async in Python uses async/await keywords. You define a function "
            "with `async def` and use `await` to wait for things.\n\n"
            "```python\n"
            "import asyncio\n\n"
            "async def main():\n"
            "    await asyncio.sleep(1)\n"
            "    print('done')\n\n"
            "asyncio.run(main())\n"
            "```\n\n"
            "It's used for things like web requests where you don't want to block. "
            "The event loop handles running multiple things at once. "
            "You can use asyncio.gather() to run multiple coroutines together."
        ),
        "total_latency_ms": 2631.0,
    },
]


def main() -> None:
    """Insert seed prompts into the Supabase prompts table."""
    client = supabase_client()
    try:
        response = client.table("prompts").insert(SEED_PROMPTS).execute()
        inserted = response.data if response.data else []
        print(f"Seed complete — inserted {len(inserted)} prompt(s):")
        for row in inserted:
            print(f"  [{row['category']}] {row['title']} (id: {row['id'][:8]}...)")
    except Exception as exc:
        err = str(exc)
        if "relation" in err.lower() and "does not exist" in err.lower():
            print(
                "ERROR: 'prompts' table not found.\n"
                "Deploy backend/db/schema.sql via Supabase Dashboard > SQL Editor first."
            )
        else:
            print(f"ERROR inserting seed prompts: {exc}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
