/*
  render.js - shows query results (as tables) and messages (errors, success, info) on the page.
  Used by: index.html (through main.js and lessons-ui.js).
  Security: everything is built with document.createElement and textContent, never by inserting HTML text,
  because the results come from SQL typed by the user (it may contain HTML).
*/

/**
 * Shows the results of a query as one table per result set.
 * Parameters:
 *   container - the page element where the tables are shown (its old content is removed)
 *   results   - the list returned by runQuery(): [{ columns, values }]
 * Returns: nothing.
 */
export function renderResults(container, results) {
  container.replaceChildren(); // remove the old results
  for (const result of results) { // one table for each SELECT in the SQL text
    container.appendChild(createResultTable(result)); // add the table to the page
  }
}

/**
 * Builds one result table together with its row count ("N rânduri").
 * Parameter: result - one result set: { columns: [names], values: [[row values]] }.
 * Returns: a <div> that contains the table and the row count.
 */
function createResultTable(result) {
  const block = document.createElement('div'); // box that holds the table and the row count
  block.className = 'result-block'; // style: space between result tables

  const wrapper = document.createElement('div'); // box that scrolls when the table is too wide
  wrapper.className = 'table-wrapper'; // style: scroll inside this box, not the whole page

  const table = document.createElement('table'); // the results table
  table.className = 'result-table'; // style of the results table
  table.appendChild(createHeaderRow(result.columns)); // first row: the column names
  table.appendChild(createBodyRows(result.values)); // the other rows: the data

  wrapper.appendChild(table); // put the table inside the scrolling box
  block.appendChild(wrapper); // put the scrolling box inside the result block

  const count = document.createElement('p'); // text under the table with the number of rows
  count.className = 'row-count'; // style of the row count text
  count.textContent = formatRowCount(result.values.length); // e.g. "5 rânduri"
  block.appendChild(count); // add the row count under the table

  return block; // the finished result block
}

/**
 * Builds the table header with the column names.
 * Parameter: columns - list of column names.
 * Returns: a <thead> element.
 */
function createHeaderRow(columns) {
  const thead = document.createElement('thead'); // table header section
  const row = document.createElement('tr'); // one row for the column names
  for (const columnName of columns) { // one header cell for each column
    const cell = document.createElement('th'); // header cell
    cell.scope = 'col'; // tells screen readers this is a column heading
    cell.textContent = columnName; // column name as plain text
    row.appendChild(cell); // add the cell to the header row
  }
  thead.appendChild(row); // add the row to the header section
  return thead; // the finished header
}

/**
 * Builds the table body with the data rows.
 * Parameter: rows - list of rows; each row is a list of values.
 * Returns: a <tbody> element.
 */
function createBodyRows(rows) {
  const tbody = document.createElement('tbody'); // table body section
  for (const values of rows) { // one table row for each result row
    const row = document.createElement('tr'); // table row
    for (const value of values) { // one cell for each value in the row
      row.appendChild(createCell(value)); // add the cell to the row
    }
    tbody.appendChild(row); // add the row to the body
  }
  return tbody; // the finished body
}

/**
 * Builds one data cell. NULL values are shown as a gray "NULL" text.
 * Parameter: value - the value from the database (text, number or null).
 * Returns: a <td> element.
 */
function createCell(value) {
  const cell = document.createElement('td'); // data cell
  if (value === null) { // the database value is NULL (missing)
    cell.textContent = 'NULL'; // show the word NULL
    cell.className = 'null-value'; // style: gray, so it is not confused with the text 'NULL'
  } else {
    cell.textContent = String(value); // show the value as plain text (never as HTML)
  }
  return cell; // the finished cell
}

/**
 * Builds the row count text in Romanian, e.g. "1 rând", "5 rânduri" or "40 de rânduri".
 * Parameter: count - number of rows.
 * Returns: the text to show.
 */
function formatRowCount(count) {
  return formatCount(count, 'rând', 'rânduri'); // e.g. "5 rânduri"
}

/**
 * Writes a number followed by a word, with correct Romanian grammar:
 * "1 rând", "5 rânduri", "40 de rânduri". In Romanian, "de" is added from 20 up,
 * except when the last two digits are 01-19 (e.g. "101 rânduri", but "120 de rânduri").
 * Parameters:
 *   count    - the number
 *   singular - the word used for 1, e.g. 'rând'
 *   plural   - the word used for any other number, e.g. 'rânduri'
 * Returns: the text, e.g. "40 de rânduri".
 * Used by: this file, main.js and checker.js.
 */
export function formatCount(count, singular, plural) {
  if (count === 1) { // singular form
    return '1 ' + singular; // e.g. "1 rând"
  }
  const lastTwoDigits = count % 100; // e.g. 120 -> 20, 101 -> 1
  if (count >= 20 && (lastTwoDigits === 0 || lastTwoDigits >= 20)) { // numbers that need "de"
    return count + ' de ' + plural; // e.g. "40 de rânduri"
  }
  return count + ' ' + plural; // e.g. "5 rânduri"
}

/**
 * Shows a single message (for example an error) instead of results.
 * Parameters:
 *   container - the page element where the message is shown (its old content is removed)
 *   text      - the message text
 *   kind      - 'error', 'success' or 'info' (decides the color of the message)
 * Returns: nothing.
 */
export function renderMessage(container, text, kind) {
  container.replaceChildren(); // remove the old results or message
  const message = document.createElement('p'); // paragraph for the message
  message.className = 'message message-' + kind; // style: e.g. "message message-error" (red)
  message.textContent = text; // message text, as plain text
  container.appendChild(message); // show the message on the page
}
