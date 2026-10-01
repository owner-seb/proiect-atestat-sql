# Coding Rules

## 1. Explainability comes first
- The student must be able to explain **every line** to the exam committee. If a piece of code can't be explained simply, rewrite it more simply.
- No copied snippets that aren't understood, and no minified code (except the vendored sql.js library).

## 1a. Comment everything (for live changes during the exam)
- **Every function** has a comment block above it: what it does, its parameters, and what it returns.
- **Every line** (or every small group of 2–3 closely related lines) has a short comment, in JS, CSS, HTML and SQL.
- Comments use plain, searchable words that match what an examiner would ask for,
  e.g. `/* main heading color */`, `<!-- page title shown in the header -->`, `// run button click`.
- All colors, fonts and sizes are CSS variables at the top of `style.css`, each with a comment saying exactly
  what it changes on the page (e.g. `--color-heading: #1d4ed8; /* color of all headings (h1, h2) */`).
- The top of every file has a header comment: the file's purpose and which page uses it.

## 2. Stack and dependencies
- Plain HTML5, CSS3 and vanilla JavaScript, loaded as ES modules (`<script type="module">`).
- No frameworks, no npm, no bundler, no build step.
- The only external library is **sql.js**, vendored in `site/vendor/`. The only other external asset is the JetBrains Mono font (OFL), in `site/fonts/`. Adding any other dependency requires an explicit decision, logged in `PROCESS.md`.
- No CDN links at runtime. The site must work offline once served.

## 3. Language
- UI text, lesson content, error messages shown to users, and documentation are in **Romanian**, with correct diacritics:
  **ș ț** (comma below), not ş ţ (cedilla), plus ă î â.
- Identifiers, code comments and commit messages are in **English**.
- `<html lang="ro">` and `<meta charset="UTF-8">` on every page.

## 4. JavaScript
- `const` by default, `let` only when the value is reassigned, never `var`.
- `camelCase` for variables and functions, `UPPER_SNAKE_CASE` for constants, `kebab-case` for file names.
- Small functions that each do one thing. One file per responsibility (see the structure in `PLAN.md`).
- Strict equality (`===`, `!==`).
- `async`/`await` instead of `.then()` chains.
- No global variables. Share code through `import`/`export`.

## 5. Security
- Query results and user input are **never** inserted with `innerHTML`. Use `textContent` or `document.createElement`.
  (Results come from SQL the user typed, which may contain HTML.)
- Every query runs against the in-memory browser database only. There is no server for the app itself; the only
  server code is `functions/_middleware.js`, the password check that Cloudflare runs before sending any file.
- Never commit the site password: it lives only in the Cloudflare secret `SITE_PASSWORD` (the repo is public).
- Errors from sql.js are caught and shown as a friendly Romanian message. The page must never break because of a bad query.

## 6. HTML and CSS
- Semantic HTML: `header`, `nav`, `main`, `section`, `button` (not clickable `div`s), and `label` for every input.
- All styles in `site/css/`. No inline `style=""` attributes.
- Colors and spacing as CSS variables on `:root`.
- **Design:** match the student's own site, sebastian-ungureanu.com. It is dark-only (black background, `#111` surfaces,
  `#ededed` text), with a purple accent `#a259ff` plus glow, JetBrains Mono for all text (stored in `site/fonts/`),
  a floating pill-shaped menu bar, a purple `>` before headings, and a white-purple gradient on big titles. There is no light theme.
- Mobile-first: works at 360px width with no horizontal page scroll (wide result tables scroll inside their own container).
- Keyboard accessible: visible focus styles, and Ctrl+Enter runs the query.

## 7. SQL (seed and lessons)
- Write **Oracle-style SQL**: `VARCHAR2`, `NUMBER`, `DATE`, named constraints, `FROM DUAL`, Oracle function names.
  Never teach SQLite-only syntax (e.g. `LIMIT`, `AUTOINCREMENT`). If something can't work in the engine, leave it out and list it under "Diferențe față de Oracle".
- SQL keywords in UPPERCASE, table and column names in lowercase `snake_case` (Romanian names are fine, e.g. `elevi`, `data_nasterii`).
- The seed database is readable SQL in `site/data/seed.sql`, never a binary `.db` file.
- Every lesson example and every exercise's reference query must run without error on the seed data.

## 8. Formatting
- 2-space indentation, semicolons, single quotes in JS, double quotes in HTML attributes.
- UTF-8, LF line endings, a newline at the end of each file.

## 9. Workflow
- Work one `PLAN.md` item at a time, verify it in the browser (served over HTTP), then tick it off.
- After each milestone, add an entry to `PROCESS.md`.
- Commit after each verified step, with short English commit messages in the imperative ("Add schema panel").
