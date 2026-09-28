/*
  main.js - starts the home page: creates the database and shows whether it is ready.
  Used by: index.html.
*/

import { createDatabase, runQuery } from './db.js'; // database functions

// The paragraph where the database status is shown
const statusText = document.getElementById('db-status');

/**
 * Creates the database and tests it with "SELECT 1 FROM DUAL".
 * Shows a green message if it works, or a red error message if it does not.
 */
async function start() {
  try {
    await createDatabase(); // load the SQL engine and create the database
    const results = runQuery('SELECT 1 FROM DUAL'); // simple test query
    const value = results[0].values[0][0]; // first result, first row, first column
    statusText.textContent = 'Baza de date este pregătită (SELECT 1 FROM DUAL → ' + value + ')'; // success message
    statusText.classList.add('status-success'); // show it in the success color
  } catch (error) {
    statusText.textContent = 'Eroare la încărcarea bazei de date: ' + error.message; // error message
    statusText.classList.add('status-error'); // show it in the error color
  }
}

start(); // run when the page loads
