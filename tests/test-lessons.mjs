// test-lessons.mjs - tests for the lessons (site/js/lessons.js) and the exercise checker (site/js/checker.js).
// Run from the project root: node tests/test-lessons.mjs
// Checks that:
//   1. every lesson example runs without an error;
//   2. every exercise's solution is accepted by the real checkExercise();
//   3. for every exercise, at least one wrong answer is rejected, for the expected reason;
//   4. some different but correct answers are accepted (aliases, OR instead of IN, comments...);
//   5. checking exercises never changes the main database (the one used by the SQL editor).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

// ----- Load the real site files in node (the browser-only parts are replaced by stubs) -----
const SITE = fileURLToPath(new URL('../site', import.meta.url)); // the site/ folder, found from this file's location
const require = createRequire(import.meta.url);
const initSqlJs = require(SITE + '/vendor/sql-wasm.js'); // the same sql.js file the site uses
globalThis.window = { initSqlJs: () => initSqlJs() }; // db.js calls window.initSqlJs
globalThis.fetch = async (url) => ({ ok: true, text: async () => fs.readFileSync(SITE + '/' + url, 'utf8') }); // db.js fetches data/seed.sql

// import by URL, so checker.js and this test share the same db.js module (and the same loaded sql.js)
const { createDatabase, runQuery, getSchema, createScratchDatabase, prepareOracleSql } =
  await import(new URL('../site/js/db.js', import.meta.url).href);
const { checkExercise } = await import(new URL('../site/js/checker.js', import.meta.url).href);
const { LESSONS } = await import(new URL('../site/js/lessons.js', import.meta.url).href);

