/*
  db.js - creates the SQL database inside the browser and runs queries on it.
  Used by: index.html (through main.js) and the exercise checker.
  The engine is sql.js (SQLite compiled to WebAssembly), loaded from vendor/sql-wasm.js.
  SQLite is not Oracle, so this file adds what is missing: the DUAL table, Oracle functions
  (NVL, TO_CHAR, TO_DATE, SUBSTR, ...), case-sensitive LIKE, foreign key checks and SYSDATE without parentheses.
  It also stops ROLLBACK and LIMIT with a Romanian message (see prepareOracleSql).
*/

// Folder that contains sql-wasm.wasm (the compiled SQLite engine)
const WASM_FOLDER = 'vendor/';

// File with the CREATE TABLE and INSERT statements of the school database
const SEED_FILE = 'data/seed.sql';

// English month names, like Oracle's default settings (used by TO_CHAR with 'MONTH' and 'MON')
const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', // months 1 to 6
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', // months 7 to 12
];

// Oracle fills month names with spaces up to the longest name, 'SEPTEMBER' (9 letters)
const MONTH_NAME_WIDTH = 9;

// The sql.js library; loaded once by createDatabase(), then used to create every database
let sqlLibrary = null;

// The text of seed.sql; downloaded once by createDatabase(), then reused for every new database
let seedText = null;

// The main database (used by the editor); stays null until createDatabase() has finished
let db = null;

// SQLite's count of all changed rows, read just before the last runQuery (used by countChangedRows)
let changesBefore = 0;

// Parts of the SQL text that prepareOracleSql must NOT change: texts in apostrophes ('...'),
// names in double quotes ("..."), line comments (-- ...) and block comments (/* ... */).
// The "?" and "$" let a part that is never closed go on to the end of the SQL text.
// The outer ( ) makes split() keep these parts in its list (see prepareOracleSql).
const SKIPPED_PARTS = /('[^']*'?|"[^"]*"?|--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))/;

// Error shown for ROLLBACK (the SQL is stopped before it runs, so nothing is changed)
const ROLLBACK_ERROR = 'ROLLBACK nu este suportat aici: modificările nu pot fi anulate. '
  + 'Nicio comandă nu a fost executată. Folosește butonul «Resetează baza de date».';

// Error shown for LIMIT (a SQLite word that does not exist in Oracle)
const LIMIT_ERROR = 'LIMIT nu există în Oracle. În Oracle s-ar folosi FETCH FIRST sau ROWNUM, '
  + 'care nu sunt disponibile aici; folosește o subinterogare cu MAX/MIN sau o condiție WHERE.';

/**
 * Loads the sql.js engine and seed.sql, then creates the main database.
 * Returns: nothing (the database is kept in the "db" variable above).
 * Throws an error if sql.js or seed.sql cannot be loaded.
 */
export async function createDatabase() {
  // initSqlJs comes from vendor/sql-wasm.js, loaded by a <script> tag in index.html
  sqlLibrary = await window.initSqlJs({
    locateFile: (fileName) => WASM_FOLDER + fileName, // tell sql.js where to find the .wasm file
  });
  // download seed.sql from the site; 'no-cache' asks the server for the newest version every time,
  // so changes made to seed.sql show up after a simple page refresh (F5)
  const response = await fetch(SEED_FILE, { cache: 'no-cache' });
  if (!response.ok) { // the file was not found or the server failed
    throw new Error('Nu s-a putut încărca fișierul ' + SEED_FILE); // message shown to the user
  }
  seedText = await response.text(); // keep the SQL text for reset and for the exercise checker
  db = buildDatabase(); // create the main database
}

/**
 * Creates a new database in memory with everything the site needs:
 * Oracle settings, the DUAL table, the Oracle functions and the school data from seed.sql.
 * Returns: the new sql.js database.
 */
function buildDatabase() {
  const database = new sqlLibrary.Database(); // new empty database, stored only in the browser's memory
  database.run('PRAGMA foreign_keys = ON'); // check FOREIGN KEY constraints, like Oracle
  database.run('PRAGMA case_sensitive_like = ON'); // LIKE 'a%' does not match 'Ana', like Oracle
  addOracleDual(database); // make "SELECT ... FROM DUAL" work
  addOracleFunctions(database); // NVL, TO_CHAR, TO_DATE, ... (seed.sql already uses TO_DATE)
  database.exec(seedText); // create the tables and insert the school data
  return database; // give the ready database to the caller
}

