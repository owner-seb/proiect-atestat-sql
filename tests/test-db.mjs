// test-db.mjs - tests for site/js/db.js (row counts, constraints, Oracle functions, reset, scratch databases).
// Run from the project root: node tests/test-db.mjs
// It loads the REAL site/js/db.js in node; the browser-only parts (window.initSqlJs and fetch) are replaced by stubs.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../site', import.meta.url)); // the site/ folder, found from this file's location
const require = createRequire(import.meta.url);
const initSqlJs = require(ROOT + '/vendor/sql-wasm.js'); // the same sql.js file the site uses
globalThis.window = { initSqlJs: () => initSqlJs() }; // db.js calls window.initSqlJs
globalThis.fetch = async (url) => ({ ok: true, text: async () => fs.readFileSync(ROOT + '/' + url, 'utf8') }); // db.js fetches data/seed.sql

const dbModule = await import(pathToFileURL(ROOT + '/js/db.js').href);
const { createDatabase, runQuery: runMain, countChangedRows, resetDatabase, getSchema, createScratchDatabase, prepareOracleSql } = dbModule;
// database given -> scratch path used by the checker: exec(prepareOracleSql(sql)); otherwise the real runQuery
const runQuery = (sql, database) => (database ? database.exec(prepareOracleSql(sql)) : runMain(sql));

let pass = 0; let fail = 0;
const one = (sql, database) => { const r = runQuery(sql, database); return r.length ? r[0].values[0][0] : undefined; };
function check(label, actual, expected) {
  const ok = typeof expected === 'number' && typeof actual === 'number'
    ? Math.abs(actual - expected) < 1e-9 : actual === expected;
  if (ok) pass++; else fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + label + ' => ' + JSON.stringify(actual) + (ok ? '' : '   (expected ' + JSON.stringify(expected) + ')'));
}
function checkError(label, sql, fragment, database) {
  try { runQuery(sql, database); fail++; console.log('FAIL ' + label + ' => no error'); }
  catch (e) { const ok = e.message.includes(fragment); if (ok) pass++; else fail++; console.log((ok ? 'PASS ' : 'FAIL ') + label + ' => error: ' + e.message); }
}

await createDatabase();
console.log('--- DUAL and row counts');
check('SELECT 1 FROM DUAL', one('SELECT 1 FROM DUAL'), 1);
check("SELECT dummy FROM DUAL", one('SELECT dummy FROM DUAL'), 'X');
for (const [t, n] of [['profesori', 15], ['clase', 8], ['materii', 12], ['elevi', 40], ['note', 153]]) {
  check('COUNT(*) ' + t, one('SELECT COUNT(*) FROM ' + t), n);
}
console.log('--- interesting rows');
check('students without grades', JSON.stringify(runQuery('SELECT e.id_elev FROM elevi e LEFT JOIN note n ON n.id_elev = e.id_elev WHERE n.id_nota IS NULL ORDER BY 1')[0].values.flat()), '[8,23,37]');
check('class without diriginte', one('SELECT nume FROM clase WHERE id_diriginte IS NULL'), '12B');
check('students with NULL email', JSON.stringify(runQuery('SELECT id_elev FROM elevi WHERE email IS NULL ORDER BY 1')[0].values.flat()), '[4,12,19,27,33,38]');
check('heads (id_sef NULL)', JSON.stringify(runQuery('SELECT id_profesor FROM profesori WHERE id_sef IS NULL ORDER BY 1')[0].values.flat()), '[1,2,3]');
check('materie without teacher', one('SELECT denumire FROM materii WHERE id_profesor IS NULL'), 'Educație antreprenorială');
check('materie 12 has no grades', one('SELECT COUNT(*) FROM note WHERE id_materie = 12'), 0);
check('profs without materie', JSON.stringify(runQuery('SELECT p.id_profesor FROM profesori p LEFT JOIN materii m ON m.id_profesor = p.id_profesor WHERE m.id_materie IS NULL ORDER BY 1')[0].values.flat()), '[4,13,14,15]');
check('students with AVG < 5', JSON.stringify(runQuery('SELECT id_elev FROM note GROUP BY id_elev HAVING AVG(nota) < 5 ORDER BY 1')[0].values.flat()), '[16,33]');
console.log('grade histogram', JSON.stringify(runQuery('SELECT nota, COUNT(*) FROM note GROUP BY nota ORDER BY nota')[0].values));
console.log('grade date range', JSON.stringify(runQuery('SELECT MIN(data_notei), MAX(data_notei) FROM note')[0].values));
console.log('birth years per an_studiu', JSON.stringify(runQuery("SELECT c.an_studiu, MIN(e.data_nasterii), MAX(e.data_nasterii) FROM elevi e JOIN clase c ON c.id_clasa = e.id_clasa GROUP BY c.an_studiu")[0].values));
console.log('cities', JSON.stringify(runQuery('SELECT oras, COUNT(*) FROM elevi GROUP BY oras ORDER BY 2 DESC')[0].values));
check('self-join works', one("SELECT s.nume FROM profesori p JOIN profesori s ON p.id_sef = s.id_profesor WHERE p.id_profesor = 14"), 'Ionescu');
check('date stored as text', one('SELECT typeof(data_nasterii) || \':\' || data_nasterii FROM elevi WHERE id_elev = 1'), 'text:2010-03-14');

