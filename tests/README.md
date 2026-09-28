# Tests

Automatic tests for the site's JavaScript. They are not published (only `site/` is).
They load the real files from `site/js/` in Node.js, with the browser-only parts (`window.initSqlJs`, `fetch`) replaced by small stubs.
No npm install is needed: sql.js is already in `site/vendor/`.

Run them from the project root (Node.js 18 or newer):

```
node tests/test-db.mjs
node tests/test-lessons.mjs
```

Each file prints one `PASS`/`FAIL` line per check and ends with a summary such as `150 passed, 0 failed`.
If any check fails, the command exits with code 1.

- `test-db.mjs`: the database (`site/js/db.js`): row counts, constraints, the Oracle functions compared with Oracle's values, reset, scratch databases.
- `test-lessons.mjs`: the lessons and the exercise checker (`site/js/lessons.js`, `site/js/checker.js`):
  every example runs, every solution is accepted, at least one wrong answer per exercise is rejected for the expected reason,
  some different but correct answers are accepted, and checking exercises never changes the main database.

When you add an exercise to `lessons.js`, add at least one wrong answer for it in `WRONG_ANSWERS` in `test-lessons.mjs`.