/**
 * Creates the DUAL table: Oracle's one-row table used for SELECTs without a real table,
 * e.g. SELECT 1 + 1 FROM DUAL.
 * Parameter: database - the database to add the table to.
 */
function addOracleDual(database) {
  database.run('CREATE TABLE dual (dummy VARCHAR2(1))'); // one column, like in Oracle
  database.run("INSERT INTO dual VALUES ('X')"); // one row with the value 'X', like in Oracle
}

/**
 * Runs one or more SQL statements on the main database.
 * Parameter: sql - the SQL text to run.
 * Returns: a list of results; each result has "columns" (column names) and "values" (rows).
 * Throws an error if the SQL is wrong (the caller shows the error message).
 */
export function runQuery(sql) {
  const preparedSql = prepareOracleSql(sql); // adapt the Oracle SQL (may throw for ROLLBACK or LIMIT)
  changesBefore = totalChanges(); // remember the count of changed rows before running (for countChangedRows)
  return db.exec(preparedSql); // sql.js runs it and returns the results
}

/**
 * Adapts Oracle SQL that SQLite would not understand, before it is run
 * (used by runQuery and by the exercise checker on its scratch databases):
 * - SYSDATE is written without parentheses in Oracle, but SQLite would read it as a column name,
 *   so it becomes SYSDATE();
 * - COMMIT is removed, because SQLite gives an error when no transaction was started
 *   (here every change is saved at once);
 * - ROLLBACK stops the SQL with an error: changes cannot be undone here, only the reset button
 *   brings back the original data;
 * - LIMIT stops the SQL with an error, because it does not exist in Oracle.
 * Texts in quotes ('SYSDATE', "limit") and comments (after two dashes, or between slash-star and star-slash)
 * are not changed or checked, so e.g. an apostrophe inside a comment does no harm.
 * Parameter: sql - the SQL text written by the user.
 * Returns: the adapted SQL text. Throws an error (in Romanian) for ROLLBACK or LIMIT.
 */