// ----- Wrong answers: for each exercise id, a list of [wrong SQL, expected kind of message] -----
// Kinds: 'rows' (wrong number of rows), 'columns' (wrong number of columns), 'values' (different values),
// 'order' (right rows, wrong order), 'column-order' (columns swapped), 'error' (SQL error).
const WRONG_ANSWERS = {
  'introducere-1': [['SELECT nume, prenume FROM elevi;', 'columns']],
  'introducere-2': [['SELECT denumire FROM materii;', 'columns']],
  'introducere-3': [['SELECT nume, prenume, salariu FROM profesori;', 'values']],
  'introducere-4': [['SELECT 25 * (4 + 7) FROM DUAL;', 'values']],
  'filtrare-1': [['SELECT nume, prenume FROM elevi WHERE email = NULL;', 'rows']],
  'filtrare-2': [['SELECT id_elev, id_materie, nota FROM note WHERE nota > 5 AND nota < 7;', 'rows']],
  'filtrare-3': [['SELECT nume, profil FROM clase WHERE an_studiu = 12;', 'rows']],
  'filtrare-4': [["SELECT nume, prenume FROM elevi WHERE nume LIKE 'p%';", 'rows']],
  'sortare-1': [
    ['SELECT nume, prenume, salariu FROM profesori ORDER BY salariu, id_profesor;', 'order'],
    ['SELECT nume, prenume, salariu FROM profesori;', 'order'],
  ],
  'sortare-2': [['SELECT oras FROM elevi;', 'rows']],
  'sortare-3': [
    ['SELECT nume || prenume AS nume_complet FROM elevi ORDER BY nume_complet, id_elev;', 'values'],
    ["SELECT nume || ' ' || prenume AS nume_complet FROM elevi ORDER BY id_elev;", 'order'],
  ],
  'functii-single-row-1': [['SELECT nume, LENGTH(nume) FROM elevi;', 'values']],
  'functii-single-row-2': [['SELECT SUBSTR(nume, 1, 1) || SUBSTR(prenume, 1, 1) FROM elevi;', 'values']],
  'functii-single-row-3': [['SELECT nume, prenume, email FROM elevi;', 'values']],
  'functii-single-row-4': [['SELECT nume, prenume, data_nasterii FROM elevi;', 'values']],
  'functii-grup-1': [['SELECT COUNT(*) FROM elevi;', 'values']],
  'functii-grup-2': [['SELECT id_clasa, COUNT(email) FROM elevi GROUP BY id_clasa;', 'values']],
  'functii-grup-3': [['SELECT id_materie, AVG(nota) FROM note GROUP BY id_materie;', 'values']],
  'functii-grup-4': [['SELECT id_elev, ROUND(AVG(nota), 2) FROM note WHERE nota >= 8 GROUP BY id_elev;', 'rows']],
  'join-1': [['SELECT m.denumire, p.nume, p.prenume FROM materii m LEFT JOIN profesori p ON m.id_profesor = p.id_profesor;', 'rows']],
  'join-2': [['SELECT e.nume, e.prenume, m.denumire, n.nota FROM note n JOIN elevi e ON n.id_elev = e.id_elev JOIN materii m ON n.id_elev = m.id_materie;', 'rows']],
  'join-3': [['SELECT e.nume, e.prenume FROM elevi e JOIN note n ON e.id_elev = n.id_elev WHERE n.id_nota IS NULL;', 'rows']],
  'join-4': [
    ['SELECT p.nume, p.prenume, s.nume, s.prenume FROM profesori p LEFT JOIN profesori s ON p.id_sef = s.id_profesor;', 'rows'],
    ['SELECT s.nume, s.prenume, p.nume, p.prenume FROM profesori p JOIN profesori s ON p.id_sef = s.id_profesor;', 'column-order'],
  ],
  'subinterogari-1': [['SELECT nume, prenume, salariu FROM profesori WHERE salariu > (SELECT AVG(salariu) FROM profesori);', 'rows']],
  'subinterogari-2': [["SELECT nume, prenume FROM elevi WHERE id_clasa = (SELECT id_clasa FROM clase WHERE nume = '11B');", 'values']],
  'subinterogari-3': [['SELECT nume, prenume FROM elevi WHERE id_elev IN (SELECT id_elev FROM note WHERE nota = 9);', 'rows']],
  'subinterogari-4': [['SELECT nume, prenume FROM profesori WHERE id_profesor NOT IN (SELECT id_diriginte FROM clase);', 'rows']],
  'dml-1': [
    ["INSERT INTO elevi (id_elev, nume, prenume, data_nasterii, oras, id_clasa) VALUES (900, 'Ionescu', 'Maria', TO_DATE('2009-03-15', 'YYYY-MM-DD'), 'Brașov', 2);", 'values'],
    ['SELECT * FROM elevi;', 'rows'],
  ],
  'dml-2': [
    ['UPDATE profesori SET salariu = salariu + 500;', 'values'],
    ['UPDATE profesori SET salariu = 500 WHERE id_sef IS NULL;', 'values'],
  ],
  'dml-3': [
    ['DELETE FROM note WHERE nota <= 5;', 'rows'],
    ['DELETE FROM note;', 'rows'],
  ],
  // DDL: the checkQuery tries bad rows with INSERT OR IGNORE; a missing or wrong constraint lets them in, so the table
  // differs. The checker then does not name a row count (the test rows are not the user's), only 'unele valori' -> 'values'
  'ddl-1': [
    ["CREATE TABLE cercuri (id_cerc NUMBER(3) PRIMARY KEY, denumire VARCHAR2(40) NOT NULL, zi_saptamana VARCHAR2(10));\nINSERT INTO cercuri VALUES (1, 'Șah', 'Luni');", 'values'],
    ["CREATE TABLE cerc (id_cerc NUMBER(3) PRIMARY KEY, denumire VARCHAR2(40), zi_saptamana VARCHAR2(10));", 'error'],
    // right data, but no constraints at all -> both bad rows are added
    ["CREATE TABLE cercuri (id_cerc NUMBER(3), denumire VARCHAR2(40), zi_saptamana VARCHAR2(10));\nINSERT INTO cercuri VALUES (1, 'Șah', 'Luni');\nINSERT INTO cercuri VALUES (2, 'Informatică', 'Joi');", 'values'],
    // primary key present, NOT NULL on denumire missing -> the row without denumire is added
    ["CREATE TABLE cercuri (id_cerc NUMBER(3) PRIMARY KEY, denumire VARCHAR2(40), zi_saptamana VARCHAR2(10));\nINSERT INTO cercuri VALUES (1, 'Șah', 'Luni');\nINSERT INTO cercuri VALUES (2, 'Informatică', 'Joi');", 'values'],
    // NOT NULL present, primary key missing -> the repeated id_cerc is added
    ["CREATE TABLE cercuri (id_cerc NUMBER(3), denumire VARCHAR2(40) NOT NULL, zi_saptamana VARCHAR2(10));\nINSERT INTO cercuri VALUES (1, 'Șah', 'Luni');\nINSERT INTO cercuri VALUES (2, 'Informatică', 'Joi');", 'values'],
  ],
  'ddl-2': [
    ["CREATE TABLE olimpiade (id_olimpiada NUMBER(4) PRIMARY KEY, id_elev NUMBER(5) REFERENCES elevi (id_elev), disciplina VARCHAR2(30) NOT NULL, punctaj NUMBER(5,2) CHECK (punctaj BETWEEN 0 AND 100));\nINSERT INTO olimpiade VALUES (1, 1, 'Informatică', 78.5);", 'values'],
    // right data, but no constraints at all
    ["CREATE TABLE olimpiade (id_olimpiada NUMBER(4), id_elev NUMBER(5), disciplina VARCHAR2(30), punctaj NUMBER(5,2));\nINSERT INTO olimpiade VALUES (1, 1, 'Informatică', 87.5);", 'values'],
    // every constraint except the foreign key -> same rows, but the are_fk column is 0
    ["CREATE TABLE olimpiade (id_olimpiada NUMBER(4) PRIMARY KEY, id_elev NUMBER(5), disciplina VARCHAR2(30) NOT NULL, punctaj NUMBER(5,2) CHECK (punctaj BETWEEN 0 AND 100));\nINSERT INTO olimpiade VALUES (1, 1, 'Informatică', 87.5);", 'values'],
    // every constraint except the CHECK
    ["CREATE TABLE olimpiade (id_olimpiada NUMBER(4) PRIMARY KEY, id_elev NUMBER(5) REFERENCES elevi (id_elev), disciplina VARCHAR2(30) NOT NULL, punctaj NUMBER(5,2));\nINSERT INTO olimpiade VALUES (1, 1, 'Informatică', 87.5);", 'values'],
    // every constraint except NOT NULL on disciplina
    ["CREATE TABLE olimpiade (id_olimpiada NUMBER(4) PRIMARY KEY, id_elev NUMBER(5) REFERENCES elevi (id_elev), disciplina VARCHAR2(30), punctaj NUMBER(5,2) CHECK (punctaj BETWEEN 0 AND 100));\nINSERT INTO olimpiade VALUES (1, 1, 'Informatică', 87.5);", 'values'],
    // CHECK written on the wrong column (id_olimpiada instead of punctaj)
    ["CREATE TABLE olimpiade (id_olimpiada NUMBER(4) PRIMARY KEY, id_elev NUMBER(5) REFERENCES elevi (id_elev), disciplina VARCHAR2(30) NOT NULL, punctaj NUMBER(5,2), CHECK (id_olimpiada BETWEEN 0 AND 100));\nINSERT INTO olimpiade VALUES (1, 1, 'Informatică', 87.5);", 'values'],
    // CHECK with a wrong range: 0 is not allowed, 150 is
    ["CREATE TABLE olimpiade (id_olimpiada NUMBER(4) PRIMARY KEY, id_elev NUMBER(5) REFERENCES elevi (id_elev), disciplina VARCHAR2(30) NOT NULL, punctaj NUMBER(5,2) CHECK (punctaj > 0));\nINSERT INTO olimpiade VALUES (1, 1, 'Informatică', 87.5);", 'values'],
    // CHECK with a wrong range: 0 is not allowed
    ["CREATE TABLE olimpiade (id_olimpiada NUMBER(4) PRIMARY KEY, id_elev NUMBER(5) REFERENCES elevi (id_elev), disciplina VARCHAR2(30) NOT NULL, punctaj NUMBER(5,2) CHECK (punctaj BETWEEN 1 AND 100));\nINSERT INTO olimpiade VALUES (1, 1, 'Informatică', 87.5);", 'values'],
    // CHECK with a wrong range: up to 1000 instead of 100
    ["CREATE TABLE olimpiade (id_olimpiada NUMBER(4) PRIMARY KEY, id_elev NUMBER(5) REFERENCES elevi (id_elev), disciplina VARCHAR2(30) NOT NULL, punctaj NUMBER(5,2) CHECK (punctaj BETWEEN 0 AND 1000));\nINSERT INTO olimpiade VALUES (1, 1, 'Informatică', 87.5);", 'values'],
  ],
  'ddl-3': [
    ["CREATE TABLE sali (id_sala NUMBER(3) PRIMARY KEY, cod VARCHAR2(10) NOT NULL UNIQUE, capacitate NUMBER(3) CHECK (capacitate > 0));\nINSERT INTO sali VALUES (1, 'L1', 25);", 'values'],
    ["CREATE TABLE sali (id_sala NUMBER(3) PRIMARY KEY, cod VARCHAR2(10) NOT NULL UNIQUE, capacitate NUMBER(3) CHECK (capacitate > 0));\nINSERT INTO sali VALUES (1, 'L1', 0);", 'error'],
    // right data, but no constraints at all
    ["CREATE TABLE sali (id_sala NUMBER(3), cod VARCHAR2(10), capacitate NUMBER(3));\nINSERT INTO sali VALUES (1, 'L1', 30);", 'values'],
    // every constraint except UNIQUE on cod
    ["CREATE TABLE sali (id_sala NUMBER(3) PRIMARY KEY, cod VARCHAR2(10) NOT NULL, capacitate NUMBER(3) CHECK (capacitate > 0));\nINSERT INTO sali VALUES (1, 'L1', 30);", 'values'],
    // every constraint except NOT NULL on cod
    ["CREATE TABLE sali (id_sala NUMBER(3) PRIMARY KEY, cod VARCHAR2(10) UNIQUE, capacitate NUMBER(3) CHECK (capacitate > 0));\nINSERT INTO sali VALUES (1, 'L1', 30);", 'values'],
    // CHECK written on the wrong column (id_sala instead of capacitate)
    ["CREATE TABLE sali (id_sala NUMBER(3) PRIMARY KEY CHECK (id_sala > 0), cod VARCHAR2(10) NOT NULL UNIQUE, capacitate NUMBER(3));\nINSERT INTO sali VALUES (1, 'L1', 30);", 'values'],
    // CHECK with a wrong limit: 1 is not allowed
    ["CREATE TABLE sali (id_sala NUMBER(3) PRIMARY KEY, cod VARCHAR2(10) NOT NULL UNIQUE, capacitate NUMBER(3) CHECK (capacitate > 1));\nINSERT INTO sali VALUES (1, 'L1', 30);", 'values'],
  ],
};

