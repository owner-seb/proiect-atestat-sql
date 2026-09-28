/*
  main.js - starts the home page: creates the database, shows whether it is ready,
  and connects the SQL editor, the buttons and the database structure panel.
  Used by: index.html.
  Order in this file: page elements, startup, SQL editor, reset button, database structure panel.
*/

import { createDatabase, runQuery, countChangedRows, resetDatabase, getSchema } from './db.js'; // database functions
import { renderResults, renderMessage } from './render.js'; // functions that show results and messages

// ===== Page elements used by this file =====
const statusText = document.getElementById('db-status'); // the paragraph where the database status is shown
const sqlEditor = document.getElementById('sql-editor'); // the text box where the user writes SQL
const runButton = document.getElementById('run-button'); // the "Rulează" (run) button
const resetButton = document.getElementById('reset-button'); // the "Resetează baza de date" (reset) button
const resultsBox = document.getElementById('results'); // the area where results and errors are shown
const schemaList = document.getElementById('schema-list'); // the area where the tables and columns are listed

// ===== Startup =====

/**
 * Creates the database and tests it with "SELECT 1 FROM DUAL".
 * Shows a green message if it works, or a red error message if it does not.
 * Then fills in the database structure panel and connects the buttons.
 */
async function start() {
  try {
    await createDatabase(); // load the SQL engine and create the database
    const results = runQuery('SELECT 1 FROM DUAL'); // simple test query
    const value = results[0].values[0][0]; // first result, first row, first column
    statusText.textContent = 'Baza de date este pregătită (SELECT 1 FROM DUAL → ' + value + ')'; // success message
    statusText.classList.add('status-success'); // show it in the success color
    showSchema(); // list the tables of the database
  } catch (error) {
    statusText.textContent = 'Eroare la încărcarea bazei de date: ' + error.message; // error message
    statusText.classList.add('status-error'); // show it in the error color
  }
  runButton.addEventListener('click', runEditorQuery); // run button click
  resetButton.addEventListener('click', resetAll); // reset button click
  sqlEditor.addEventListener('keydown', handleEditorKeys); // keyboard shortcut in the editor (Ctrl+Enter)
}

// ===== SQL editor =====

/**
 * Runs the SQL written in the editor and shows the result:
 * tables for SELECTs, "N rânduri afectate" for INSERT/UPDATE/DELETE, or an error message.
 * The page never breaks: every error is caught and shown in Romanian.
 */
function runEditorQuery() {
  const sql = sqlEditor.value; // the SQL text from the editor
  try {
    const results = runQuery(sql); // run the SQL on the database
    if (results.length > 0) { // at least one SELECT returned rows
      renderResults(resultsBox, results); // show the rows as tables
    } else {
      showResultWithoutRows(sql); // no rows: explain what happened
    }
  } catch (error) {
    renderMessage(resultsBox, 'Eroare SQL: ' + error.message, 'error'); // friendly error message (red)
  }
  showSchema(); // refresh the structure panel (the SQL may have created or dropped a table)
}

/**
 * Shows a message when the SQL ran but returned no rows.
 * The message depends on the first word of the SQL (SELECT, INSERT, CREATE...).
 * Parameter: sql - the SQL text that was run.
 */
function showResultWithoutRows(sql) {
  const firstWord = sql.trim().split(/\s+/)[0].toUpperCase(); // first word of the SQL, e.g. "SELECT"
  if (firstWord === '') { // the editor is empty
    renderMessage(resultsBox, 'Scrie o interogare SQL în editor.', 'info'); // ask the user to write SQL
  } else if (firstWord === 'SELECT' || firstWord === 'WITH') { // a query that found nothing
    renderMessage(resultsBox, 'Interogarea nu a returnat niciun rând.', 'info'); // "the query returned no rows"
  } else if (firstWord === 'INSERT' || firstWord === 'UPDATE' || firstWord === 'DELETE') { // a data change
    renderMessage(resultsBox, formatChangedRows(countChangedRows()), 'success'); // e.g. "3 rânduri afectate"
  } else {
    renderMessage(resultsBox, 'Comanda a fost executată cu succes.', 'success'); // CREATE, DROP, ALTER...
  }
}

