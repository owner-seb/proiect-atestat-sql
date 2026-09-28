/*
  db.js - creates the SQL database inside the browser and runs queries on it.
  Used by: index.html (through main.js).
  The engine is sql.js (SQLite compiled to WebAssembly), loaded from vendor/sql-wasm.js.
*/

// Folder that contains sql-wasm.wasm (the compiled SQLite engine)
const WASM_FOLDER = 'vendor/';

// The database object; stays null until createDatabase() has finished
let db = null;

/**
 * Loads the sql.js engine and creates an empty database in memory.
 * Also adds the DUAL table, like in Oracle.
 * Returns: nothing (the database is kept in the "db" variable above).
 */
export async function createDatabase() {
  // initSqlJs comes from vendor/sql-wasm.js, loaded by a <script> tag in index.html
  const SQL = await window.initSqlJs({
    locateFile: (fileName) => WASM_FOLDER + fileName, // tell sql.js where to find the .wasm file
  });
  db = new SQL.Database(); // new empty database, stored only in the browser's memory
  addOracleDual(); // make "SELECT ... FROM DUAL" work
}

/**
 * Creates the DUAL table: Oracle's one-row table used for SELECTs without a real table,
 * e.g. SELECT 1 + 1 FROM DUAL.
 */
function addOracleDual() {
  db.run("CREATE TABLE dual (dummy VARCHAR2(1))"); // one column, like in Oracle
  db.run("INSERT INTO dual VALUES ('X')"); // one row with the value 'X', like in Oracle
}

/**
 * Runs one or more SQL statements.
 * Parameter: sql - the SQL text to run.
 * Returns: a list of results; each result has "columns" (column names) and "values" (rows).
 * Throws an error if the SQL is wrong (the caller shows the error message).
 */
export function runQuery(sql) {
  return db.exec(sql); // sql.js runs the SQL and returns the results
}