console.log('--- constraints');
checkError('nota 11 rejected', 'INSERT INTO note VALUES (999, 1, 1, 11, NULL)', 'ck_note_nota');
checkError('nota 0 rejected', 'INSERT INTO note VALUES (999, 1, 1, 0, NULL)', 'ck_note_nota');
checkError('bad id_clasa rejected', "INSERT INTO elevi VALUES (99, 'X', 'Y', NULL, NULL, NULL, 77)", 'FOREIGN KEY');
checkError('an_studiu 13 rejected', "INSERT INTO clase VALUES (9, '13A', 13, NULL, NULL)", 'ck_clase_an_studiu');
checkError('duplicate class name rejected', "INSERT INTO clase VALUES (9, '9A', 9, NULL, NULL)", 'UNIQUE');
checkError('duplicate PK rejected', "INSERT INTO elevi VALUES (1, 'X', 'Y', NULL, NULL, NULL, 1)", 'UNIQUE');
checkError('NOT NULL nume rejected', "INSERT INTO elevi VALUES (99, NULL, 'Y', NULL, NULL, NULL, 1)", 'NOT NULL');
checkError('delete referenced student rejected', 'DELETE FROM elevi WHERE id_elev = 1', 'FOREIGN KEY');
checkError('bad id_sef rejected', "UPDATE profesori SET id_sef = 99 WHERE id_profesor = 4", 'FOREIGN KEY');

console.log('--- LIKE is case-sensitive');
check("'Ana' LIKE 'a%'", one("SELECT 'Ana' LIKE 'a%' FROM DUAL"), 0);
check("'Ana' LIKE 'A%'", one("SELECT 'Ana' LIKE 'A%' FROM DUAL"), 1);
check("elevi nume LIKE 'p%'", one("SELECT COUNT(*) FROM elevi WHERE nume LIKE 'p%'"), 0);
check("elevi nume LIKE 'P%'", one("SELECT COUNT(*) FROM elevi WHERE nume LIKE 'P%'"), 5);
check("nume LIKE 'Ș%'", one("SELECT COUNT(*) FROM elevi WHERE nume LIKE 'Ș%'"), 1);