// ----- Different but correct answers: [exercise id, SQL] -----
const OTHER_CORRECT_ANSWERS = [
  ['introducere-1', 'SELECT nume AS n, prenume "Prenume elev", oras FROM elevi;'], // aliases do not matter
  ['introducere-1', '-- comentariu la început\nSELECT nume, prenume, oras FROM elevi -- comentariu la final'], // comments
  ['introducere-4', 'SELECT 107.0 FROM DUAL;'], // 107.0 equals 107
  ['filtrare-3', 'SELECT nume, profil FROM clase WHERE an_studiu = 11 OR an_studiu = 12;'], // OR instead of IN
  ['filtrare-2', 'SELECT id_elev, id_materie, nota FROM note WHERE nota >= 5 AND nota <= 7 ORDER BY nota;'], // extra ORDER BY is fine
  ['sortare-2', 'SELECT oras FROM elevi GROUP BY oras;'], // GROUP BY instead of DISTINCT
  ['functii-grup-4', 'SELECT id_elev, ROUND(AVG(nota), 2) FROM note GROUP BY id_elev HAVING ROUND(AVG(nota), 2) >= 8;'],
  ['join-3', 'SELECT nume, prenume FROM elevi WHERE id_elev NOT IN (SELECT id_elev FROM note);'], // subquery instead of LEFT JOIN
  ['subinterogari-2', "SELECT e.nume, e.prenume FROM elevi e JOIN clase c ON e.id_clasa = c.id_clasa WHERE c.nume = '11A';"],
  ['dml-1', "INSERT INTO elevi VALUES (900, 'Ionescu', 'Maria', TO_DATE('15.03.2009', 'DD.MM.YYYY'), 'Brașov', NULL, 1);\nCOMMIT; -- gata"],
  ['dml-3', 'DELETE FROM note WHERE nota IN (1, 2, 3, 4);'],
  // the DDL checkQuery tests the constraints themselves (by trying bad rows), not their names,
  // so a table with unnamed inline constraints is accepted
  ['ddl-1', "CREATE TABLE cercuri (id_cerc NUMBER(3) PRIMARY KEY, denumire VARCHAR2(40) NOT NULL, zi_saptamana VARCHAR2(10));\nINSERT INTO cercuri VALUES (2, 'Informatică', 'Joi');\nINSERT INTO cercuri VALUES (1, 'Șah', 'Luni');"],
  // uppercase names and a table-level primary key are accepted too
  ['ddl-1', "CREATE TABLE CERCURI (ID_CERC NUMBER(3), DENUMIRE VARCHAR2(40) NOT NULL, ZI_SAPTAMANA VARCHAR2(10), CONSTRAINT PK_C PRIMARY KEY (ID_CERC));\nINSERT INTO CERCURI VALUES (1, 'Șah', 'Luni');\nINSERT INTO CERCURI VALUES (2, 'Informatică', 'Joi');"],
  // uppercase names and table-level constraints
  ['ddl-2', "CREATE TABLE OLIMPIADE (ID_OLIMPIADA NUMBER(4), ID_ELEV NUMBER(5), DISCIPLINA VARCHAR2(30) NOT NULL, PUNCTAJ NUMBER(5,2),\n  CONSTRAINT o_pk PRIMARY KEY (ID_OLIMPIADA), CONSTRAINT o_fk FOREIGN KEY (ID_ELEV) REFERENCES ELEVI (ID_ELEV), CONSTRAINT o_ck CHECK (PUNCTAJ BETWEEN 0 AND 100));\nINSERT INTO OLIMPIADE VALUES (1, 1, 'Informatică', 87.5);"],
  // inline unnamed constraints, and the range written with >= and <= instead of BETWEEN
  ['ddl-2', "CREATE TABLE olimpiade (id_olimpiada NUMBER(4) PRIMARY KEY, id_elev NUMBER(5) REFERENCES elevi (id_elev), disciplina VARCHAR2(30) NOT NULL, punctaj NUMBER(5,2) CHECK (punctaj >= 0 AND punctaj <= 100));\nINSERT INTO olimpiade VALUES (1, 1, 'Informatică', 87.5);"],
  ['ddl-3', "CREATE TABLE sali (id_sala NUMBER(3) PRIMARY KEY, cod VARCHAR2(10) NOT NULL UNIQUE, capacitate NUMBER(3) CHECK (capacitate > 0));\nINSERT INTO sali VALUES (1, 'L1', 30);"],
  // uppercase names and named table-level constraints
  ['ddl-3', "CREATE TABLE SALI (ID_SALA NUMBER(3), COD VARCHAR2(10) CONSTRAINT NN_SALI_COD NOT NULL, CAPACITATE NUMBER(3),\n  CONSTRAINT PK_SALI PRIMARY KEY (ID_SALA), CONSTRAINT UQ_SALI_COD UNIQUE (COD), CONSTRAINT CK_SALI_CAPACITATE CHECK (CAPACITATE > 0));\nINSERT INTO SALI VALUES (1, 'L1', 30);"],
];

