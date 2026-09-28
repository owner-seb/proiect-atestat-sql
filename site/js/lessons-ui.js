/*
  lessons-ui.js - shows the lessons and their exercises on the home page.
  Used by: index.html (started by main.js after the database is ready).
  The lesson texts come from lessons.js, the answers are checked by checker.js.
  What it builds:
  - a row of numbered lesson buttons (with the progress of each lesson, e.g. "2/4");
  - one lesson at a time: its text, its examples (with an "Încearcă în editor" button) and its exercises;
  - "previous lesson" / "next lesson" buttons.
  The last opened lesson and the solved exercises are saved in the browser (localStorage).
  Security: everything is built with document.createElement and textContent, never by inserting HTML text.
*/

import { LESSONS } from './lessons.js'; // the lesson texts and exercises
import { checkExercise } from './checker.js'; // checks the answer of an exercise
import { renderResults, renderMessage } from './render.js'; // show result tables and messages

// Names under which the progress is saved in the browser (localStorage)
const LAST_LESSON_KEY = 'sqlPlayground.lastLesson'; // id of the last opened lesson
const SOLVED_KEY = 'sqlPlayground.solved'; // list of the ids of the solved exercises

// ===== Page elements used by this file =====
const lessonNav = document.getElementById('lesson-nav'); // the row of numbered lesson buttons
const lessonContent = document.getElementById('lesson-content'); // the area where one lesson is shown
const lessonsSection = document.getElementById('lessons'); // the whole lessons section (used for scrolling)

// ===== State of the lessons =====
let currentIndex = 0; // position of the lesson shown now (0 = first lesson)
let solvedIds = new Set(); // ids of the solved exercises, e.g. 'filtrare-2'
let tryInEditor = null; // function from main.js that runs an example in the SQL editor

/**
 * Starts the lessons: reads the saved progress, then shows the last opened lesson.
 * Parameter: tryInEditorFunction - function(sql) from main.js that puts SQL in the editor and runs it.
 */
export function startLessons(tryInEditorFunction) {
  tryInEditor = tryInEditorFunction; // remember it for the "Încearcă în editor" buttons
  solvedIds = loadSolvedIds(); // exercises solved before (saved in the browser)
  openLesson(loadLastLessonIndex()); // show the lesson opened last time (or the first one)
}

// ===== Saving progress in the browser (localStorage) =====
// localStorage can be blocked (private mode, strict settings), so every access is inside try/catch.

/**
 * Reads the list of solved exercises saved in the browser.
 * Returns: a Set with the ids of the solved exercises (empty if nothing was saved).
 */
function loadSolvedIds() {
  try {
    const saved = localStorage.getItem(SOLVED_KEY); // saved text, e.g. '["introducere-1"]', or null
    return new Set(saved === null ? [] : JSON.parse(saved)); // turn the text back into a list
  } catch (error) {
    return new Set(); // storage blocked or broken: start with no solved exercises
  }
}

/**
 * Saves the list of solved exercises in the browser.
 */
function saveSolvedIds() {
  try {
    localStorage.setItem(SOLVED_KEY, JSON.stringify([...solvedIds])); // save the list as text
  } catch (error) {
    // storage blocked: the progress is kept only until the page is reloaded
  }
}

/**
 * Reads which lesson was opened last time.
 * Returns: the position of that lesson in LESSONS, or 0 (the first lesson) if nothing was saved.
 */
function loadLastLessonIndex() {
  try {
    const savedId = localStorage.getItem(LAST_LESSON_KEY); // saved lesson id, or null
    const index = LESSONS.findIndex((lesson) => lesson.id === savedId); // -1 if not found
    return index === -1 ? 0 : index; // unknown id: start with the first lesson
  } catch (error) {
    return 0; // storage blocked: start with the first lesson
  }
}

/**
 * Saves which lesson is open now.
 */
function saveLastLesson() {
  try {
    localStorage.setItem(LAST_LESSON_KEY, LESSONS[currentIndex].id); // save the lesson id
  } catch (error) {
    // storage blocked: the page will open the first lesson next time
  }
}

// ===== Lesson buttons (the numbered row above the lesson) =====

/**
 * Builds the row of numbered lesson buttons. Each button shows the lesson number and its progress,
 * e.g. "3" and "2/4". The button of the open lesson is highlighted.
 */