console.log('--- Oracle functions');
check('NVL(NULL, 0)', one('SELECT NVL(NULL, 0) FROM DUAL'), 0);
check("NVL('a', 'b')", one("SELECT NVL('a', 'b') FROM DUAL"), 'a');
check('NVL(NULL, NULL)', one('SELECT NVL(NULL, NULL) FROM DUAL'), null);
check("NVL(email, '-') count", one("SELECT COUNT(*) FROM elevi WHERE NVL(email, 'fara') = 'fara'"), 6);
check("NVL2(NULL, 'da', 'nu')", one("SELECT NVL2(NULL, 'da', 'nu') FROM DUAL"), 'nu');
check("NVL2(5, 'da', 'nu')", one("SELECT NVL2(5, 'da', 'nu') FROM DUAL"), 'da');
check("NVL2(0, 'da', NULL)", one("SELECT NVL2(0, 'da', NULL) FROM DUAL"), 'da');
checkError('NVL(1) wrong arg count', 'SELECT NVL(1) FROM DUAL', 'wrong number of arguments');
const d = new Date(); const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
check('SYSDATE (bare)', one('SELECT SYSDATE FROM DUAL'), today);
check('sysdate (lowercase bare)', one('select sysdate from dual'), today);
check('SYSDATE()', one('SELECT SYSDATE() FROM DUAL'), today);
check("'SYSDATE' literal untouched", one("SELECT 'SYSDATE' FROM DUAL"), 'SYSDATE');
check("'it''s SYSDATE' literal untouched", one("SELECT 'it''s SYSDATE' FROM DUAL"), "it's SYSDATE");
check("SYSDATE after escaped quote", one("SELECT 'O''Brien' || SYSDATE FROM DUAL"), "O'Brien" + today);
check('SYSDATE in WHERE', one('SELECT COUNT(*) FROM elevi WHERE data_nasterii < SYSDATE'), 40);
check("TO_DATE('2008-05-12','YYYY-MM-DD')", one("SELECT TO_DATE('2008-05-12', 'YYYY-MM-DD') FROM DUAL"), '2008-05-12');
check("TO_DATE('5.3.2008','DD.MM.YYYY')", one("SELECT TO_DATE('5.3.2008', 'DD.MM.YYYY') FROM DUAL"), '2008-03-05');
check("TO_DATE('29/02/2024','dd/mm/yyyy')", one("SELECT TO_DATE('29/02/2024', 'dd/mm/yyyy') FROM DUAL"), '2024-02-29');
check("TO_DATE('12-05-2008','DD-MM-YYYY')", one("SELECT TO_DATE('12-05-2008', 'DD-MM-YYYY') FROM DUAL"), '2008-05-12');
check("TO_DATE('12.05.2008','DD.MM.YYYY')", one("SELECT TO_DATE('12.05.2008', 'DD.MM.YYYY') FROM DUAL"), '2008-05-12');
check('TO_DATE(NULL, fmt)', one("SELECT TO_DATE(NULL, 'YYYY-MM-DD') FROM DUAL"), null);
checkError("TO_DATE('31.02.2025') invalid", "SELECT TO_DATE('31.02.2025', 'DD.MM.YYYY') FROM DUAL", 'nu este o dată validă');
checkError("TO_DATE('29.02.2025') invalid", "SELECT TO_DATE('29.02.2025', 'DD.MM.YYYY') FROM DUAL", 'nu este o dată validă');
checkError("TO_DATE DD-MON-YYYY unsupported", "SELECT TO_DATE('12-MAY-2008', 'DD-MON-YYYY') FROM DUAL", 'nu este suportat');
check("TO_CHAR('2008-05-02','DD.MM.YYYY')", one("SELECT TO_CHAR(TO_DATE('2008-05-02', 'YYYY-MM-DD'), 'DD.MM.YYYY') FROM DUAL"), '02.05.2008');
check("TO_CHAR(d,'DD-MM-YYYY')", one("SELECT TO_CHAR(data_nasterii, 'DD-MM-YYYY') FROM elevi WHERE id_elev = 1"), '14-03-2010');
check("TO_CHAR(d,'DD/MM/YYYY')", one("SELECT TO_CHAR(data_nasterii, 'DD/MM/YYYY') FROM elevi WHERE id_elev = 1"), '14/03/2010');
check("TO_CHAR(d,'YYYY')", one("SELECT TO_CHAR(data_nasterii, 'YYYY') FROM elevi WHERE id_elev = 1"), '2010');
check("TO_CHAR(d,'MM')", one("SELECT TO_CHAR(data_nasterii, 'MM') FROM elevi WHERE id_elev = 1"), '03');
check("TO_CHAR(d,'DD')", one("SELECT TO_CHAR(data_nasterii, 'DD') FROM elevi WHERE id_elev = 1"), '14');
check("TO_CHAR(d,'MONTH') padded", one("SELECT TO_CHAR(TO_DATE('2008-05-12', 'YYYY-MM-DD'), 'MONTH') FROM DUAL"), 'MAY      ');
check("TO_CHAR(d,'Month')", one("SELECT TO_CHAR(TO_DATE('2008-09-12', 'YYYY-MM-DD'), 'Month') FROM DUAL"), 'September');
check("TO_CHAR(d,'DD Month YYYY')", one("SELECT TO_CHAR(TO_DATE('2008-05-12', 'YYYY-MM-DD'), 'DD Month YYYY') FROM DUAL"), '12 May       2008');
check("TO_CHAR(d,'fmDD Month YYYY')", one("SELECT TO_CHAR(TO_DATE('2008-05-02', 'YYYY-MM-DD'), 'fmDD Month YYYY') FROM DUAL"), '2 May 2008');
check("TO_CHAR(d,'month')", one("SELECT TO_CHAR(TO_DATE('2008-01-12', 'YYYY-MM-DD'), 'fmmonth') FROM DUAL"), 'january');
check("TO_CHAR(d,'DD-MON-YYYY')", one("SELECT TO_CHAR(TO_DATE('2008-09-12', 'YYYY-MM-DD'), 'DD-MON-YYYY') FROM DUAL"), '12-SEP-2008');
check('TO_CHAR(7420.5)', one('SELECT TO_CHAR(7420.5) FROM DUAL'), '7420.5');
check('TO_CHAR(10)', one('SELECT TO_CHAR(10) FROM DUAL'), '10');
check('TO_CHAR(NULL)', one('SELECT TO_CHAR(NULL) FROM DUAL'), null);
check("TO_CHAR(NULL,'YYYY')", one("SELECT TO_CHAR(NULL, 'YYYY') FROM DUAL"), null);
check("TO_CHAR(SYSDATE,'YYYY')", one("SELECT TO_CHAR(SYSDATE, 'YYYY') FROM DUAL"), String(d.getFullYear()));
checkError("TO_CHAR(n,'9999.99') unsupported", "SELECT TO_CHAR(12.5, '9999.99') FROM DUAL", 'numere');
checkError("TO_CHAR(d,'HH24:MI') unsupported", "SELECT TO_CHAR(SYSDATE, 'DD.MM.YYYY HH24:MI') FROM DUAL", 'nu este suportat');
checkError('TO_CHAR() no args', 'SELECT TO_CHAR() FROM DUAL', 'wrong number of arguments');
checkError('TO_CHAR 3 args', "SELECT TO_CHAR(1, 'a', 'b') FROM DUAL", 'wrong number of arguments');
check("INITCAP('ana-maria POPESCU')", one("SELECT INITCAP('ana-maria POPESCU') FROM DUAL"), 'Ana-Maria Popescu');
check("INITCAP('ștefan ȚURCANU')", one("SELECT INITCAP('ștefan ȚURCANU') FROM DUAL"), 'Ștefan Țurcanu');
check("INITCAP('hello world2x')", one("SELECT INITCAP('hello world2x') FROM DUAL"), 'Hello World2x');
check('INITCAP(NULL)', one('SELECT INITCAP(NULL) FROM DUAL'), null);
check('MOD(11, 4)', one('SELECT MOD(11, 4) FROM DUAL'), 3);
check('MOD(-11, 4)', one('SELECT MOD(-11, 4) FROM DUAL'), -3);
check('MOD(11, 0)', one('SELECT MOD(11, 0) FROM DUAL'), 11);
check('MOD(7.5, 2)', one('SELECT MOD(7.5, 2) FROM DUAL'), 1.5);
check('MOD(NULL, 2)', one('SELECT MOD(NULL, 2) FROM DUAL'), null);
check("LPAD('abc', 6, '*')", one("SELECT LPAD('abc', 6, '*') FROM DUAL"), '***abc');
check("LPAD('abcdef', 3)", one("SELECT LPAD('abcdef', 3) FROM DUAL"), 'abc');
check("LPAD(7, 3, '0')", one("SELECT LPAD(7, 3, '0') FROM DUAL"), '007');
check("LPAD('ab', 4)", one("SELECT LPAD('ab', 4) FROM DUAL"), '  ab');
check("LPAD(NULL, 4)", one("SELECT LPAD(NULL, 4) FROM DUAL"), null);
check("LPAD('ab', 0)", one("SELECT LPAD('ab', 0) FROM DUAL"), null);
check("RPAD('ab', 5, 'xy')", one("SELECT RPAD('ab', 5, 'xy') FROM DUAL"), 'abxyx');
check("RPAD('ab', 4)", one("SELECT RPAD('ab', 4) FROM DUAL"), 'ab  ');
check("RPAD('abcdef', 2)", one("SELECT RPAD('abcdef', 2) FROM DUAL"), 'ab');
check("RPAD('ab', 4, NULL)", one("SELECT RPAD('ab', 4, NULL) FROM DUAL"), null);
checkError('LPAD(1) wrong arg count', "SELECT LPAD('a') FROM DUAL", 'wrong number of arguments');
check("MONTHS_BETWEEN('1995-02-02','1995-01-01')", one("SELECT MONTHS_BETWEEN('1995-02-02', '1995-01-01') FROM DUAL"), 1 + 1 / 31);
check("MONTHS_BETWEEN('2025-02-28','2025-01-31')", one("SELECT MONTHS_BETWEEN('2025-02-28', '2025-01-31') FROM DUAL"), 1);
check("MONTHS_BETWEEN('2025-03-15','2024-03-15')", one("SELECT MONTHS_BETWEEN('2025-03-15', '2024-03-15') FROM DUAL"), 12);
check("MONTHS_BETWEEN('2024-01-01','2024-03-01')", one("SELECT MONTHS_BETWEEN('2024-01-01', '2024-03-01') FROM DUAL"), -2);
check("MONTHS_BETWEEN(NULL, d)", one("SELECT MONTHS_BETWEEN(NULL, '2024-03-01') FROM DUAL"), null);
check('age via TRUNC(MONTHS_BETWEEN(SYSDATE, d)/12)', one("SELECT TRUNC(MONTHS_BETWEEN(TO_DATE('2025-03-14', 'YYYY-MM-DD'), data_nasterii) / 12) FROM elevi WHERE id_elev = 1"), 15);
check("ADD_MONTHS('2025-04-30', 1)", one("SELECT ADD_MONTHS('2025-04-30', 1) FROM DUAL"), '2025-05-31');
check("ADD_MONTHS('2025-01-31', 1)", one("SELECT ADD_MONTHS('2025-01-31', 1) FROM DUAL"), '2025-02-28');
check("ADD_MONTHS('2024-01-31', 1) leap", one("SELECT ADD_MONTHS('2024-01-31', 1) FROM DUAL"), '2024-02-29');
check("ADD_MONTHS('2024-01-15', -2)", one("SELECT ADD_MONTHS('2024-01-15', -2) FROM DUAL"), '2023-11-15');
check("ADD_MONTHS('2024-11-15', 14)", one("SELECT ADD_MONTHS('2024-11-15', 14) FROM DUAL"), '2026-01-15');
check("ADD_MONTHS(NULL, 1)", one("SELECT ADD_MONTHS(NULL, 1) FROM DUAL"), null);
checkError("ADD_MONTHS('abc', 1) not a date", "SELECT ADD_MONTHS('abc', 1) FROM DUAL", 'nu este o dată');
check('TRUNC(15.79)', one('SELECT TRUNC(15.79) FROM DUAL'), 15);
check('TRUNC(15.79, 1)', one('SELECT TRUNC(15.79, 1) FROM DUAL'), 15.7);
check('TRUNC(15.79, -1)', one('SELECT TRUNC(15.79, -1) FROM DUAL'), 10);
check('TRUNC(-15.79)', one('SELECT TRUNC(-15.79) FROM DUAL'), -15);
check('TRUNC(4.35, 2)', one('SELECT TRUNC(4.35, 2) FROM DUAL'), 4.35);
check('TRUNC(12345.678, -2)', one('SELECT TRUNC(12345.678, -2) FROM DUAL'), 12300);
check('TRUNC(NULL)', one('SELECT TRUNC(NULL) FROM DUAL'), null);
check('TRUNC(SYSDATE)', one('SELECT TRUNC(SYSDATE) FROM DUAL'), today);
check('TRUNC(AVG(nota), 2) numeric', typeof one('SELECT TRUNC(AVG(nota), 2) FROM note'), 'number');
check("UPPER('ștefan țurcanu')", one("SELECT UPPER('ștefan țurcanu') FROM DUAL"), 'ȘTEFAN ȚURCANU');
check("UPPER('ăîâ')", one("SELECT UPPER('ăîâ') FROM DUAL"), 'ĂÎÂ');
check('UPPER(NULL)', one('SELECT UPPER(NULL) FROM DUAL'), null);
check("LOWER('ȘTEFĂNESCU')", one("SELECT LOWER('ȘTEFĂNESCU') FROM DUAL"), 'ștefănescu');
check('LOWER(NULL)', one('SELECT LOWER(NULL) FROM DUAL'), null);
check("UPPER(nume) = 'ȘTEFĂNESCU'", one("SELECT COUNT(*) FROM elevi WHERE UPPER(nume) = 'ȘTEFĂNESCU'"), 1);
check('built-in ROUND(2.567, 2)', one('SELECT ROUND(2.567, 2) FROM DUAL'), 2.57);
check('built-in LENGTH(ș)', one("SELECT LENGTH('Brașov') FROM DUAL"), 6);
check('built-in SUBSTR', one("SELECT SUBSTR('Brașov', 1, 4) FROM DUAL"), 'Braș');

