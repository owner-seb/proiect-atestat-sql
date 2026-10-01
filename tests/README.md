# Tests

Automatic tests for the site's JavaScript. They are not published (only `site/` is).
They load the real files from `site/js/` in Node.js, with the browser-only parts (`window.initSqlJs`, `fetch`) replaced by small stubs.
No npm install is needed: sql.js is already in `site/vendor/`.

Run them from the project root (Node.js 18 or newer):

```
node tests/test-db.mjs
node tests/test-lessons.mjs
node tests/test-auth.mjs
```

Each file prints one `PASS`/`FAIL` line per check, grouped under `---` headings, and ends with a summary.
`test-db.mjs` currently ends with `207 passed, 0 failed`. Example lines:

```
--- LIMIT
PASS LIMIT -> error => error: LIMIT nu există în Oracle. În Oracle s-ar folosi FETCH FIRST sau ROWNUM, ...
PASS 'limit' literal allowed => "limit"
...
207 passed, 0 failed
```

If any check fails, the command exits with code 1.

- `test-db.mjs`: the database (`site/js/db.js`): row counts, constraints, the Oracle functions compared with Oracle's values
  (including `SUBSTR`), `COMMIT` removed and `ROLLBACK`/`LIMIT` stopped with a Romanian message, comments skipped by the
  Oracle rewrite, `countChangedRows` over several statements, reset, scratch databases, and the Romanian error
  messages of `translateError` (`site/js/render.js`).
- `test-lessons.mjs`: the lessons and the exercise checker (`site/js/lessons.js`, `site/js/checker.js`):
  every example runs, every solution is accepted, at least one wrong answer per exercise is rejected for the expected reason,
  some different but correct answers are accepted, and checking exercises never changes the main database.
- `test-auth.mjs`: the password check of the live site (`functions/_middleware.js`): the correct password lets the file
  through with any user name, a wrong, missing or malformed password gets 401 with the browser's login request, passwords with
  diacritics and `:` work, and a missing `SITE_PASSWORD` secret keeps the site closed (500).

When you add an exercise to `lessons.js`, add at least one wrong answer for it in `WRONG_ANSWERS` in `test-lessons.mjs`.