/**
 * Builds the text for the number of changed rows, e.g. "1 rând afectat" or "3 rânduri afectate".
 * Parameter: count - number of rows changed by INSERT/UPDATE/DELETE.
 * Returns: the text to show.
 */
function formatChangedRows(count) {
  if (count === 1) { // singular form
    return '1 rând afectat'; // "1 row affected"
  }
  return count + ' rânduri afectate'; // plural form: "N rows affected"
}

/**
 * Keyboard shortcut: Ctrl+Enter (or Cmd+Enter on Mac) runs the SQL from the editor.
 * Parameter: event - the key press event.
 */
function handleEditorKeys(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { // Ctrl+Enter or Cmd+Enter was pressed
    event.preventDefault(); // do not add a new line in the editor
    runEditorQuery(); // run the SQL
  }
}

// ===== Reset button =====

/**
 * Rebuilds the database with the original data, then tells the user and refreshes the structure panel.
 */
async function resetAll() {
  try {
    await resetDatabase(); // recreate the database from seed.sql
    renderMessage(resultsBox, 'Baza de date a fost resetată.', 'success'); // confirmation message (green)
  } catch (error) {
    renderMessage(resultsBox, 'Eroare la resetarea bazei de date: ' + error.message, 'error'); // error message (red)
  }
  showSchema(); // refresh the structure panel
}

// ===== Database structure panel =====

/**
 * Lists every table of the database with its columns and their types.
 * Each table is a <details> element that opens on click. Tables that were open stay open.
 */
function showSchema() {
  const openTables = []; // names of the tables the user has opened
  for (const details of schemaList.querySelectorAll('details[open]')) { // every open table
    openTables.push(details.dataset.table); // remember its name
  }
  schemaList.replaceChildren(); // remove the old list
  try {
    for (const table of getSchema()) { // every table in the database
      const details = createSchemaTable(table); // build the box for this table
      details.open = openTables.includes(table.table); // keep it open if it was open before
      schemaList.appendChild(details); // add it to the panel
    }
  } catch (error) {
    renderMessage(schemaList, 'Structura nu poate fi afișată: ' + error.message, 'error'); // error message (red)
  }
}

/**
 * Builds the box for one table: its name, its columns, and a button that writes
 * "SELECT * FROM <table>;" in the editor.
 * Parameter: table - { table: name, columns: [{ name, type }] } (from getSchema()).
 * Returns: a <details> element.
 */
function createSchemaTable(table) {
  const details = document.createElement('details'); // box that opens and closes on click
  details.className = 'schema-table'; // style of one table in the panel
  details.dataset.table = table.table; // remember the table name (used by showSchema)

  const summary = document.createElement('summary'); // the clickable table name
  summary.textContent = table.table; // table name, as plain text
  details.appendChild(summary); // add the name to the box

  const list = document.createElement('ul'); // list of columns
  list.className = 'column-list'; // style of the column list
  for (const column of table.columns) { // every column of the table
    const item = document.createElement('li'); // one row in the list
    const name = document.createElement('span'); // column name
    name.textContent = column.name; // column name, as plain text
    const type = document.createElement('span'); // column type
    type.className = 'column-type'; // style: gray type text
    type.textContent = column.type; // column type, e.g. VARCHAR2(30)
    item.append(name, type); // name on the left, type on the right
    list.appendChild(item); // add the row to the list
  }
  details.appendChild(list); // add the column list to the box

  const button = document.createElement('button'); // button that writes a query in the editor
  button.type = 'button'; // a normal button (not a form submit)
  button.className = 'schema-query-button'; // style of the small button
  button.textContent = 'SELECT * FROM ' + table.table + ';'; // text of the button = the query it writes
  button.addEventListener('click', () => insertQuery(button.textContent)); // on click: write the query in the editor
  details.appendChild(button); // add the button to the box

  return details; // the finished box
}

/**
 * Writes a query in the editor and moves the cursor there, ready to be run.
 * Parameter: sql - the SQL text to write.
 */
function insertQuery(sql) {
  sqlEditor.value = sql; // replace the editor text
  sqlEditor.focus(); // move the cursor to the editor
}

start(); // run when the page loads