console.log('--- COMMIT / ROLLBACK');
check('COMMIT alone -> no results, no error', JSON.stringify(runQuery('COMMIT;')), '[]');
check('rollback alone (lowercase)', JSON.stringify(runQuery('rollback')), '[]');
runQuery("INSERT INTO elevi VALUES (900, 'Test', 'Commit', NULL, NULL, NULL, 1);\nCOMMIT;");
check('INSERT + COMMIT keeps the row', one('SELECT COUNT(*) FROM elevi WHERE id_elev = 900'), 1);
check("'COMMIT' literal untouched", one("SELECT 'COMMIT;' FROM DUAL"), 'COMMIT;');
check('prepareOracleSql sample', prepareOracleSql("SELECT SYSDATE, 'SYSDATE' FROM DUAL; COMMIT;"), "SELECT SYSDATE(), 'SYSDATE' FROM DUAL; ");
check('profesori salariu never NULL', one('SELECT COUNT(*) FROM profesori WHERE salariu IS NULL'), 0);
resetDatabase();
console.log('--- DML, countChangedRows, resetDatabase');
runQuery("UPDATE elevi SET oras = 'Cluj' WHERE id_clasa = 1");
check('countChangedRows after UPDATE of 9A', countChangedRows(), 5);
runQuery('DELETE FROM note');
check('countChangedRows after DELETE FROM note', countChangedRows(), 153);
check('note empty after DELETE', one('SELECT COUNT(*) FROM note'), 0);
runQuery('SELECT * FROM elevi');
console.log('INFO countChangedRows after a SELECT (stale by design) =>', countChangedRows());
resetDatabase();
check('note restored after reset', one('SELECT COUNT(*) FROM note'), 153);
check('oras restored after reset', one('SELECT oras FROM elevi WHERE id_elev = 1'), 'Brașov');
check('functions still work after reset', one("SELECT UPPER('ș') FROM DUAL"), 'Ș');
check('FK still enforced after reset', (() => { try { runQuery('DELETE FROM elevi WHERE id_elev = 1'); return 'no error'; } catch (e) { return e.message; } })(), 'FOREIGN KEY constraint failed');

