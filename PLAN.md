# Plan: SQL Playground

Goal: a static website in Romanian where a student learns **Oracle SQL** through short lessons, runs real queries
in the browser on a sample school database, and solves exercises that are checked automatically.
It is deployed on Cloudflare Pages through GitHub.

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
└── site/                         (published to Cloudflare Pages)
    ├── index.html                (home: lessons + SQL editor + exercises)
    ├── cum-functioneaza.html     (how the site works: structure, files, code)
    ├── css/style.css             (all colors and sizes as commented variables at the top)
    ├── js/
    │   ├── main.js               (page startup, button wiring)
    │   ├── db.js                 (load sql.js, create the DB from seed.sql, Oracle compatibility, run queries)
    │   ├── render.js             (render result tables and errors)
    │   ├── lessons.js            (lesson and exercise data)
    │   └── checker.js            (compare the user's result with the reference result)
    ├── data/seed.sql             (CREATE TABLE + INSERT, Oracle-style)
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

## Phases

### Phase 0: Setup
- [x] Create the folder structure. `git init`, first commit.
- [x] Create the GitHub repository and push (`owner-seb/proiect-atestat-sql`, public).
- [x] Connect the repo in the Cloudflare dashboard: Workers & Pages → Create → Pages → Connect to Git.
      Framework preset: None. Build command: empty. Build output directory: `site`.
- → verify: a push to `main` updates the live `*.pages.dev` URL.

### Phase 1: Skeleton + sql.js
- [x] Vendor sql.js into `site/vendor/` (v1.14.2, MIT license included).
- [x] `index.html` + `cum-functioneaza.html` with the shared layout and navigation.
- [x] `db.js` loads sql.js and runs `SELECT 1 FROM DUAL`.
- → verify: the result shows on the page, the console has no errors, and it works both locally and on the live URL.

### Phase 2: School database + Oracle compatibility
- [ ] Tables (Oracle-style types and constraints): `clase`, `profesori`, `materii`, `elevi`, `note`.
- [ ] `data/seed.sql`, readable, about 20–50 rows per table.
- [ ] Register the Oracle functions from the list above. Check which ones sql.js already has.
- [ ] A "Resetează baza de date" button.
- → verify: `SELECT COUNT(*)` per table returns the expected numbers, each Oracle function returns the same value Oracle would
  on a few test calls, and reset works after a `DELETE`.

### Phase 3: SQL editor
- [ ] Editor + a "Rulează" button (and Ctrl+Enter). Results shown in a table. Errors shown in Romanian (never a crash).
- [ ] Schema panel (tables + columns).
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
- [ ] Each lesson: a short explanation, a one-click example, and 2–4 exercises.
- → verify: every example runs without error.

### Phase 5: Exercise checker
- [ ] Compare the user's result with the reference query's result (row order ignored unless the exercise needs ORDER BY).
- [ ] Feedback in Romanian. Progress saved in `localStorage`.
- → verify: every reference query is accepted, and at least one wrong query per exercise is rejected.

### Phase 6: "Cum funcționează?" page
- [ ] Sections: overview and technologies, file structure, the path of a query (editor → db.js → sql.js → render.js),
      the database schema (diagram), how exercises are checked, differences from Oracle, where to change colors and texts.
- [ ] Short code excerpts with explanations.
- → verify: the student can answer "how does X work?" for every file by using only this page.

### Phase 7: Polish + exam rehearsal
- [ ] Responsive layout and accessibility (dark theme only, matching sebastian-ungureanu.com).
- [ ] Rehearse the likely examiner requests: change the heading color, the background color, the font size, a text, a table's data.
- → verify: each request above is done in under a minute with Ctrl+F.

## Deadline
February 2027. Suggested pace: Phases 0–3 by the end of October, Phases 4–5 in November–December,
Phases 6–7 in January, with the final weeks left free for rehearsal.

## Open questions
- [x] Confirm the Oracle approach above (SQLite engine that imitates Oracle, with a "differences" section).
- [x] Confirm the updated `CODING_RULES.md` (comment on every line).