export function prepareOracleSql(sql) {
  // cut the SQL into pieces: the skipped parts (quotes, comments) land at the odd positions 1, 3, 5, ...
  // and the real SQL code between them at the even positions 0, 2, 4, ...
  const parts = sql.split(SKIPPED_PARTS);
  for (let i = 0; i < parts.length; i += 2) { // only the pieces of real SQL code
    if (/\bROLLBACK\b/i.test(parts[i])) { // the word ROLLBACK (any letter case)
      throw new Error(ROLLBACK_ERROR);
    }
    // the word LIMIT, but not inside a longer name like "limita" or "limită"; \b is not used here because
    // it does not treat ă, î, ș, ț as letters (it would find LIMIT in "limită"), so \p{L} (any letter),
    // \p{N} (any digit) and _ must not come right before or right after the word
    if (/(?<![\p{L}\p{N}_])LIMIT(?![\p{L}\p{N}_])/iu.test(parts[i])) {
      throw new Error(LIMIT_ERROR);
    }
    // whole word SYSDATE (any letter case) that is not already followed by "(" gets "()"
    parts[i] = parts[i].replace(/\bSYSDATE\b(?!\s*\()/gi, 'SYSDATE()');
    // whole word COMMIT (any letter case), with its ";" if there is one, is removed
    parts[i] = parts[i].replace(/\bCOMMIT\b\s*;?/gi, '');
  }
  return parts.join(''); // glue all the pieces back together
}

/**
 * Returns: how many rows the last runQuery changed, adding up all its INSERT, UPDATE and DELETE
 * statements (e.g. "INSERT ...; INSERT ...;" gives 2). A SELECT or a CREATE TABLE changes 0 rows.
 */
export function countChangedRows() {
  return totalChanges() - changesBefore; // changed rows now, minus the changed rows before the last runQuery
}

/**
 * Returns: how many rows were changed on the main database since it was created
 * (SQLite's total_changes() function counts every row changed by INSERT, UPDATE and DELETE).
 */
function totalChanges() {
  return db.exec('SELECT total_changes()')[0].values[0][0]; // first result, first row, first column
}

/**
 * Throws away the main database and builds it again from seed.sql
 * (used by the "Resetează baza de date" button).
 */
export function resetDatabase() {
  db.close(); // free the memory of the old database
  db = buildDatabase(); // a fresh copy with the original data
}

/**
 * Describes the tables of the main database (for the schema panel).
 * Returns: a list like [{ table: 'elevi', columns: [{ name: 'id_elev', type: 'NUMBER(5)' }, ...] }, ...],
 *          in the order the tables were created. The DUAL table is left out.
 */
export function getSchema() {
  // sqlite_master is SQLite's list of everything in the database; rowid keeps the creation order
  const tableResult = db.exec(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name <> 'dual' AND name NOT LIKE 'sqlite_%' ORDER BY rowid"
  );
  if (tableResult.length === 0) { // no tables left (the user dropped all of them)
    return []; // empty schema
  }
  const tableNames = tableResult[0].values.map((row) => row[0]); // each row holds one table name
  return tableNames.map((tableName) => ({ table: tableName, columns: getColumns(tableName) })); // table + its columns
}

/**
 * Lists the columns of one table of the main database.
 * Parameter: tableName - the name of the table.
 * Returns: a list like [{ name: 'id_elev', type: 'NUMBER(5)' }, ...].
 */
function getColumns(tableName) {
  // pragma_table_info gives one row per column; "?" is replaced by tableName
  const result = db.exec('SELECT name, type FROM pragma_table_info(?)', [tableName]);
  return result[0].values.map((row) => ({ name: row[0], type: row[1] })); // column name and declared type
}

/**
 * Creates a separate database with the same functions and data, used by the exercise checker
 * so that the user's INSERT/UPDATE/DELETE do not change the main database.
 * Returns: the new sql.js database. The caller must close it with .close() when done.
 */
export function createScratchDatabase() {
  return buildDatabase(); // same steps as the main database
}

// ============================================================
// Oracle functions (written in JavaScript and added to SQLite)
// ============================================================
// Note: sql.js shows the message of an error only if we throw a plain text (a thrown Error object
// arrives empty), so the functions below use: throw 'message';

/**
 * Adds the Oracle functions that SQLite does not have (or has in a different form).
 * Parameter: database - the database to add the functions to.
 */
function addOracleFunctions(database) {
  // functions with a fixed number of arguments (SQLite reports a wrong number of arguments itself)
  database.create_function('NVL', nvl); // NVL(value, replacement)
  database.create_function('NVL2', nvl2); // NVL2(value, if_not_null, if_null)
  database.create_function('SYSDATE', sysdate); // SYSDATE: today's date
  database.create_function('TO_DATE', toDate); // TO_DATE(text, format)
  database.create_function('INITCAP', initcap); // INITCAP(text)
  database.create_function('MOD', mod); // MOD(a, b)
  database.create_function('MONTHS_BETWEEN', monthsBetween); // MONTHS_BETWEEN(date1, date2)
  database.create_function('ADD_MONTHS', addMonths); // ADD_MONTHS(date, months)
  database.create_function('UPPER', upper); // replaces SQLite's UPPER, which ignores ă, î, â, ș, ț
  database.create_function('LOWER', lower); // replaces SQLite's LOWER, which ignores Ă, Î, Â, Ș, Ț
  // functions whose last argument is optional
  addFunctionWithOptionalArgument(database, 'TO_CHAR', toChar, 1, 2); // TO_CHAR(value [, format])
  addFunctionWithOptionalArgument(database, 'TRUNC', trunc, 1, 2); // TRUNC(number [, decimals])
  addFunctionWithOptionalArgument(database, 'LPAD', lpad, 2, 3); // LPAD(text, length [, fill])
  addFunctionWithOptionalArgument(database, 'RPAD', rpad, 2, 3); // RPAD(text, length [, fill])
  addFunctionWithOptionalArgument(database, 'SUBSTR', substr, 2, 3); // SUBSTR(text, position [, length]), replaces SQLite's
}

/**
 * Adds a function that accepts a variable number of arguments.
 * sql.js reads the number of arguments from the JavaScript function, so we tell it "any number" (-1)
 * and check the count ourselves.
 * Parameters: database - the database; name - the SQL name; fn - the JavaScript function;
 *             minArgs, maxArgs - the smallest and largest allowed number of arguments.
 */
function addFunctionWithOptionalArgument(database, name, fn, minArgs, maxArgs) {
  const checkedFn = (...args) => { // receives all the arguments as a list
    if (args.length < minArgs || args.length > maxArgs) { // too few or too many arguments
      throw 'wrong number of arguments to function ' + name + '()'; // same message as SQLite's own
    }
    return fn(...args); // call the real function (a missing last argument is undefined)
  };
  Object.defineProperty(checkedFn, 'length', { value: -1 }); // -1 means "any number of arguments" for SQLite
  database.create_function(name, checkedFn); // register it under its SQL name
}

/**
 * NVL(value, replacement): returns replacement when value is NULL, otherwise value.
 */
function nvl(value, replacement) {
  return value === null ? replacement : value; // NULL arrives in JavaScript as null
}

/**
 * NVL2(value, ifNotNull, ifNull): returns ifNotNull when value is not NULL, otherwise ifNull.
 */
function nvl2(value, ifNotNull, ifNull) {
  return value === null ? ifNull : ifNotNull; // choose by whether value is NULL
}

/**
 * SYSDATE: today's date (from the computer's clock) as text 'YYYY-MM-DD'.
 */
function sysdate() {
  const now = new Date(); // current local date and time
  return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate()); // JavaScript counts months from 0
}