function showLessonButtons() {
  lessonNav.replaceChildren(); // remove the old buttons
  LESSONS.forEach((lesson, index) => { // one button for each lesson
    const button = document.createElement('button'); // lesson button
    button.type = 'button'; // a normal button (not a form submit)
    button.className = 'lesson-chip'; // style: small pill-shaped button
    button.title = lesson.title; // lesson title shown when the mouse is over the button
    const solved = countSolved(lesson); // how many exercises of this lesson are solved
    button.setAttribute('aria-label', 'Lecția ' + (index + 1) + ': ' + lesson.title
      + ' (' + solved + ' din ' + lesson.exercises.length + ' exerciții rezolvate)'); // text read by screen readers
    if (index === currentIndex) { // the lesson shown now
      button.setAttribute('aria-current', 'true'); // style: highlighted button
    }
    if (solved === lesson.exercises.length) { // every exercise of the lesson is solved
      button.classList.add('lesson-chip-done'); // style: green border
    }

    const number = document.createElement('span'); // lesson number
    number.textContent = String(index + 1); // e.g. "3"
    const progress = document.createElement('span'); // progress of the lesson
    progress.className = 'lesson-chip-progress'; // style: small text
    progress.textContent = solved + '/' + lesson.exercises.length; // e.g. "2/4"
    button.append(number, progress); // number first, then progress

    button.addEventListener('click', () => { // lesson button click
      openLesson(index); // open that lesson (the buttons are drawn again)
      focusCurrentLessonButton(); // keep the keyboard focus on the button of the open lesson
    });
    lessonNav.appendChild(button); // add the button to the row
  });
}

/**
 * Puts the keyboard focus on the button of the open lesson.
 * Needed because the buttons are drawn again when a lesson opens, and the old focused button is gone.
 * preventScroll: the focus does not move the page (the page may be scrolling to the lessons).
 */
function focusCurrentLessonButton() {
  const currentButton = lessonNav.querySelector('[aria-current="true"]'); // the highlighted lesson button
  currentButton.focus({ preventScroll: true }); // focus it without scrolling
}

/**
 * Counts the solved exercises of one lesson.
 * Parameter: lesson - one lesson from LESSONS.
 * Returns: the number of solved exercises.
 */
function countSolved(lesson) {
  return lesson.exercises.filter((exercise) => solvedIds.has(exercise.id)).length; // keep only the solved ones
}

// ===== One lesson =====

/**
 * Shows one lesson: its number and title, its text blocks, its exercises and the previous/next buttons.
 * Parameter: index - position of the lesson in LESSONS (0 = first lesson).
 */
function openLesson(index) {
  currentIndex = index; // remember which lesson is open
  saveLastLesson(); // so the same lesson opens after a reload
  showLessonButtons(); // highlight the right lesson button
  const lesson = LESSONS[index]; // the lesson to show

  const article = document.createElement('article'); // box for the whole lesson
  article.className = 'card lesson'; // style: dark card

  const number = document.createElement('p'); // small text above the title
  number.className = 'lesson-number'; // style: small purple text
  number.textContent = 'Lecția ' + (index + 1) + ' din ' + LESSONS.length; // e.g. "Lecția 3 din 9"
  const title = document.createElement('h3'); // lesson title
  title.textContent = lesson.title; // e.g. "Subinterogări"
  article.append(number, title); // add them at the top of the lesson

  for (const block of lesson.blocks) { // every paragraph, list and example of the lesson
    article.appendChild(createBlock(block)); // add it to the lesson
  }

  article.appendChild(createExercisesList(lesson)); // the exercises of the lesson
  article.appendChild(createLessonPager()); // previous / next lesson buttons

  lessonContent.replaceChildren(article); // show this lesson instead of the old one
}

/**
 * Builds one text block of a lesson.
 * Parameter: block - { type: 'p', text } or { type: 'list', items } or { type: 'example', sql, explanation }
 * Returns: the page element for the block.
 */
function createBlock(block) {
  if (block.type === 'list') { // a list with bullets
    const list = document.createElement('ul'); // bullet list
    list.className = 'lesson-list'; // style of the lesson lists
    for (const itemText of block.items) { // every line of the list
      const item = document.createElement('li'); // one bullet
      appendTextWithCode(item, itemText); // its text, with `code` shown as code
      list.appendChild(item); // add it to the list
    }
    return list; // the finished list
  }
  if (block.type === 'example') { // an SQL example
    return createExample(block); // box with the SQL and a "try it" button
  }
  const paragraph = document.createElement('p'); // a normal paragraph ('p')
  appendTextWithCode(paragraph, block.text); // its text, with `code` shown as code
  return paragraph; // the finished paragraph
}

