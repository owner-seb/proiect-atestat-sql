/*
  checker.js - checks the answer of an exercise: runs the user's SQL and the correct solution
  on two separate copies of the database and compares the results.
  Used by: index.html (through lessons-ui.js), and by the tests in tests/test-lessons.mjs.
  The user's SQL never touches the main database (the one used by the SQL editor).
  Rules:
  - only the VALUES are compared, not the column names (aliases may differ);
  - the order of the rows matters only when the exercise asks for it (orderMatters: true);
  - numbers are rounded to 6 decimals before comparing, so 7 and 7.0 are equal;
  - for INSERT/UPDATE/DELETE/CREATE exercises (they have a checkQuery), the table contents
    after the user's SQL are compared with the table contents after the solution;
    the checkQuery is hidden, so its table is never shown to the user, only a message in words.
*/

import { createScratchDatabase, prepareOracleSql } from './db.js'; // separate databases + Oracle SQL rewrite
import { formatCount, translateError } from './render.js'; // Romanian text for numbers and for SQL errors

// Numbers are rounded to this many decimals before comparing (hides tiny rounding errors)
const DECIMALS = 6;

// Message for a DML/DDL exercise whose table is different from the expected one
const TABLE_DIFFERENT = 'După comanda ta, tabelul nu arată cum trebuie: unele valori sau constrângeri sunt diferite. '
  + 'Verifică rândurile și, la CREATE TABLE, constrângerile (PRIMARY KEY, NOT NULL, UNIQUE, CHECK, FOREIGN KEY).';

/**
 * Checks the user's answer to an exercise.
 * Parameters:
 *   exercise - one exercise from lessons.js: { id, statement, solution, orderMatters, checkQuery?, hint }
 *   userSql  - the SQL written by the user
 * Returns: { correct, message, result }
 *   correct - true if the answer is right
 *   message - the feedback text in Romanian
 *   result  - the rows the user's SQL produced ({ columns, values }), to show under the message, or null
 *             (always null for DML/DDL exercises: the table read by the hidden checkQuery is not shown)
 */
export function checkExercise(exercise, userSql) {
  if (userSql.trim() === '') { // the box is empty
    return { correct: false, message: 'Scrie mai întâi o interogare SQL în casetă.', result: null };
  }
  let userResult; // what the user's SQL produced
  try {
    userResult = runOnScratchDatabase(userSql, exercise.checkQuery); // run the user's SQL on its own copy
  } catch (error) {
    return { correct: false, message: 'Eroare SQL: ' + translateExerciseError(error.message), result: null }; // wrong SQL: show the error in Romanian
  }
  const expectedResult = runOnScratchDatabase(exercise.solution, exercise.checkQuery); // run the solution on another copy
  const difference = findDifference(userResult, expectedResult, exercise); // '' when they are the same
  const shownResult = exercise.checkQuery === undefined ? userResult : null; // hide the checkQuery's table
  if (difference === '') { // same result as the solution
    return { correct: true, message: 'Corect! Exercițiul este rezolvat.', result: shownResult };
  }
  return { correct: false, message: difference, result: shownResult }; // explain what is different
}

/**
 * Translates an SQL error of an exercise into Romanian.
 * Same as translateError (render.js), except for a missing table: the advice to press the reset button
 * does not help here, because every check runs on a fresh copy of the database; usually the name is wrong.
 * Parameter: message - the error message (error.message).
 * Returns: the message in Romanian.
 */
function translateExerciseError(message) {
  const match = /^no such table: (.+)$/.exec(message); // match[1] is the table name
  if (match !== null) { // a table that does not exist
    return 'Tabelul ' + match[1] + ' nu există. Verifică numele tabelului.';
  }
  return translateError(message); // every other error: the usual translation
}

/**
 * Runs SQL on a new, separate copy of the school database, then closes that copy.
 * Parameters:
 *   sql        - the SQL to run (the user's answer or the solution)
 *   checkQuery - optional hidden SQL that reads the table after the SQL (for INSERT/UPDATE/DELETE/CREATE);
 *                it may have several statements; the last SELECT that returns rows is used
 * Returns: the last result set ({ columns, values }), or null if there are no rows.
 * Throws an error if the SQL is wrong.
 */
function runOnScratchDatabase(sql, checkQuery) {
  const database = createScratchDatabase(); // a fresh copy, only for this check
  try {
    const results = database.exec(prepareOracleSql(sql)); // run the SQL (Oracle words like SYSDATE are adapted first)
    if (checkQuery === undefined) { // a normal SELECT exercise
      return lastResultSet(results); // compare what the SQL itself returned
    }
    return lastResultSet(database.exec(checkQuery)); // DML/DDL exercise: read the table after the change (checkQuery is run as written)
  } finally {
    database.close(); // always free the copy, even after an error
  }
}

/**
 * Picks the last result set from the list returned by sql.js.
 * Note: sql.js leaves out SELECTs that return no rows, so an empty result gives an empty list.
 * Parameter: results - the list returned by database.exec(): [{ columns, values }]
 * Returns: the last { columns, values }, or null when the list is empty.
 */
function lastResultSet(results) {
  if (results.length === 0) { // no rows at all
    return null;
  }
  return results[results.length - 1]; // the result of the last SELECT
}

/**
 * Compares the user's result with the expected result and explains the first difference found.
 * Parameters:
 *   userResult     - { columns, values } or null (no rows)
 *   expectedResult - { columns, values } or null (no rows)
 *   exercise       - the exercise (for orderMatters and checkQuery)
 * Returns: '' when the results are the same, otherwise a message in Romanian.
 */