/**
 * TO_DATE(text, format): turns a text like '12.05.2008' into a date stored as '2008-05-12'.
 * The format must contain YYYY, MM and DD once each, e.g. 'YYYY-MM-DD', 'DD.MM.YYYY', 'DD/MM/YYYY'.
 * Returns NULL when text or format is NULL. Throws an error for an unsupported format or an invalid date.
 */
function toDate(text, format) {
  if (text === null || format === null) { // Oracle: NULL in, NULL out
    return null;
  }
  const formatParts = String(format).toUpperCase().match(/YYYY|MM|DD/g) ?? []; // e.g. ['DD', 'MM', 'YYYY']
  if (formatParts.length !== 3) { // the format must have exactly three parts
    throw 'TO_DATE: formatul ' + format + " nu este suportat (folosește YYYY, MM și DD, de exemplu 'YYYY-MM-DD')";
  }
  const numbers = String(text).match(/\d+/g) ?? []; // the groups of digits in the text, e.g. ['12', '05', '2008']
  const values = {}; // will hold the value of each part: values.YYYY, values.MM, values.DD
  formatParts.forEach((part, index) => { // pair each format part with the number in the same position
    values[part] = Number(numbers[index]);
  });
  if (numbers.length !== 3 || !isValidDate(values.YYYY, values.MM, values.DD)) { // wrong text or impossible date
    throw 'TO_DATE: ' + text + ' nu este o dată validă pentru formatul ' + format;
  }
  return formatDate(values.YYYY, values.MM, values.DD); // stored as 'YYYY-MM-DD'
}

/**
 * TO_CHAR(value [, format]): turns a number or a date into text.
 * Without a format, the value is simply turned into text.
 * With a format, the value must be a date; supported parts: YYYY, MM, DD, MONTH, MON
 * (written in capitals, e.g. 'MONTH', or not, e.g. 'Month'), with an optional 'FM' at the start
 * (no spaces after the month name and no leading zeros), plus separators like . - / space.
 */
function toChar(value, format) {
  if (value === null) { // Oracle: NULL in, NULL out
    return null;
  }
  if (format === undefined) { // no format given
    return String(value); // e.g. 7420.5 becomes '7420.5'
  }
  if (format === null) { // Oracle: a NULL format gives NULL
    return null;
  }
  if (typeof value === 'number') { // number formats like '9999.99' are not implemented
    throw 'TO_CHAR: formatele pentru numere nu sunt suportate; folosește TO_CHAR(număr) sau ROUND';
  }
  return formatDateText(value, String(format)); // the value is a date
}