/**
 * Builds an example box: the SQL code, its explanation and an "Încearcă în editor" button.
 * Parameter: block - { type: 'example', sql, explanation }
 * Returns: a <div> with the example.
 */
function createExample(block) {
  const box = document.createElement('div'); // box for the whole example
  box.className = 'lesson-example'; // style: purple line on the left

  box.appendChild(createCodeBlock(block.sql)); // the SQL of the example

  const explanation = document.createElement('p'); // text under the SQL
  explanation.className = 'lesson-example-text'; // style of the explanation
  appendTextWithCode(explanation, block.explanation); // explanation, with `code` shown as code
  box.appendChild(explanation); // add it under the SQL

  const button = document.createElement('button'); // "try it" button
  button.type = 'button'; // a normal button (not a form submit)
  button.className = 'button button-secondary'; // style: dark button with purple border
  button.textContent = 'Încearcă în editor'; // button text
  button.addEventListener('click', () => tryInEditor(block.sql)); // try button click: run the example in the editor
  box.appendChild(button); // add the button under the explanation

  return box; // the finished example
}

/**
 * Builds a box that shows SQL code (kept on several lines, like in the editor).
 * Parameter: sql - the SQL text.
 * Returns: a <pre> element.
 */
function createCodeBlock(sql) {
  const pre = document.createElement('pre'); // keeps the line breaks and spaces
  pre.className = 'code-block'; // style: dark box with monospace text
  const code = document.createElement('code'); // marks the text as code
  code.textContent = sql; // the SQL, as plain text (never as HTML)
  pre.appendChild(code); // put the code inside the box
  return pre; // the finished code box
}

/**
 * Writes a text inside an element; the parts written between `backticks` become <code> elements.
 * Example: 'Folosește `NVL` aici' -> "Folosește " + <code>NVL</code> + " aici".
 * Parameters:
 *   element - the element to write into
 *   text    - the text from lessons.js
 */
function appendTextWithCode(element, text) {
  const parts = text.split('`'); // cut the text at every backtick
  parts.forEach((part, index) => { // pieces 0, 2, 4... are normal text; pieces 1, 3, 5... are code
    if (index % 2 === 1) { // a piece that was between backticks
      const code = document.createElement('code'); // inline code element
      code.textContent = part; // the code, as plain text
      element.appendChild(code); // add it to the element
    } else {
      element.appendChild(document.createTextNode(part)); // normal text, as plain text
    }
  });
}

/**
 * Builds the "previous lesson" / "next lesson" buttons at the bottom of a lesson.
 * Returns: a <div> with the two buttons.
 */
function createLessonPager() {
  const pager = document.createElement('div'); // row with the two buttons
  pager.className = 'lesson-pager'; // style: one button on the left, one on the right

  const previous = document.createElement('button'); // previous lesson button
  previous.type = 'button'; // a normal button (not a form submit)
  previous.className = 'button button-secondary'; // style: dark button
  previous.disabled = currentIndex === 0; // no previous lesson before the first one
  previous.textContent = previous.disabled ? 'Prima lecție' : '‹ Lecția ' + currentIndex; // e.g. "‹ Lecția 2" when lesson 3 is open
  previous.addEventListener('click', () => goToLesson(currentIndex - 1)); // previous button click

  const next = document.createElement('button'); // next lesson button
  next.type = 'button'; // a normal button (not a form submit)
  next.className = 'button button-secondary'; // style: dark button
  next.disabled = currentIndex === LESSONS.length - 1; // no next lesson after the last one
  next.textContent = next.disabled ? 'Ultima lecție' : 'Lecția ' + (currentIndex + 2) + ' ›'; // e.g. "Lecția 4 ›" when lesson 3 is open
  next.addEventListener('click', () => goToLesson(currentIndex + 1)); // next button click

  pager.append(previous, next); // add both buttons to the row
  return pager; // the finished row
}

/**
 * Opens another lesson and scrolls up to the start of the lessons section.
 * Parameter: index - position of the lesson in LESSONS.
 */