// ----- Small helpers -----
let passed = 0; // number of passed checks
let failed = 0; // number of failed checks

// records one check and prints it
function report(ok, label, detail) {
  if (ok) { passed++; } else { failed++; }
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? '  ->  ' + detail : ''));
}

// finds the kind of a checker message (see the list of kinds above WRONG_ANSWERS)
function kindOf(message) {
  if (message.startsWith('Eroare SQL')) { return 'error'; }
  if (message.startsWith('Rândurile sunt corecte')) { return 'order'; }
  if (message.includes('coloanele nu sunt')) { return 'column-order'; }
  if (message.includes('unele valori')) { return 'values'; }
  if (message.includes('coloan')) { return 'columns'; }
  if (message.includes('rând')) { return 'rows'; }
  return 'other';
}

// finds an exercise by its id
function findExercise(id) {
  for (const lesson of LESSONS) {
    const exercise = lesson.exercises.find((item) => item.id === id);
    if (exercise) { return exercise; }
  }
  throw new Error('No exercise with id ' + id);
}

// row counts of the main database + its list of tables (to prove the checker never changes it)
function mainDatabaseState() {
  const counts = ['profesori', 'clase', 'materii', 'elevi', 'note']
    .map((table) => table + '=' + runQuery('SELECT COUNT(*) FROM ' + table)[0].values[0][0]);
  const tables = getSchema().map((table) => table.table);
  return counts.join(' ') + ' | tables: ' + tables.join(',');
}