/**
 * Writes a date ('YYYY-MM-DD') using an Oracle date format (helper for TO_CHAR).
 * Parameters: dateText - the date; format - e.g. 'DD.MM.YYYY' or 'fmDD Month YYYY'.
 * Returns: the formatted text.
 */
function formatDateText(dateText, format) {
  const date = parseDate(dateText); // split into year, month and day
  const fillMode = format.toUpperCase().startsWith('FM'); // 'FM' at the start: no padding
  const pattern = fillMode ? format.slice(2) : format; // the format without 'FM'
  const tokens = /YYYY|MONTH|MON|MM|DD/gi; // the parts we know, longest first (MONTH before MON before MM)
  if (/[a-z]/i.test(pattern.replace(tokens, ''))) { // letters left over = a part we do not support
    throw 'TO_CHAR: formatul ' + format + ' nu este suportat (folosește YYYY, MM, DD, MONTH, MON)';
  }
  return pattern.replace(tokens, (token) => { // replace each part with its value
    const upperToken = token.toUpperCase(); // compare without caring about capitals
    if (upperToken === 'YYYY') { // the year, 4 digits
      return String(date.year).padStart(4, '0');
    }
    if (upperToken === 'MM') { // the month number: '05' (or '5' with FM)
      return fillMode ? String(date.month) : String(date.month).padStart(2, '0');
    }
    if (upperToken === 'DD') { // the day number: '02' (or '2' with FM)
      return fillMode ? String(date.day) : String(date.day).padStart(2, '0');
    }
    const fullName = MONTH_NAMES[date.month - 1]; // e.g. 'MAY' (the list starts at index 0)
    const name = upperToken === 'MON' ? fullName.slice(0, 3) : fullName; // MON = first 3 letters, e.g. 'SEP'
    const paddedName = upperToken === 'MONTH' && !fillMode ? name.padEnd(MONTH_NAME_WIDTH, ' ') : name; // Oracle pads MONTH to 9 letters
    return matchLetterCase(paddedName, token); // 'MONTH' -> 'MAY', 'Month' -> 'May', 'month' -> 'may'
  });
}

/**
 * Writes a month name with the same capitals as the format part (helper for TO_CHAR).
 * Parameters: name - the name in capitals, e.g. 'MAY'; token - the format part, e.g. 'Month'.
 * Returns: 'MAY' for 'MONTH', 'May' for 'Month', 'may' for 'month'.
 */
function matchLetterCase(name, token) {
  if (token === token.toUpperCase()) { // all capitals
    return name;
  }
  if (token[0] === token[0].toUpperCase()) { // only the first letter is a capital
    return name[0] + name.slice(1).toLowerCase();
  }
  return name.toLowerCase(); // all small letters
}

/**
 * INITCAP(text): first letter of every word in capitals, the others small.
 * A new word starts after any character that is not a letter or a digit (space, '-', ...).
 * Example: INITCAP('ana-maria POPESCU') = 'Ana-Maria Popescu'.
 */
function initcap(text) {
  if (text === null) { // Oracle: NULL in, NULL out
    return null;
  }
  let result = ''; // the text we build, one character at a time
  let insideWord = false; // true when the previous character was a letter or a digit
  for (const character of String(text).toLowerCase()) { // go through the text in small letters
    result += insideWord ? character : character.toUpperCase(); // first letter of a word becomes a capital
    insideWord = /[\p{L}\p{N}]/u.test(character); // \p{L} = any letter (also ș, ț), \p{N} = any digit
  }
  return result;
}

/**
 * MOD(a, b): the remainder of a divided by b, with the sign of a (MOD(-11, 4) = -3).
 * Oracle: MOD(a, 0) = a.
 */
function mod(a, b) {
  if (a === null || b === null) { // Oracle: NULL in, NULL out
    return null;
  }
  if (b === 0) { // division by 0: Oracle returns a
    return a;
  }
  return a % b; // JavaScript's % also keeps the sign of a
}