function goToLesson(index) {
  openLesson(index); // show the lesson
  focusCurrentLessonButton(); // the keyboard focus goes to the button of the new lesson (the clicked button is gone)
  lessonsSection.scrollIntoView({ behavior: 'smooth' }); // scroll to the lesson buttons
}

// ===== Exercises =====

/**
 * Builds the exercises part of a lesson: a heading, the progress ("2 din 4 rezolvate") and one box per exercise.
 * Parameter: lesson - one lesson from LESSONS.
 * Returns: a <div> with all the exercises.
 */
function createExercisesList(lesson) {
  const box = document.createElement('div'); // box for all the exercises
  box.className = 'exercises'; // style: space above the exercises

  const heading = document.createElement('h4'); // "Exerciții" heading
  heading.className = 'exercises-title'; // style: heading with a purple ">"
  heading.textContent = 'Exerciții'; // heading text
  const progress = document.createElement('p'); // progress text, e.g. "Rezolvate: 2 din 4"
  progress.className = 'lesson-progress'; // style: small gray text
  box.append(heading, progress); // add them at the top

  // updates the progress text and the lesson buttons (called at the start and after each correct answer)
  const updateProgress = () => {
    progress.textContent = 'Rezolvate: ' + countSolved(lesson) + ' din ' + lesson.exercises.length; // e.g. "Rezolvate: 2 din 4"
    showLessonButtons(); // the numbered buttons show the progress too
  };
  updateProgress(); // show the progress right away

  lesson.exercises.forEach((exercise, index) => { // one box for each exercise
    box.appendChild(createExercise(exercise, index + 1, updateProgress)); // add the exercise box
  });
  return box; // the finished exercises part
}

/**
 * Builds the box of one exercise: statement, answer box, buttons ("Verifică", "Indiciu", "Arată soluția"),
 * the hint, the feedback area and, under it, the solution.
 * Parameters:
 *   exercise       - one exercise from lessons.js
 *   number         - the number of the exercise in the lesson (1, 2, 3...)
 *   updateProgress - function to call after the exercise is solved
 * Returns: a <div> with the exercise.
 */