// ----- Start -----
await createDatabase(); // the main database (like the page does at startup)
const stateBefore = mainDatabaseState(); // remember it before any exercise is checked

console.log('--- 1. Lesson examples run without errors (each lesson on its own scratch database, in order)');
for (const lesson of LESSONS) {
  const database = createScratchDatabase();
  for (const block of lesson.blocks.filter((item) => item.type === 'example')) {
    try {
      database.exec(prepareOracleSql(block.sql));
      report(true, lesson.id + ' example: ' + block.sql.split('\n')[0]);
    } catch (error) {
      report(false, lesson.id + ' example: ' + block.sql.split('\n')[0], error.message);
    }
  }
  database.close();
}

console.log('--- 2. Every solution is accepted');
for (const lesson of LESSONS) {
  for (const exercise of lesson.exercises) {
    const check = checkExercise(exercise, exercise.solution);
    report(check.correct, exercise.id + ' solution', check.message);
  }
}

console.log('--- 3. Wrong answers are rejected, for the expected reason');
for (const lesson of LESSONS) {
  for (const exercise of lesson.exercises) {
    const wrongAnswers = WRONG_ANSWERS[exercise.id] ?? [];
    report(wrongAnswers.length > 0, exercise.id + ' has at least one wrong answer in this test');
    for (const [sql, expectedKind] of wrongAnswers) {
      const check = checkExercise(exercise, sql);
      const kind = kindOf(check.message);
      report(!check.correct && kind === expectedKind, exercise.id + ' wrong (' + expectedKind + ')', check.message);
    }
  }
}