function findDifference(userResult, expectedResult, exercise) {
  if (exercise.checkQuery !== undefined) { // DML/DDL exercise: the hidden columns must not be counted or named
    return findTableDifference(userResult, expectedResult, exercise.checkQuery);
  }
  const subject = 'Rezultatul tău are'; // start of the messages below
  const userRows = userResult === null ? [] : userResult.values; // the user's rows
  const expectedRows = expectedResult === null ? [] : expectedResult.values; // the correct rows

  if (userResult !== null && expectedResult !== null) { // both have rows, so both have columns
    const userColumns = userResult.columns.length; // number of columns in the user's result
    const expectedColumns = expectedResult.columns.length; // number of columns in the correct result
    if (userColumns !== expectedColumns) { // e.g. a column is missing
      return subject + ' ' + formatCount(userColumns, 'coloană', 'coloane')
        + ', dar ar trebui să aibă ' + formatCount(expectedColumns, 'coloană', 'coloane') + '.';
    }
  }

  if (userRows.length !== expectedRows.length) { // e.g. a WHERE condition is missing
    return subject + ' ' + formatCount(userRows.length, 'rând', 'rânduri')
      + ', dar ar trebui să aibă ' + formatCount(expectedRows.length, 'rând', 'rânduri') + '.';
  }

  const userKeys = userRows.map(rowKey); // each row as a text, e.g. '["Popescu","Ana"]'
  const expectedKeys = expectedRows.map(rowKey); // same for the correct rows
  if (!sameList(sortedCopy(userKeys), sortedCopy(expectedKeys))) { // different rows (order ignored)
    const userValues = sortedCopy(userRows.map(rowValuesKey)); // rows with their values sorted
    const expectedValues = sortedCopy(expectedRows.map(rowValuesKey)); // same for the correct rows
    if (sameList(userValues, expectedValues)) { // same values, only the columns are in another order
      return 'Valorile sunt corecte, dar coloanele nu sunt în ordinea cerută.';
    }
    return subject + ' numărul corect de rânduri și coloane, dar unele valori sunt diferite.';
  }

  if (exercise.orderMatters && !sameList(userKeys, expectedKeys)) { // right rows, wrong order
    return 'Rândurile sunt corecte, dar nu sunt în ordinea cerută. Verifică ORDER BY.';
  }
  return ''; // no difference: the answer is correct
}

/**
 * Compares the table read by the hidden checkQuery after the user's SQL with the one after the solution
 * (for DML/DDL exercises). A different number of rows is named only when the checkQuery just reads the table;
 * any other difference gets a message in words.
 * Parameters:
 *   userResult, expectedResult - { columns, values } or null (no rows)
 *   checkQuery                 - the hidden SQL of the exercise
 * Returns: '' when the tables are the same, otherwise a message in Romanian.
 */
function findTableDifference(userResult, expectedResult, checkQuery) {
  const userRows = userResult === null ? [] : userResult.values; // rows after the user's SQL
  const expectedRows = expectedResult === null ? [] : expectedResult.values; // rows after the solution
  // the checkQuery of a CREATE TABLE exercise first INSERTs its own test rows (to try the constraints),
  // so there the number of rows is not the user's number and is not shown
  const addsTestRows = /\bINSERT\b/i.test(checkQuery);
  if (!addsTestRows && userRows.length !== expectedRows.length) { // e.g. a row was not inserted or too many were deleted
    return 'După comanda ta, tabelul are ' + formatCount(userRows.length, 'rând', 'rânduri')
      + ', dar ar trebui să aibă ' + formatCount(expectedRows.length, 'rând', 'rânduri') + '.';
  }
  const sameColumns = userResult === null || userResult.columns.length === expectedResult.columns.length; // null = both empty
  if (sameColumns && sameList(sortedCopy(userRows.map(rowKey)), sortedCopy(expectedRows.map(rowKey)))) { // same rows
    return ''; // no difference (the order of the rows does not matter for a table)
  }
  return TABLE_DIFFERENT; // different values or constraints, explained in words
}

/**
 * Turns one value into a text that can be compared:
 * numbers are rounded to 6 decimals (7.0 -> '7', 8.3333333333 -> '8.333333'),
 * NULL stays null (so it is different from the text 'NULL'), anything else becomes text.
 * Parameter: value - a value from the database.
 * Returns: the value as text, or null.
 */
function normalizeValue(value) {
  if (typeof value === 'number') { // a number
    return String(Number(value.toFixed(DECIMALS))); // round, then remove the extra zeros
  }
  if (value === null) { // NULL
    return null;
  }
  return String(value); // text
}

/**
 * Turns a whole row into one text, e.g. ['Popescu', 7.0] -> '["Popescu","7"]'.
 * Two rows are equal when their texts are equal.
 * Parameter: row - a list of values.
 * Returns: the row as text.
 */
function rowKey(row) {
  return JSON.stringify(row.map(normalizeValue)); // normalize each value, then write the list as text
}

/**
 * Like rowKey, but the values are sorted first, so the order of the columns does not matter.
 * Used only to detect "right values, columns in the wrong order".
 * Parameter: row - a list of values.
 * Returns: the row as text.
 */
function rowValuesKey(row) {
  return JSON.stringify(row.map(normalizeValue).sort()); // normalize, sort, write as text
}

/**
 * Returns: a sorted copy of a list of texts (the original list is not changed).
 */
function sortedCopy(list) {
  return [...list].sort(); // copy the list, then sort the copy
}

/**
 * Returns: true if the two lists have the same items in the same order.
 */
function sameList(first, second) {
  if (first.length !== second.length) { // different lengths: not the same
    return false;
  }
  return first.every((item, index) => item === second[index]); // compare item by item
}