console.log('--- getSchema');
const schema = getSchema();
for (const t of schema) console.log('  ' + t.table + ': ' + t.columns.map((c) => c.name + ' ' + c.type).join(', '));
check('schema tables', schema.map((t) => t.table).join(','), 'profesori,clase,materii,elevi,note');
runQuery('CREATE TABLE test_user (id NUMBER(3))');
check('user table appears in schema', getSchema().map((t) => t.table).join(','), 'profesori,clase,materii,elevi,note,test_user');
resetDatabase();

console.log('--- createScratchDatabase');
const scratch = createScratchDatabase();
runQuery('DELETE FROM note', scratch);
check('scratch note emptied', one('SELECT COUNT(*) FROM note', scratch), 0);
check('main note untouched', one('SELECT COUNT(*) FROM note'), 153);
check('scratch has functions + SYSDATE rewrite', one('SELECT TO_CHAR(SYSDATE, \'YYYY\') FROM DUAL', scratch), String(d.getFullYear()));
checkError('scratch enforces CHECK', 'INSERT INTO note VALUES (999, 1, 1, 11, NULL)', 'ck_note_nota', scratch);
const scratch2 = createScratchDatabase();
check('second scratch independent', one('SELECT COUNT(*) FROM note', scratch2), 153);
scratch.close(); scratch2.close();
check('main still works after closing scratch', one('SELECT COUNT(*) FROM elevi'), 40);

