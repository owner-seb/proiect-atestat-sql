# Project: SQL Playground (Atestat de competențe profesionale)

A student project for the Romanian *Examenul de atestare a competențelor profesionale* (informatică).
It is an interactive website for learning **Oracle SQL** (as taught at school): short lessons, plus a SQLite engine
that runs in the browser (sql.js / WebAssembly) and is made to behave like Oracle, plus exercises that are checked
automatically against a sample school database. It is deployed as a static site on **Cloudflare Pages**.

The website **is** the whole deliverable (no PDF/PowerPoint). It has two pages: `index.html` (the working SQL site) and
`cum-functioneaza.html` (explains how the site and its code work). The student defends it orally and may be asked to
**change things live** (e.g. the heading color), so **every line of code has a comment**, which makes it findable with Ctrl+F.

## Key facts
- **Stack:** plain HTML + CSS + vanilla JavaScript (ES modules). No framework, no build step, no npm.
- **Only dependency:** sql.js, vendored into `site/vendor/` (not loaded from a CDN, so it works offline in the exam room).
- **Language:** all UI text, lesson content and documentation are in **Romanian** (with correct diacritics ș ț ă î â).
  Code identifiers, code comments and commit messages are in **English**.
- **Deployable folder:** only `site/` is published (Cloudflare Pages "build output directory" = `site`, no build command).
  Project notes (`CLAUDE.md`, `PLAN.md`, `PROCESS.md`, `CODING_RULES.md`) live at the root and must never be inside `site/`.
- **Deploy:** GitHub → Cloudflare Pages Git integration. A push to `main` deploys automatically.
  The student has authorized Claude to commit and push after each verified step. No Cloudflare API token is needed.
- **Deadline:** February 2027.

## Run locally
sql.js fetches its `.wasm` file, which fails under `file://` (double-clicking index.html won't work). Always serve over HTTP
with the project's own server, which also turns off browser caching (so a normal F5 shows every edit, which matters for live changes in the exam):
```bash
python3 serve.py
```
Then open http://localhost:8000. (`python3 -m http.server` works too, but the browser then caches CSS/JS/seed.sql and F5 shows stale files.)

## Project files: read these before working
- `PLAN.md`: phases, the current phase, and open questions.
- `CODING_RULES.md`: the coding rules. **Follow them for every change.**
- `PROCESS.md`: a dated development log. Add an entry after each work session or milestone (it feeds the written documentation).

---

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