/**
 * MONTHS_BETWEEN(date1, date2): how many months from date2 to date1 (negative if date1 is earlier).
 * Whole number when both dates have the same day of the month or are both the last day of their month;
 * otherwise the difference in days is added as a part of a 31-day month, like in Oracle.
 */
function monthsBetween(date1, date2) {
  if (date1 === null || date2 === null) { // Oracle: NULL in, NULL out
    return null;
  }
  const a = parseDate(date1); // first date as year, month, day
  const b = parseDate(date2); // second date as year, month, day
  const wholeMonths = (a.year - b.year) * 12 + (a.month - b.month); // difference in months, ignoring days
  const aIsLastDay = a.day === daysInMonth(a.year, a.month); // is date1 the last day of its month?
  const bIsLastDay = b.day === daysInMonth(b.year, b.month); // is date2 the last day of its month?
  if (a.day === b.day || (aIsLastDay && bIsLastDay)) { // Oracle's rule for a whole number
    return wholeMonths;
  }
  return wholeMonths + (a.day - b.day) / 31; // Oracle counts every month as 31 days here
}

/**
 * ADD_MONTHS(date, months): the date moved by a number of months (negative = back in time).
 * If the date is the last day of its month, or the new month is shorter, the result is the last day
 * of the new month, like in Oracle: ADD_MONTHS('2025-01-31', 1) = '2025-02-28'.
 */
function addMonths(dateText, months) {
  if (dateText === null || months === null) { // Oracle: NULL in, NULL out
    return null;
  }
  const date = parseDate(dateText); // year, month, day
  const monthCount = date.year * 12 + (date.month - 1) + Math.trunc(months); // months since year 0 (decimals dropped)
  const year = Math.floor(monthCount / 12); // new year
  const month = (monthCount % 12) + 1; // new month, from 1 to 12
  const lastDay = daysInMonth(year, month); // number of days in the new month
  const wasLastDay = date.day === daysInMonth(date.year, date.month); // was the old date the end of its month?
  const day = wasLastDay || date.day > lastDay ? lastDay : date.day; // Oracle's end-of-month rule
  return formatDate(year, month, day); // back to 'YYYY-MM-DD'
}

/**
 * TRUNC(number [, decimals]): cuts a number to a number of decimals, without rounding.
 * TRUNC(15.79) = 15, TRUNC(15.79, 1) = 15.7, TRUNC(15.79, -1) = 10.
 * TRUNC(date) returns the same date (our dates have no time part).
 */
function trunc(value, decimals = 0) {
  if (value === null || decimals === null) { // Oracle: NULL in, NULL out
    return null;
  }
  if (typeof value === 'string') { // a date, e.g. TRUNC(SYSDATE)
    const date = parseDate(value); // check that it is a date
    return formatDate(date.year, date.month, date.day); // the date without any time part
  }
  const factor = 10 ** Math.trunc(decimals); // e.g. 1 decimal -> 10, -1 decimal -> 0.1
  const shifted = Number((value * factor).toPrecision(15)); // move the decimals; toPrecision removes tiny errors (4.35 * 100 = 434.99999999999994)
  return Math.trunc(shifted) / factor; // cut the rest and move the decimals back
}

/**
 * LPAD(text, length [, fill]): fills the text on the left with "fill" (default: spaces) up to "length"
 * characters. A longer text is cut to "length" characters, like in Oracle. LPAD(7, 3, '0') = '007'.
 */
function lpad(text, length, fill = ' ') {
  return padText(text, length, fill, 'left'); // shared code with RPAD
}

/**
 * RPAD(text, length [, fill]): like LPAD, but fills on the right. RPAD('ab', 5, 'xy') = 'abxyx'.
 */
function rpad(text, length, fill = ' ') {
  return padText(text, length, fill, 'right'); // shared code with LPAD
}

/**
 * Shared code of LPAD and RPAD.
 * Parameters: text, length, fill - as in LPAD; side - 'left' or 'right'.
 * Returns: the filled (or cut) text, or NULL like Oracle for NULL arguments, length <= 0 or an empty fill.
 */