console.log('--- engine differences (information)');
for (const sql of ['SELECT 7/2 FROM DUAL', "SELECT 'a' || NULL FROM DUAL", "SELECT CASE WHEN '' IS NULL THEN 'null' ELSE 'not null' END FROM DUAL",
  'SELECT salariu / 12 FROM profesori WHERE id_profesor = 1', 'SELECT typeof(salariu) FROM profesori WHERE id_profesor = 1',
  'SELECT nume FROM profesori ORDER BY salariu LIMIT 1', 'SELECT nume, salariu FROM profesori ORDER BY salariu NULLS LAST', 'SELECT nume, id_clasa FROM elevi GROUP BY id_clasa',
  "SELECT data_nasterii + 1 FROM elevi WHERE id_elev = 1", "SELECT SYSDATE - data_nasterii FROM elevi WHERE id_elev = 1", 'SELECT "abc" FROM DUAL',
  "SELECT CONCAT('a', NULL) FROM DUAL", "SELECT ROUND(2.5), ROUND(-2.5) FROM DUAL", 'SELECT AVG(nota) FROM note', 'SELECT SUM(nota) / COUNT(*) FROM note']) {
  try { const r = runQuery(sql); console.log('  ' + sql + '  =>  ' + JSON.stringify(r.length ? r[0].values.slice(0, 2) : r)); }
  catch (e) { console.log('  ' + sql + '  =>  ERROR ' + e.message); }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1; // a failed test makes the command fail too