console.log('--- 4. Other correct answers are accepted');
for (const [id, sql] of OTHER_CORRECT_ANSWERS) {
  const check = checkExercise(findExercise(id), sql);
  report(check.correct, id + ' other answer: ' + sql.split('\n')[0], check.message);
}

console.log('--- 5. Special inputs');
const firstExercise = LESSONS[0].exercises[0];
const empty = checkExercise(firstExercise, '   ');
report(!empty.correct && empty.message.includes('Scrie'), 'empty answer asks for SQL', empty.message);
const syntax = checkExercise(firstExercise, 'SELEC nume FROM elevi');
report(!syntax.correct && syntax.message.startsWith('Eroare SQL:'), 'syntax error is reported', syntax.message);
const swapped = checkExercise(firstExercise, 'SELECT prenume, nume, oras FROM elevi;');
report(!swapped.correct && kindOf(swapped.message) === 'column-order', 'swapped columns are explained', swapped.message);
const nothing = checkExercise(findExercise('filtrare-1'), "SELECT nume, prenume FROM elevi WHERE nume = 'Nimeni';");
report(!nothing.correct && nothing.result === null && nothing.message.includes('0 rânduri'), 'empty result is explained', nothing.message);

console.log('--- 6. The main database was not changed by any check');
const stateAfter = mainDatabaseState();
report(stateAfter === stateBefore, 'main database unchanged', stateAfter);

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1; // a failed test makes the command fail too