function padText(text, length, fill, side) {
  if (text === null || length === null || fill === null) { // Oracle: NULL in, NULL out
    return null;
  }
  const size = Math.trunc(length); // Oracle drops the decimals of the length
  if (size <= 0 || String(fill) === '') { // Oracle returns NULL here ('' is NULL in Oracle)
    return null;
  }
  const value = String(text); // numbers become text too, e.g. 7 -> '7'
  if (value.length >= size) { // already long enough
    return value.slice(0, size); // Oracle cuts it to the given length
  }
  return side === 'left' ? value.padStart(size, String(fill)) : value.padEnd(size, String(fill)); // add the fill
}

/**
 * SUBSTR(text, position [, length]): a piece of the text, like in Oracle.
 * Replaces SQLite's SUBSTR, which works differently for position 0 (SUBSTR('Ana', 0, 1) gives '' there).
 * - position 1 is the first character; position 0 is also the first character (like Oracle);
 * - a negative position counts from the end: SUBSTR('Popescu', -3) = 'scu';
 * - without length, the piece goes to the end of the text;
 * - an empty piece (length 0 or less, or a position outside the text) gives NULL,
 *   because Oracle has no empty text ('' is NULL in Oracle).
 * Letters like ș and ț count as one character each.
 */
function substr(text, position, length) {
  if (text === null || position === null || length === null) { // Oracle: NULL in, NULL out
    return null;
  }
  const characters = Array.from(String(text)); // the text as a list of characters (numbers become text too)
  let start = Math.trunc(position); // Oracle drops the decimals of the position
  if (start === 0) { // Oracle treats position 0 as 1
    start = 1;
  }
  if (start < 0) { // count from the end: -1 is the last character
    start = characters.length + start + 1; // e.g. 'Popescu' (7 characters), -3 -> 5
  }
  if (start < 1) { // the position is before the start of the text
    return null;
  }
  const end = length === undefined ? characters.length : start - 1 + Math.trunc(length); // where the piece stops
  const piece = characters.slice(start - 1, end).join(''); // slice counts from 0, so start - 1
  return piece === '' ? null : piece; // empty piece -> NULL, like Oracle
}

/**
 * UPPER(text): all letters in capitals, including Romanian letters (UPPER('ș') = 'Ș').
 */
function upper(text) {
  return text === null ? null : String(text).toUpperCase(); // NULL stays NULL
}

/**
 * LOWER(text): all letters small, including Romanian letters (LOWER('Ț') = 'ț').
 */
function lower(text) {
  return text === null ? null : String(text).toLowerCase(); // NULL stays NULL
}

// ============================================================
// Date helpers (dates are stored as text 'YYYY-MM-DD')
// ============================================================

/**
 * Splits a date text 'YYYY-MM-DD' into numbers.
 * Parameter: text - the date (anything after the first 10 characters, like a time, is ignored).
 * Returns: { year, month, day }. Throws an error if the text is not a date.
 */
function parseDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(text)); // 4 digits - 2 digits - 2 digits at the start
  if (match === null) { // not a date
    throw 'Valoarea ' + text + ' nu este o dată (formatul așteptat: YYYY-MM-DD)';
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }; // the three groups of digits
}

/**
 * Writes a date as text 'YYYY-MM-DD'.
 * Parameters: year, month (1-12), day.
 * Returns: e.g. formatDate(2008, 5, 2) = '2008-05-02'.
 */
function formatDate(year, month, day) {
  const yearText = String(year).padStart(4, '0'); // always 4 digits
  const monthText = String(month).padStart(2, '0'); // always 2 digits, e.g. '05'
  const dayText = String(day).padStart(2, '0'); // always 2 digits, e.g. '02'
  return yearText + '-' + monthText + '-' + dayText; // joined with '-'
}

/**
 * Returns: how many days a month has (28, 29, 30 or 31).
 * Parameters: year, month (1-12).
 */
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate(); // day 0 of the next month is the last day of this month
}

/**
 * Checks that year, month and day form a real date (e.g. 31.02 is not a real date).
 * Returns: true or false.
 */
function isValidDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) { // missing or not whole numbers
    return false;
  }
  if (year < 1 || year > 9999 || month < 1 || month > 12) { // year and month out of range
    return false;
  }
  return day >= 1 && day <= daysInMonth(year, month); // day must exist in that month
}