function createExercise(exercise, number, updateProgress) {
  const box = document.createElement('div'); // box for the exercise
  box.className = 'exercise'; // style: bordered box

  const title = document.createElement('h5'); // exercise title
  title.className = 'exercise-title'; // style of the exercise title
  title.textContent = 'Exercițiul ' + number + ' '; // e.g. "Exercițiul 2"
  const solvedMark = document.createElement('span'); // green "rezolvat" mark
  solvedMark.className = 'exercise-solved'; // style: green text
  solvedMark.textContent = 'rezolvat'; // mark text
  solvedMark.hidden = !solvedIds.has(exercise.id); // shown only when the exercise is solved
  title.appendChild(solvedMark); // put the mark next to the title
  box.appendChild(title); // add the title to the box

  const statement = document.createElement('p'); // what the exercise asks
  appendTextWithCode(statement, exercise.statement); // statement, with `code` shown as code
  box.appendChild(statement); // add it under the title

  const label = document.createElement('label'); // text above the answer box
  label.className = 'editor-label'; // same style as the label of the main editor
  label.htmlFor = 'answer-' + exercise.id; // connects the label to the answer box
  label.textContent = 'Răspunsul tău (SQL):'; // label text
  const answer = document.createElement('textarea'); // the answer box
  answer.id = 'answer-' + exercise.id; // e.g. "answer-filtrare-2"
  answer.className = 'sql-editor exercise-editor'; // same style as the main editor, but shorter
  answer.rows = 3; // starting number of lines
  answer.spellcheck = false; // no red underlines under SQL words
  answer.autocapitalize = 'off'; // phones: do not capitalize the first letter
  box.append(label, answer); // add the label and the answer box

  const buttons = document.createElement('div'); // row with the buttons
  buttons.className = 'editor-buttons'; // same style as the buttons of the main editor
  const checkButton = createButton('Verifică', 'button button-primary'); // check button
  const hintButton = createButton('Indiciu', 'button button-secondary'); // hint button
  const solutionButton = createButton('Arată soluția', 'button button-secondary'); // show solution button
  solutionButton.hidden = !solvedIds.has(exercise.id); // shown only after the first attempt (or if already solved)
  buttons.append(checkButton, hintButton, solutionButton); // add the buttons to the row
  box.appendChild(buttons); // add the row under the answer box

  const hint = document.createElement('p'); // the hint text
  hint.className = 'message message-info exercise-hint'; // style: gray message
  appendTextWithCode(hint, 'Indiciu: ' + exercise.hint); // hint, with `code` shown as code
  hint.hidden = true; // hidden until the hint button is clicked
  box.appendChild(hint); // add it under the buttons

  const feedback = document.createElement('div'); // area for the message and the user's result
  feedback.className = 'exercise-feedback'; // style: space above the message
  feedback.setAttribute('aria-live', 'polite'); // screen readers read the new message
  box.appendChild(feedback); // add it under the hint

  const solution = document.createElement('div'); // box for the solution: a "Soluția:" label and the correct SQL
  solution.className = 'exercise-solution'; // style: space above the solution
  const solutionLabel = document.createElement('p'); // "Soluția:" label above the SQL
  solutionLabel.className = 'exercise-solution-label'; // style: small purple text
  solutionLabel.textContent = 'Soluția:'; // label text
  solution.append(solutionLabel, createCodeBlock(exercise.solution)); // label, then the correct SQL
  solution.hidden = true; // hidden until the show solution button is clicked
  box.appendChild(solution); // add it at the bottom of the exercise, under the feedback

  // check button click: check the answer and show the message
  const check = () => {
    checkAnswer(exercise, answer.value, feedback); // compare with the solution, show the message
    if (answer.value.trim() !== '') { // it was a real attempt
      solutionButton.hidden = false; // now the solution may be shown
    }
    if (solvedIds.has(exercise.id)) { // the exercise is solved (now or before)
      solvedMark.hidden = false; // show the green mark
      updateProgress(); // update the progress text and the lesson buttons
    }
  };
  checkButton.addEventListener('click', check); // check button click
  answer.addEventListener('keydown', (event) => { // keyboard shortcut in the answer box
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { // Ctrl+Enter or Cmd+Enter
      event.preventDefault(); // do not add a new line
      check(); // check the answer
    }
  });
  hintButton.addEventListener('click', () => { // hint button click: show or hide the hint
    hint.hidden = !hint.hidden; // hidden -> shown, shown -> hidden
    hintButton.textContent = hint.hidden ? 'Indiciu' : 'Ascunde indiciul'; // button text says what the next click does
  });
  solutionButton.addEventListener('click', () => { // show solution button click: show or hide the solution
    solution.hidden = !solution.hidden; // hidden -> shown, shown -> hidden
    solutionButton.textContent = solution.hidden ? 'Arată soluția' : 'Ascunde soluția'; // button text says what the next click does
  });

  return box; // the finished exercise
}

/**
 * Builds a normal button with a text and a style.
 * Parameters: text - the button text; className - the CSS classes.
 * Returns: a <button> element.
 */
function createButton(text, className) {
  const button = document.createElement('button'); // new button
  button.type = 'button'; // a normal button (not a form submit)
  button.className = className; // its style
  button.textContent = text; // its text
  return button; // the finished button
}

/**
 * Checks an answer with checker.js, shows the message (green or red) and the user's rows,
 * and saves the exercise as solved when the answer is correct.
 * Parameters:
 *   exercise - the exercise from lessons.js
 *   userSql  - the SQL written by the user
 *   feedback - the area where the message is shown
 */
function checkAnswer(exercise, userSql, feedback) {
  let check; // the answer of the checker: { correct, message, result }
  try {
    check = checkExercise(exercise, userSql); // run and compare (on separate copies of the database)
  } catch (error) {
    renderMessage(feedback, 'Exercițiul nu a putut fi verificat: ' + error.message, 'error'); // unexpected problem
    return; // stop here, the page keeps working
  }
  renderMessage(feedback, check.message, check.correct ? 'success' : 'error'); // green if correct, red if not
  if (check.result !== null) { // the SQL returned rows
    const resultBox = document.createElement('div'); // box for the user's rows
    resultBox.className = 'results'; // same style as the results of the main editor
    renderResults(resultBox, [check.result]); // show the rows as a table
    feedback.appendChild(resultBox); // add the table under the message
  }
  if (check.correct) { // the answer is correct
    solvedIds.add(exercise.id); // remember that the exercise is solved
    saveSolvedIds(); // save it in the browser
  }
}
