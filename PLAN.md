# Plan: SQL Playground

Goal: a static website in Romanian where a student learns **Oracle SQL** through short lessons, runs real queries
in the browser on a sample school database, and solves exercises that are checked automatically.
It is deployed on Cloudflare Pages (https://proiect-atestat-sql.pages.dev); the code is on GitHub.

**The website is the whole deliverable** (it replaces the 40-page PDF/PowerPoint option). There are no requirements
on language or length. The project just has to present the theme.

## Exam scenario (what the site must support)
1. **Present the home page**: the working SQL site (lessons, editor, exercises).
2. **"Cum funcționează?" page**: explains the structure, the files, the main functions and how a query flows through the app.
3. **Live changes on request** (e.g. "change the heading color"): every line of code has a comment,
   so the student can press Ctrl+F in the editor, find the right line, change it and reload the page.

## Target structure
```
Proiect Atestat/
├── CLAUDE.md  PLAN.md  PROCESS.md  CODING_RULES.md   (notes, not published)
├── serve.py                      (local no-cache server: python3 serve.py → http://localhost:8000)
├── wrangler.toml                 (Cloudflare Pages settings for deploying)
├── functions/_middleware.js      (password check on Cloudflare, runs before every file is sent; not in site/)
├── tests/                        (node tests: test-db.mjs, test-lessons.mjs, test-auth.mjs; not published)
└── site/                         (published to Cloudflare Pages)
    ├── index.html                (home: hero → lessons + exercises → SQL editor)
    ├── cum-functioneaza.html     (how the site works: structure, files, code, "Unde modific?")
    ├── favicon.svg
    ├── css/style.css             (all colors and sizes as commented variables at the top; every purple derives from --color-accent)
    ├── js/
    │   ├── main.js               (page startup, editor, buttons)
    │   ├── db.js                 (load sql.js, create the DB from seed.sql, Oracle compatibility, run queries)
    │   ├── render.js             (result tables, messages, Romanian error translation)
    │   ├── lessons.js            (lesson and exercise data)
    │   ├── lessons-ui.js         (draws lessons/exercises, saves progress)
    │   └── checker.js            (compare the user's result with the reference result)
    ├── data/seed.sql             (CREATE TABLE + INSERT, Oracle-style)
    ├── fonts/                    (JetBrains Mono, OFL)
    └── vendor/sql-wasm.js, sql-wasm.wasm
```

## Oracle vs. the in-browser engine
Real Oracle cannot run in a browser. The engine is **SQLite (sql.js)**, and we make it feel like Oracle:
- **Works as-is:** SELECT/WHERE/ORDER BY/GROUP BY/HAVING, JOINs with `ON`, subqueries, `||`, UPPER/LOWER/LENGTH/SUBSTR/ROUND/TRIM,
  INSERT/UPDATE/DELETE, and Oracle type names in CREATE TABLE (`VARCHAR2(50)`, `NUMBER(5,2)`, `DATE` are accepted).
- **Added by us (JS functions registered in sql.js):** a `DUAL` table, `NVL`, `SYSDATE`, `TO_CHAR`, `TO_DATE`, `INITCAP`,
  `MOD`, `LPAD`/`RPAD`, `MONTHS_BETWEEN`, `ADD_MONTHS` (the final list is decided in Phase 2).
- **Not possible (syntax the engine does not understand):** `ROWNUM`, `FETCH FIRST n ROWS`, old-style `(+)` joins, `MINUS`, sequences, `DATE '...'` literals.
  The lessons avoid these, and the "Cum funcționează?" page has a short section "Diferențe față de Oracle".
- **Known engine quirks (measured on sql.js 1.14.2 / SQLite 3.49.1):** `mod()` doesn't exist; `7/2` gives `3` (Oracle: `3.5`);
  `'a' || NULL` gives NULL (Oracle: `'a'`); `LIKE` ignores case (Oracle: case-sensitive → fix with `PRAGMA case_sensitive_like = ON`);
  `UPPER`/`LOWER` only handle ASCII (`upper('ș')` gives `'ș'`, so we override them in JS).

## Database schema (contract: seed, lessons and exercises all use exactly this)
Oracle types, named constraints, `PRAGMA foreign_keys = ON`. Dates are stored as text `'YYYY-MM-DD'` and inserted with `TO_DATE('2008-05-12', 'YYYY-MM-DD')`.
```
profesori (id_profesor NUMBER(4) PK, nume VARCHAR2(30) NOT NULL, prenume VARCHAR2(30) NOT NULL, email VARCHAR2(50) UNIQUE,
           data_angajarii DATE, salariu NUMBER(7,2), id_sef NUMBER(4) FK → profesori)   -- id_sef: head of department (self-join); NULL for heads
clase     (id_clasa NUMBER(4) PK, nume VARCHAR2(10) NOT NULL UNIQUE, an_studiu NUMBER(2) CHECK 9..12, profil VARCHAR2(30),
           id_diriginte NUMBER(4) FK → profesori)
materii   (id_materie NUMBER(4) PK, denumire VARCHAR2(40) NOT NULL, ore_pe_saptamana NUMBER(2), id_profesor NUMBER(4) FK → profesori)
elevi     (id_elev NUMBER(5) PK, nume VARCHAR2(30) NOT NULL, prenume VARCHAR2(30) NOT NULL, data_nasterii DATE, oras VARCHAR2(30),
           email VARCHAR2(50) (some NULL), id_clasa NUMBER(4) FK → clase)
note      (id_nota NUMBER(6) PK, id_elev NUMBER(5) FK → elevi, id_materie NUMBER(4) FK → materii, nota NUMBER(2) CHECK 1..10, data_notei DATE)
```
Planned sizes: profesori 15, clase 8 (9A..12B), materii 12, elevi 40, note about 150. Some rows are deliberately "interesting":
students with no grades (for LEFT JOIN), a class with no homeroom teacher, NULL emails, professors without a head.

## Module contracts (JS)
- **`js/db.js`**
  - `createDatabase()`: async; loads sql.js, then builds the main DB (Oracle functions + DUAL + seed.sql).
  - `runQuery(sql)`: runs SQL on the main DB. Returns `[{columns, values}]` and throws on an error.
  - `countChangedRows()`: rows changed by the last INSERT/UPDATE/DELETE.
  - `resetDatabase()`: rebuilds the main DB from seed.sql.
  - `getSchema()`: returns `[{ table, columns: [{ name, type }] }]` (user tables only, `dual` excluded).
  - `createScratchDatabase()`: returns a separate new DB (same functions + seed) for the exercise checker. The caller closes it.
  - `prepareOracleSql(sql)`: skips quotes/comments; rewrites bare SYSDATE, strips COMMIT, throws a Romanian error on ROLLBACK and LIMIT.
  - `countChangedRows()` counts over all statements of the last `runQuery` (via `total_changes()`).
- **`js/lessons.js`**: `export const LESSONS = [{ id, title, blocks, exercises }]`
  - `blocks`: `{ type: 'p', text }` | `{ type: 'list', items: [text] }` | `{ type: 'example', sql, explanation }`.
    Text may contain `` `inline code` `` in backticks (rendered as `<code>`; never innerHTML).
  - `exercises`: `{ id, statement, solution, orderMatters, checkQuery?, hint }`.
    Without `checkQuery`, the result of the user's SQL is compared with the result of `solution`.
    With `checkQuery` (DML/DDL), the user's SQL runs on a scratch DB followed by `checkQuery`, and that is compared with `solution` + `checkQuery` run on another scratch DB.
- **`js/checker.js`**: `checkExercise(exercise, userSql)` returns `{ correct, message, result }` (message in Romanian; result = the user's rows or null).
- **`js/lessons-ui.js`**: `startLessons(tryInEditor)` draws the lessons and exercises and saves progress in localStorage.
- **`js/render.js`**: `renderResults(container, results)` (max 500 rows drawn), `renderMessage(container, text, kind)`, `formatCount(count, singular, plural)`, `translateError(message)` (SQLite errors → Romanian).

## Phases

### Phase 0: Setup
- [x] Create the folder structure. `git init`, first commit.
- [x] Create the GitHub repository and push (`owner-seb/proiect-atestat-sql`, public).
- [x] Cloudflare Pages project `proiect-atestat-sql` (direct upload with wrangler; the dashboard Git connection never completed).
      Live: https://proiect-atestat-sql.pages.dev. Deploy command in `CLAUDE.md`.
- → verify: after a deploy, the live URL shows the latest version (checked 2026-09-28: DB loads, queries run, no console errors).

### Phase 1: Skeleton + sql.js
- [x] Vendor sql.js into `site/vendor/` (v1.14.2, MIT license included).
- [x] `index.html` + `cum-functioneaza.html` with the shared layout and navigation.
- [x] `db.js` loads sql.js and runs `SELECT 1 FROM DUAL`.
- → verify: the result shows on the page, the console has no errors, and it works both locally and on the live URL.

### Phase 2: School database + Oracle compatibility
- [x] Tables (Oracle-style types and constraints): `clase`, `profesori`, `materii`, `elevi`, `note`.
- [x] `data/seed.sql`, readable, about 20–50 rows per table.
- [x] Register the Oracle functions from the list above. Check which ones sql.js already has.
- [x] A "Resetează baza de date" button.
- → verify: `SELECT COUNT(*)` per table returns the expected numbers, each Oracle function returns the same value Oracle would
  on a few test calls, and reset works after a `DELETE`.

### Phase 3: SQL editor
- [x] Editor + a "Rulează" button (and Ctrl+Enter). Results shown in a table. Errors shown in Romanian (never a crash).
- [x] Schema panel (tables + columns).
- → verify: a SELECT shows a table, a bad query shows an error, DML shows "N rânduri afectate", and it works at phone width.

### Phase 4: Lessons (Oracle SQL order, as taught at school)
1. Introducere: baze de date relaționale, tabele, SELECT, DUAL
2. WHERE, operatori de comparație, LIKE, BETWEEN, IN, IS NULL
3. ORDER BY, DISTINCT, aliasuri, concatenare `||`
4. Funcții single-row: caractere, numerice, date, NVL
5. Funcții de grup: COUNT, SUM, AVG, MIN, MAX; GROUP BY, HAVING
6. JOIN (INNER, LEFT OUTER, self-join)
7. Subinterogări
8. DML: INSERT, UPDATE, DELETE
9. DDL: CREATE TABLE, tipuri Oracle, constrângeri (PRIMARY KEY, FOREIGN KEY, NOT NULL, UNIQUE, CHECK)
- [x] Each lesson: a short explanation, a one-click example, and 2–4 exercises.
- → verify: every example runs without error.

### Phase 5: Exercise checker
- [x] Compare the user's result with the reference query's result (row order ignored unless the exercise needs ORDER BY).
- [x] Feedback in Romanian. Progress saved in `localStorage`.
- → verify: every reference query is accepted, and at least one wrong query per exercise is rejected.

### Phase 6: "Cum funcționează?" page
- [x] Sections: overview and technologies, file structure, the path of a query (editor → db.js → sql.js → render.js),
      the database schema (diagram), how exercises are checked, differences from Oracle, where to change colors and texts.
- [x] Short code excerpts with explanations.
- → verify: the student can answer "how does X work?" for every file by using only this page.

### Phase 7: Polish + exam rehearsal
- [x] Responsive layout and accessibility (dark theme only, matching sebastian-ungureanu.com).
- [x] Code review + exam rehearsal by review agents; all findings fixed (see PROCESS.md).
- [ ] Rehearse the likely examiner requests: change the heading color, the background color, the font size, a text, a table's data.
- → verify: each request above is done in under a minute with Ctrl+F.

## Deadline
February 2027. Suggested pace: Phases 0–3 by the end of October, Phases 4–5 in November–December,
Phases 6–7 in January, with the final weeks left free for rehearsal.

## Open questions
- [x] Confirm the Oracle approach above (SQLite engine that imitates Oracle, with a "differences" section).
- [x] Confirm the updated `CODING_RULES.md` (comment on every line).
