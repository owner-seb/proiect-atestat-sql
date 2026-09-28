/*
  lessons.js - the text of the 9 Oracle SQL lessons and their exercises (data only, no logic).
  Used by: index.html (main.js shows the lessons, checker.js checks the exercises).
  Shape of one lesson:
    { id, title, blocks, exercises }
    blocks:    { type: 'p', text } | { type: 'list', items: [text] } | { type: 'example', sql, explanation }
    exercises: { id, statement, solution, orderMatters, checkQuery?, hint }
  Text written between `backticks` is shown as code on the page.
  All SQL is written inside template literals (`...`), so it can contain 'single quotes' and several lines.
  Every text is written in single quotes; a quote inside a text is written as \'.
*/

export const LESSONS = [
  // Lesson 1: what a relational database is, the SELECT command and the DUAL table
  {
    id: 'introducere',
    title: 'Introducere: tabele, SELECT și DUAL',
    blocks: [
      { type: 'p', text: 'O bază de date relațională păstrează datele în tabele. Fiecare tabel are coloane (de exemplu `nume`, `prenume`) și rânduri (câte un rând pentru fiecare elev, profesor sau notă). Baza noastră de date descrie un liceu și are tabelele `profesori`, `clase`, `materii`, `elevi` și `note`.' },
      { type: 'p', text: 'SQL (Structured Query Language) este limbajul folosit pentru a lucra cu aceste date. Comanda cea mai des folosită este `SELECT`, care citește date: după `SELECT` scrii coloanele dorite, iar după `FROM` scrii tabelul din care le iei.' },
      {
        type: 'list',
        items: [
          '`SELECT *` afișează toate coloanele tabelului.',
          '`SELECT nume, prenume` afișează doar coloanele alese, în ordinea în care le scrii.',
          'Poți face calcule direct în `SELECT` cu `+`, `-` și `*`, de exemplu `salariu * 12`.',
          'Cuvintele cheie SQL pot fi scrise cu litere mari sau mici, dar le scriem cu majuscule ca să se vadă ușor.',
        ],
      },
      { type: 'p', text: 'În Oracle, orice `SELECT` trebuie să aibă `FROM`. Când vrei doar un calcul, fără date dintr-un tabel, folosești tabelul special `DUAL`, care are un singur rând.' },
      { type: 'example', sql: `SELECT * FROM clase;`, explanation: 'Afișează toate coloanele și toate rândurile din tabelul `clase`.' },
      { type: 'example', sql: `SELECT nume, prenume, salariu, salariu * 12 FROM profesori;`, explanation: 'Afișează fiecare profesor cu salariul lunar și salariul pe un an.' },
      { type: 'example', sql: `SELECT 2 + 3 * 4 FROM DUAL;`, explanation: 'Face un calcul simplu cu ajutorul tabelului `DUAL` (înmulțirea se face înaintea adunării).' },
    ],
    exercises: [
      // Exercise 1.1: choose some columns from one table
      {
        id: 'introducere-1',
        statement: 'Afișează numele, prenumele și orașul tuturor elevilor.',
        solution: `SELECT nume, prenume, oras FROM elevi;`,
        orderMatters: false,
        hint: 'Scrie coloanele după `SELECT`, separate prin virgulă, iar tabelul `elevi` după `FROM`.',
      },
      // Exercise 1.2: all columns with *
      {
        id: 'introducere-2',
        statement: 'Afișează toate coloanele din tabelul `materii`.',
        solution: `SELECT * FROM materii;`,
        orderMatters: false,
        hint: 'Steluța `*` înseamnă „toate coloanele”.',
      },
      // Exercise 1.3: arithmetic expression on a column
      {
        id: 'introducere-3',
        statement: 'Afișează numele, prenumele și salariul pe un an (salariul lunar înmulțit cu 12) al fiecărui profesor.',
        solution: `SELECT nume, prenume, salariu * 12 FROM profesori;`,
        orderMatters: false,
        hint: 'Poți scrie calculul `salariu * 12` direct în lista de coloane.',
      },
      // Exercise 1.4: a calculation with the DUAL table
      {
        id: 'introducere-4',
        statement: 'Calculează rezultatul expresiei 25 * 4 + 7 folosind tabelul `DUAL`.',
        solution: `SELECT 25 * 4 + 7 FROM DUAL;`,
        orderMatters: false,
        hint: 'În Oracle, un calcul fără tabel se scrie `SELECT expresie FROM DUAL;`.',
      },
    ],
  },

  // Lesson 2: filtering rows with WHERE and the comparison operators
  {
    id: 'filtrare',
    title: 'Filtrarea rândurilor: WHERE, LIKE, BETWEEN, IN, IS NULL',
    blocks: [
      { type: 'p', text: 'Clauza `WHERE` păstrează doar rândurile care respectă o condiție. Se scrie după `FROM`.' },
      {
        type: 'list',
        items: [
          '`=`, `<>` (diferit), `<`, `>`, `<=`, `>=` compară două valori.',
          '`BETWEEN a AND b` este adevărat când valoarea este între a și b, inclusiv capetele.',
          '`IN (v1, v2, ...)` este adevărat când valoarea este una dintre cele din listă.',
          '`LIKE` caută după un model: `%` înseamnă „oricâte caractere”, iar `_` înseamnă „exact un caracter”.',
          '`IS NULL` și `IS NOT NULL` verifică dacă o valoare lipsește.',
          '`AND`, `OR` și `NOT` combină mai multe condiții.',
        ],
      },
      { type: 'p', text: 'Textele se scriu între apostrofuri, de exemplu `\'12A\'`. În Oracle, textul ține cont de literele mari și mici: `\'popescu\'` nu este același lucru cu `\'Popescu\'`. Datele calendaristice se compară folosind `TO_DATE`, de exemplu `TO_DATE(\'2009-01-01\', \'YYYY-MM-DD\')`.' },
      { type: 'p', text: 'Atenție: `NULL` înseamnă „valoare necunoscută”. Condiția `email = NULL` nu este adevărată niciodată; corect este `email IS NULL`.' },
      { type: 'example', sql: `SELECT nume, an_studiu, profil FROM clase WHERE an_studiu = 12;`, explanation: 'Afișează doar clasele din anul 12 de studiu.' },
      { type: 'example', sql: `SELECT nume, prenume FROM elevi WHERE prenume LIKE 'A%';`, explanation: 'Afișează elevii al căror prenume începe cu litera A.' },
      {
        type: 'example',
        sql: `SELECT nume, prenume, data_nasterii
FROM elevi
WHERE data_nasterii >= TO_DATE('2009-01-01', 'YYYY-MM-DD');`,
        explanation: 'Afișează elevii născuți începând cu 1 ianuarie 2009.',
      },
    ],
    exercises: [
      // Exercise 2.1: IS NULL
      {
        id: 'filtrare-1',
        statement: 'Afișează numele și prenumele elevilor care nu au adresă de email.',
        solution: `SELECT nume, prenume FROM elevi WHERE email IS NULL;`,
        orderMatters: false,
        hint: 'O valoare lipsă se verifică cu `IS NULL`, nu cu `= NULL`.',
      },
      // Exercise 2.2: BETWEEN
      {
        id: 'filtrare-2',
        statement: 'Afișează `id_elev`, `id_materie` și `nota` pentru toate notele cuprinse între 5 și 7, inclusiv.',
        solution: `SELECT id_elev, id_materie, nota FROM note WHERE nota BETWEEN 5 AND 7;`,
        orderMatters: false,
        hint: '`BETWEEN 5 AND 7` include și valorile 5 și 7.',
      },
      // Exercise 2.3: IN with a list of values
      {
        id: 'filtrare-3',
        statement: 'Afișează numele și profilul claselor din anii de studiu 11 și 12, folosind operatorul `IN`.',
        solution: `SELECT nume, profil FROM clase WHERE an_studiu IN (11, 12);`,
        orderMatters: false,
        hint: 'Scrie valorile căutate între paranteze: `an_studiu IN (11, 12)`.',
      },
      // Exercise 2.4: LIKE with the % wildcard
      {
        id: 'filtrare-4',
        statement: 'Afișează numele și prenumele elevilor al căror nume de familie începe cu litera P (majusculă).',
        solution: `SELECT nume, prenume FROM elevi WHERE nume LIKE 'P%';`,
        orderMatters: false,
        hint: 'Folosește `LIKE` cu modelul `\'P%\'`: litera P urmată de oricâte caractere.',
      },
    ],
  },

  // Lesson 3: sorting, removing duplicates, column aliases and text concatenation
  {
    id: 'sortare',
    title: 'ORDER BY, DISTINCT, aliasuri și concatenare',
    blocks: [
      { type: 'p', text: '`ORDER BY` sortează rezultatul și este ultima clauză dintr-un `SELECT`. `ASC` înseamnă crescător (este ordinea implicită), iar `DESC` înseamnă descrescător. Poți sorta după mai multe coloane: a doua coloană contează doar când valorile din prima sunt egale.' },
      { type: 'p', text: '`DISTINCT`, scris imediat după `SELECT`, elimină rândurile care se repetă: `SELECT DISTINCT oras FROM elevi` afișează fiecare oraș o singură dată.' },
      { type: 'p', text: 'Un alias dă un nume nou unei coloane din rezultat: `salariu * 12 AS salariu_anual`. Dacă aliasul conține spații, se scrie între ghilimele: `AS "Salariu anual"`. Aliasul poate fi folosit în `ORDER BY`, dar nu în `WHERE`.' },
      { type: 'p', text: 'Operatorul `||` lipește (concatenează) texte: `nume || \' \' || prenume` formează numele complet, cu un spațiu la mijloc.' },
      { type: 'example', sql: `SELECT nume, prenume, salariu FROM profesori ORDER BY salariu DESC;`, explanation: 'Afișează profesorii începând cu cel care are salariul cel mai mare.' },
      { type: 'example', sql: `SELECT DISTINCT an_studiu FROM clase ORDER BY an_studiu;`, explanation: 'Afișează fiecare an de studiu o singură dată, crescător.' },
      {
        type: 'example',
        sql: `SELECT nume || ' ' || prenume AS "Nume complet", salariu * 12 AS salariu_anual
FROM profesori
ORDER BY salariu_anual DESC;`,
        explanation: 'Folosește concatenarea și aliasuri, apoi sortează după alias.',
      },
    ],
    exercises: [
      // Exercise 3.1: ORDER BY on two columns (id_profesor breaks ties)
      {
        id: 'sortare-1',
        statement: 'Afișează numele, prenumele și salariul profesorilor, ordonați descrescător după salariu. La salarii egale, ordonează crescător după `id_profesor`.',
        solution: `SELECT nume, prenume, salariu
FROM profesori
ORDER BY salariu DESC, id_profesor;`,
        orderMatters: true,
        hint: 'Scrie două coloane după `ORDER BY`, separate prin virgulă: `salariu DESC, id_profesor`.',
      },
      // Exercise 3.2: DISTINCT
      {
        id: 'sortare-2',
        statement: 'Afișează, o singură dată, fiecare oraș din care provin elevii.',
        solution: `SELECT DISTINCT oras FROM elevi;`,
        orderMatters: false,
        hint: 'Scrie `DISTINCT` imediat după `SELECT`.',
      },
      // Exercise 3.3: concatenation, alias and sorting by the alias
      {
        id: 'sortare-3',
        statement: 'Afișează într-o singură coloană, numită `nume_complet`, numele și prenumele fiecărui elev, despărțite de un spațiu. Ordonează alfabetic după `nume_complet`, iar la valori egale după `id_elev`.',
        solution: `SELECT nume || ' ' || prenume AS nume_complet
FROM elevi
ORDER BY nume_complet, id_elev;`,
        orderMatters: true,
        hint: 'Lipește textele cu `||`: `nume || \' \' || prenume`, apoi dă-i aliasul cu `AS`.',
      },
    ],
  },

  // Lesson 4: single-row functions (text, numbers, dates, NVL)
  {
    id: 'functii-single-row',
    title: 'Funcții single-row: caractere, numere, date, NVL',
    blocks: [
      { type: 'p', text: 'O funcție single-row primește valori dintr-un rând și întoarce un rezultat pentru fiecare rând. Se poate folosi în `SELECT`, `WHERE` și `ORDER BY`.' },
      {
        type: 'list',
        items: [
          '`UPPER`, `LOWER` și `INITCAP` schimbă literele în majuscule, minuscule sau prima literă mare.',
          '`LENGTH(text)` dă numărul de caractere, iar `SUBSTR(text, poziție, lungime)` extrage o bucată din text (numărarea începe de la 1).',
          '`INSTR(text, caracter)` dă poziția la care apare caracterul în text.',
          '`LPAD` și `RPAD` completează un text până la o lungime dată, `TRIM` șterge spațiile de la capete, iar `REPLACE` înlocuiește o bucată de text.',
          '`ROUND(n, z)` rotunjește la z zecimale, `TRUNC(n, z)` taie zecimalele fără rotunjire, iar `MOD(a, b)` dă restul împărțirii lui a la b.',
        ],
      },
      {
        type: 'list',
        items: [
          '`SYSDATE` este data de azi.',
          '`ADD_MONTHS(data, n)` adună n luni la o dată, iar `MONTHS_BETWEEN(d1, d2)` dă numărul de luni dintre două date.',
          '`TO_CHAR(data, \'DD.MM.YYYY\')` transformă o dată în text, iar `TO_DATE(\'2008-05-12\', \'YYYY-MM-DD\')` transformă un text în dată.',
        ],
      },
      { type: 'p', text: '`NVL(expresie, valoare)` înlocuiește un `NULL` cu valoarea aleasă. `NVL2(expresie, valoare1, valoare2)` întoarce valoare1 dacă expresia nu este `NULL` și valoare2 dacă este `NULL`.' },
      {
        type: 'example',
        sql: `SELECT nume, UPPER(nume), LENGTH(nume), SUBSTR(prenume, 1, 1) AS initiala, NVL(email, 'fără email') AS contact
FROM elevi;`,
        explanation: 'Funcții pentru texte și `NVL`, aplicate pe fiecare elev.',
      },
      {
        type: 'example',
        sql: `SELECT ROUND(15.678, 1), TRUNC(15.678, 1), MOD(17, 5), INITCAP('liceul teoretic'), LPAD('7', 3, '0')
FROM DUAL;`,
        explanation: 'Funcții pentru numere și texte, încercate pe tabelul `DUAL`.',
      },
      {
        type: 'example',
        sql: `SELECT nume, TO_CHAR(data_angajarii, 'DD.MM.YYYY') AS angajat, ADD_MONTHS(data_angajarii, 6) AS dupa_6_luni,
  TRUNC(MONTHS_BETWEEN(SYSDATE, data_angajarii)) AS luni_vechime
FROM profesori;`,
        explanation: 'Funcții pentru date: formatarea datei, adunarea de luni și vechimea în luni până azi.',
      },
    ],
    exercises: [
      // Exercise 4.1: UPPER and LENGTH
      {
        id: 'functii-single-row-1',
        statement: 'Afișează numele fiecărui elev scris cu majuscule și, alături, lungimea numelui.',
        solution: `SELECT UPPER(nume), LENGTH(nume) FROM elevi;`,
        orderMatters: false,
        hint: 'Folosește `UPPER(nume)` și `LENGTH(nume)`.',
      },
      // Exercise 4.2: SUBSTR and concatenation (initials)
      {
        id: 'functii-single-row-2',
        statement: 'Afișează inițialele fiecărui elev într-o singură coloană: prima literă a prenumelui urmată de prima literă a numelui (de exemplu, Ana Popescu devine AP).',
        solution: `SELECT SUBSTR(prenume, 1, 1) || SUBSTR(nume, 1, 1) AS initiale FROM elevi;`,
        orderMatters: false,
        hint: '`SUBSTR(prenume, 1, 1)` dă prima literă; lipește cele două litere cu `||`.',
      },
      // Exercise 4.3: NVL replaces a missing email
      {
        id: 'functii-single-row-3',
        statement: 'Afișează numele, prenumele și emailul fiecărui elev. Dacă elevul nu are email, afișează textul `fără email`.',
        solution: `SELECT nume, prenume, NVL(email, 'fără email') FROM elevi;`,
        orderMatters: false,
        hint: 'Folosește `NVL(email, \'fără email\')`.',
      },
      // Exercise 4.4: TO_CHAR with the 'YYYY' format
      {
        id: 'functii-single-row-4',
        statement: 'Afișează numele, prenumele și anul nașterii fiecărui elev (doar anul, obținut cu `TO_CHAR` și formatul `YYYY`).',
        solution: `SELECT nume, prenume, TO_CHAR(data_nasterii, 'YYYY') FROM elevi;`,
        orderMatters: false,
        hint: 'Scrie `TO_CHAR(data_nasterii, \'YYYY\')`.',
      },
    ],
  },

  // Lesson 5: group functions, GROUP BY and HAVING
  {
    id: 'functii-grup',
    title: 'Funcții de grup: COUNT, SUM, AVG, MIN, MAX, GROUP BY, HAVING',
    blocks: [
      { type: 'p', text: 'Funcțiile de grup calculează un singur rezultat din mai multe rânduri: `COUNT` numără, `SUM` adună, `AVG` calculează media, iar `MIN` și `MAX` găsesc cea mai mică și cea mai mare valoare.' },
      { type: 'p', text: '`COUNT(*)` numără toate rândurile, iar `COUNT(coloană)` numără doar valorile care nu sunt `NULL`. În afară de `COUNT(*)`, toate funcțiile de grup ignoră valorile `NULL`.' },
      { type: 'p', text: '`GROUP BY` împarte rândurile în grupuri și calculează funcția separat pentru fiecare grup. Regula din Oracle: orice coloană din `SELECT` care nu este într-o funcție de grup trebuie scrisă și în `GROUP BY`.' },
      { type: 'p', text: '`HAVING` filtrează grupurile după ce au fost calculate, de exemplu `HAVING COUNT(*) > 5`. `WHERE` filtrează rândurile înainte de grupare și nu poate conține funcții de grup.' },
      { type: 'example', sql: `SELECT COUNT(*), MIN(salariu), MAX(salariu), ROUND(AVG(salariu), 2) FROM profesori;`, explanation: 'Numărul de profesori, cel mai mic și cel mai mare salariu și salariul mediu.' },
      {
        type: 'example',
        sql: `SELECT id_materie, COUNT(*) AS numar_note, ROUND(AVG(nota), 2) AS medie
FROM note
GROUP BY id_materie
ORDER BY id_materie;`,
        explanation: 'Pentru fiecare materie: câte note s-au dat și media lor.',
      },
      {
        type: 'example',
        sql: `SELECT id_clasa, COUNT(*) AS numar_elevi
FROM elevi
GROUP BY id_clasa
HAVING COUNT(*) >= 5;`,
        explanation: 'Afișează doar clasele care au cel puțin 5 elevi.',
      },
    ],
    exercises: [
      // Exercise 5.1: COUNT(column) skips NULL values
      {
        id: 'functii-grup-1',
        statement: 'Câți elevi au adresa de email completată? Afișează un singur număr.',
        solution: `SELECT COUNT(email) FROM elevi;`,
        orderMatters: false,
        hint: '`COUNT(email)` numără doar rândurile în care `email` nu este `NULL`.',
      },
      // Exercise 5.2: GROUP BY with COUNT(*)
      {
        id: 'functii-grup-2',
        statement: 'Afișează `id_clasa` și numărul de elevi din fiecare clasă.',
        solution: `SELECT id_clasa, COUNT(*) FROM elevi GROUP BY id_clasa;`,
        orderMatters: false,
        hint: 'Grupează după `id_clasa` și numără rândurile cu `COUNT(*)`.',
      },
      // Exercise 5.3: GROUP BY with AVG and ROUND
      {
        id: 'functii-grup-3',
        statement: 'Afișează `id_materie` și media notelor la fiecare materie, rotunjită la 2 zecimale.',
        solution: `SELECT id_materie, ROUND(AVG(nota), 2) FROM note GROUP BY id_materie;`,
        orderMatters: false,
        hint: 'Folosește `ROUND(AVG(nota), 2)` și `GROUP BY id_materie`.',
      },
      // Exercise 5.4: HAVING filters the groups
      {
        id: 'functii-grup-4',
        statement: 'Afișează `id_elev` și media notelor (rotunjită la 2 zecimale) pentru elevii care au media cel puțin 8.',
        solution: `SELECT id_elev, ROUND(AVG(nota), 2)
FROM note
GROUP BY id_elev
HAVING AVG(nota) >= 8;`,
        orderMatters: false,
        hint: 'Condiția pe medie se scrie în `HAVING`, nu în `WHERE`: `HAVING AVG(nota) >= 8`.',
      },
    ],
  },

  // Lesson 6: joining tables (INNER JOIN, LEFT OUTER JOIN, self-join)
  {
    id: 'join',
    title: 'Unirea tabelelor: JOIN, LEFT OUTER JOIN, self-join',
    blocks: [
      { type: 'p', text: 'Datele sunt împărțite în mai multe tabele, legate prin chei. De exemplu, `elevi.id_clasa` arată spre `clase.id_clasa`. `JOIN` pune alături rândurile care se potrivesc, după condiția scrisă la `ON`.' },
      { type: 'p', text: 'Ca să scrii mai puțin, dai fiecărui tabel un alias scurt: `FROM elevi e JOIN clase c ON e.id_clasa = c.id_clasa`. În Oracle, aliasul unui tabel se scrie fără `AS`.' },
      {
        type: 'list',
        items: [
          '`JOIN` (sau `INNER JOIN`) păstrează doar rândurile care au pereche în ambele tabele.',
          '`LEFT OUTER JOIN` (sau `LEFT JOIN`) păstrează toate rândurile din tabelul din stânga; unde nu există pereche, coloanele din tabelul din dreapta sunt `NULL`.',
          'Self-join: un tabel unit cu el însuși, folosind două aliasuri diferite. De exemplu, fiecare profesor și șeful lui, ambii din tabelul `profesori`.',
        ],
      },
      {
        type: 'example',
        sql: `SELECT e.nume, e.prenume, c.nume AS clasa
FROM elevi e JOIN clase c ON e.id_clasa = c.id_clasa;`,
        explanation: 'Afișează fiecare elev împreună cu numele clasei lui.',
      },
      {
        type: 'example',
        sql: `SELECT c.nume AS clasa, p.nume AS diriginte
FROM clase c LEFT OUTER JOIN profesori p ON c.id_diriginte = p.id_profesor;`,
        explanation: 'Toate clasele cu dirigintele lor; clasa fără diriginte apare și ea, cu `NULL`.',
      },
      {
        type: 'example',
        sql: `SELECT p.nume, p.prenume, s.nume AS sef
FROM profesori p JOIN profesori s ON p.id_sef = s.id_profesor;`,
        explanation: 'Self-join: fiecare profesor care are șef, alături de numele șefului.',
      },
    ],
    exercises: [
      // Exercise 6.1: INNER JOIN between two tables
      {
        id: 'join-1',
        statement: 'Afișează denumirea fiecărei materii, împreună cu numele și prenumele profesorului care o predă.',
        solution: `SELECT m.denumire, p.nume, p.prenume
FROM materii m JOIN profesori p ON m.id_profesor = p.id_profesor;`,
        orderMatters: false,
        hint: 'Leagă tabelele prin coloana comună: `m.id_profesor = p.id_profesor`.',
      },
      // Exercise 6.2: joining three tables
      {
        id: 'join-2',
        statement: 'Pentru fiecare notă, afișează numele și prenumele elevului, denumirea materiei și nota.',
        solution: `SELECT e.nume, e.prenume, m.denumire, n.nota
FROM note n
JOIN elevi e ON n.id_elev = e.id_elev
JOIN materii m ON n.id_materie = m.id_materie;`,
        orderMatters: false,
        hint: 'Pornește de la `note` și adaugă două `JOIN`-uri: unul cu `elevi` și unul cu `materii`.',
      },
      // Exercise 6.3: LEFT OUTER JOIN to find rows without a match
      {
        id: 'join-3',
        statement: 'Afișează numele și prenumele elevilor care nu au nicio notă. Folosește `LEFT OUTER JOIN`.',
        solution: `SELECT e.nume, e.prenume
FROM elevi e LEFT OUTER JOIN note n ON e.id_elev = n.id_elev
WHERE n.id_nota IS NULL;`,
        orderMatters: false,
        hint: 'După `LEFT OUTER JOIN`, elevii fără note au `NULL` în coloanele din `note`; păstrează-i cu `WHERE n.id_nota IS NULL`.',
      },
      // Exercise 6.4: self-join on profesori (id_sef)
      {
        id: 'join-4',
        statement: 'Afișează numele și prenumele fiecărui profesor care are un șef, alături de numele și prenumele șefului său.',
        solution: `SELECT p.nume, p.prenume, s.nume, s.prenume
FROM profesori p JOIN profesori s ON p.id_sef = s.id_profesor;`,
        orderMatters: false,
        hint: 'Folosește tabelul `profesori` de două ori, cu aliasurile `p` (profesorul) și `s` (șeful): `p.id_sef = s.id_profesor`.',
      },
    ],
  },

  // Lesson 7: subqueries (single-row, multiple-row, EXISTS)
  {
    id: 'subinterogari',
    title: 'Subinterogări',
    blocks: [
      { type: 'p', text: 'O subinterogare este un `SELECT` scris între paranteze, în interiorul altei comenzi. O subinterogare simplă este calculată întâi, iar rezultatul ei este folosit apoi în interogarea principală.' },
      {
        type: 'list',
        items: [
          'Subinterogarea single-row întoarce o singură valoare și se folosește cu `=`, `>`, `<` și ceilalți operatori de comparație. Exemplu: `salariu > (SELECT AVG(salariu) FROM profesori)`.',
          'Subinterogarea multiple-row întoarce o listă de valori și se folosește cu `IN` sau `NOT IN`.',
          '`EXISTS (subinterogare)` este adevărat dacă subinterogarea întoarce măcar un rând. Aici subinterogarea folosește coloane din interogarea principală, așa că este calculată din nou pentru fiecare rând (subinterogare corelată).',
        ],
      },
      { type: 'p', text: 'Atenție la `NOT IN`: dacă lista întoarsă de subinterogare conține un `NULL`, rezultatul este gol. Elimină valorile `NULL` din subinterogare cu `WHERE coloană IS NOT NULL`.' },
      {
        type: 'example',
        sql: `SELECT nume, prenume, salariu
FROM profesori
WHERE salariu > (SELECT AVG(salariu) FROM profesori);`,
        explanation: 'Profesorii care au salariul mai mare decât media tuturor profesorilor.',
      },
      {
        type: 'example',
        sql: `SELECT nume, prenume
FROM elevi
WHERE id_clasa IN (SELECT id_clasa FROM clase WHERE an_studiu = 12);`,
        explanation: 'Elevii din clasele a XII-a (subinterogarea întoarce mai multe clase).',
      },
      {
        type: 'example',
        sql: `SELECT m.denumire
FROM materii m
WHERE EXISTS (SELECT * FROM note n WHERE n.id_materie = m.id_materie AND n.nota = 10);`,
        explanation: 'Materiile la care s-a dat cel puțin un 10.',
      },
    ],
    exercises: [
      // Exercise 7.1: single-row subquery with MAX
      {
        id: 'subinterogari-1',
        statement: 'Afișează numele, prenumele și salariul profesorului (sau profesorilor) cu cel mai mare salariu.',
        solution: `SELECT nume, prenume, salariu
FROM profesori
WHERE salariu = (SELECT MAX(salariu) FROM profesori);`,
        orderMatters: false,
        hint: 'Găsește salariul maxim cu o subinterogare: `(SELECT MAX(salariu) FROM profesori)`.',
      },
      // Exercise 7.2: single-row subquery that finds an id by name
      {
        id: 'subinterogari-2',
        statement: 'Afișează numele și prenumele elevilor din clasa `11A`. Folosește o subinterogare care găsește `id_clasa` după numele clasei.',
        solution: `SELECT nume, prenume
FROM elevi
WHERE id_clasa = (SELECT id_clasa FROM clase WHERE nume = '11A');`,
        orderMatters: false,
        hint: 'Subinterogarea este `(SELECT id_clasa FROM clase WHERE nume = \'11A\')`.',
      },
      // Exercise 7.3: multiple-row subquery with IN
      {
        id: 'subinterogari-3',
        statement: 'Afișează numele și prenumele elevilor care au primit cel puțin o notă de 10.',
        solution: `SELECT nume, prenume
FROM elevi
WHERE id_elev IN (SELECT id_elev FROM note WHERE nota = 10);`,
        orderMatters: false,
        hint: 'Subinterogarea întoarce lista `id_elev` din `note` unde `nota = 10`; folosește `IN`.',
      },
      // Exercise 7.4: NOT IN and the NULL trap (one class has no homeroom teacher)
      {
        id: 'subinterogari-4',
        statement: 'Afișează numele și prenumele profesorilor care nu sunt diriginți la nicio clasă.',
        solution: `SELECT nume, prenume
FROM profesori
WHERE id_profesor NOT IN (SELECT id_diriginte FROM clase WHERE id_diriginte IS NOT NULL);`,
        orderMatters: false,
        hint: 'O clasă nu are diriginte (`id_diriginte` este `NULL`). Dacă ai primit un rezultat gol, adaugă în subinterogare `WHERE id_diriginte IS NOT NULL`.',
      },
    ],
  },

  // Lesson 8: DML commands that change data (INSERT, UPDATE, DELETE)
  {
    id: 'dml',
    title: 'DML: INSERT, UPDATE, DELETE',
    blocks: [
      { type: 'p', text: 'Comenzile DML (Data Manipulation Language) modifică datele din tabele: `INSERT` adaugă rânduri, `UPDATE` modifică valori, iar `DELETE` șterge rânduri.' },
      {
        type: 'list',
        items: [
          '`INSERT INTO tabel (col1, col2) VALUES (v1, v2)` adaugă un rând. Coloanele care nu sunt scrise primesc `NULL`.',
          '`UPDATE tabel SET coloană = valoare WHERE condiție` modifică rândurile care respectă condiția.',
          '`DELETE FROM tabel WHERE condiție` șterge rândurile care respectă condiția.',
        ],
      },
      { type: 'p', text: 'Fără `WHERE`, `UPDATE` și `DELETE` se aplică pe toate rândurile din tabel! Verifică mai întâi condiția cu un `SELECT`.' },
      { type: 'p', text: 'Constrângerile protejează datele: nu poți adăuga un elev într-o clasă care nu există și nu poți șterge un elev care are note. În Oracle, modificările se salvează definitiv cu `COMMIT` sau se anulează cu `ROLLBACK`. Aici modificările se aplică imediat, iar butonul „Resetează baza de date” readuce datele inițiale.' },
      {
        type: 'example',
        sql: `INSERT INTO materii (id_materie, denumire, ore_pe_saptamana, id_profesor)
VALUES (50, 'Astronomie', 1, NULL);`,
        explanation: 'Adaugă materia Astronomie. A doua rulare dă eroare, pentru că `id_materie` 50 există deja.',
      },
      { type: 'example', sql: `UPDATE materii SET ore_pe_saptamana = 2 WHERE id_materie = 50;`, explanation: 'Modifică numărul de ore pentru materia adăugată mai sus.' },
      { type: 'example', sql: `DELETE FROM materii WHERE id_materie = 50;`, explanation: 'Șterge materia adăugată mai sus.' },
    ],
    exercises: [
      // Exercise 8.1: INSERT with a column list and TO_DATE (email is left out, so it becomes NULL)
      {
        id: 'dml-1',
        statement: 'Adaugă eleva Maria Ionescu, cu `id_elev` 900, născută pe 15 martie 2009, din orașul Brașov, fără email, în clasa cu `id_clasa` 1. Folosește `TO_DATE` pentru data nașterii.',
        solution: `INSERT INTO elevi (id_elev, nume, prenume, data_nasterii, oras, id_clasa)
VALUES (900, 'Ionescu', 'Maria', TO_DATE('2009-03-15', 'YYYY-MM-DD'), 'Brașov', 1);`,
        orderMatters: false,
        checkQuery: `SELECT * FROM elevi ORDER BY id_elev;`,
        hint: 'Scrie coloanele între paranteze după numele tabelului, apoi valorile în aceeași ordine după `VALUES`. Coloana `email` o poți lăsa deoparte.',
      },
      // Exercise 8.2: UPDATE with a WHERE condition on NULL
      {
        id: 'dml-2',
        statement: 'Mărește cu 500 salariul profesorilor care nu au șef (`id_sef` este `NULL`).',
        solution: `UPDATE profesori SET salariu = salariu + 500 WHERE id_sef IS NULL;`,
        orderMatters: false,
        checkQuery: `SELECT * FROM profesori ORDER BY id_profesor;`,
        hint: 'Folosește `SET salariu = salariu + 500` și condiția `WHERE id_sef IS NULL`.',
      },
      // Exercise 8.3: DELETE with a WHERE condition
      {
        id: 'dml-3',
        statement: 'Șterge toate notele mai mici decât 5.',
        solution: `DELETE FROM note WHERE nota < 5;`,
        orderMatters: false,
        checkQuery: `SELECT * FROM note ORDER BY id_nota;`,
        hint: 'Scrie `DELETE FROM note` urmat de condiția `WHERE nota < 5`.',
      },
    ],
  },

  // Lesson 9: DDL - creating tables with Oracle data types and named constraints
  {
    id: 'ddl',
    title: 'DDL: CREATE TABLE, tipuri de date și constrângeri',
    blocks: [
      { type: 'p', text: 'Comenzile DDL (Data Definition Language) creează sau modifică structura bazei de date. `CREATE TABLE` creează un tabel nou: pentru fiecare coloană scrii numele și tipul de date.' },
      {
        type: 'list',
        items: [
          '`NUMBER(p, s)` este un număr cu cel mult p cifre, dintre care s după virgulă (de exemplu `NUMBER(7,2)` pentru salarii).',
          '`VARCHAR2(n)` este un text de cel mult n caractere.',
          '`DATE` este o dată calendaristică.',
        ],
      },
      {
        type: 'list',
        items: [
          '`PRIMARY KEY` identifică unic fiecare rând (valoarea este unică și obligatorie).',
          '`FOREIGN KEY ... REFERENCES` cere ca valoarea să existe în alt tabel.',
          '`NOT NULL` face coloana obligatorie.',
          '`UNIQUE` nu permite valori repetate.',
          '`CHECK (condiție)` cere ca fiecare valoare să respecte condiția.',
        ],
      },
      { type: 'p', text: 'Fiecare constrângere primește un nume cu `CONSTRAINT nume`, ca mesajele de eroare să fie ușor de înțeles. Convenția folosită aici este `tabel_coloană_tip`, de exemplu `cluburi_pk` sau `cluburi_denumire_uk`. Un tabel se șterge cu `DROP TABLE nume_tabel`.' },
      {
        type: 'example',
        sql: `CREATE TABLE cluburi (
  id_club NUMBER(4) CONSTRAINT cluburi_pk PRIMARY KEY,
  denumire VARCHAR2(40) CONSTRAINT cluburi_denumire_nn NOT NULL,
  id_profesor NUMBER(4),
  CONSTRAINT cluburi_denumire_uk UNIQUE (denumire),
  CONSTRAINT cluburi_profesor_fk FOREIGN KEY (id_profesor) REFERENCES profesori (id_profesor)
);`,
        explanation: 'Creează tabelul `cluburi`. A doua rulare dă eroare, pentru că tabelul există deja (folosește resetarea bazei de date).',
      },
      {
        type: 'example',
        sql: `INSERT INTO cluburi (id_club, denumire, id_profesor) VALUES (1, 'Robotică', 1);`,
        explanation: 'Adaugă un club în tabelul creat mai sus; profesorul 1 trebuie să existe, din cauza cheii străine.',
      },
    ],
    exercises: [
      // Exercise 9.1: simple table with a named primary key, then two rows
      {
        id: 'ddl-1',
        statement: 'Creează tabelul `cercuri` cu coloanele `id_cerc` (`NUMBER(3)`, cheie primară numită `cercuri_pk`), `denumire` (`VARCHAR2(40)`, obligatorie) și `zi_saptamana` (`VARCHAR2(10)`). Apoi adaugă două rânduri: (1, Șah, Luni) și (2, Informatică, Joi).',
        solution: `CREATE TABLE cercuri (
  id_cerc NUMBER(3) CONSTRAINT cercuri_pk PRIMARY KEY,
  denumire VARCHAR2(40) CONSTRAINT cercuri_denumire_nn NOT NULL,
  zi_saptamana VARCHAR2(10)
);
INSERT INTO cercuri (id_cerc, denumire, zi_saptamana) VALUES (1, 'Șah', 'Luni');
INSERT INTO cercuri (id_cerc, denumire, zi_saptamana) VALUES (2, 'Informatică', 'Joi');`,
        orderMatters: false,
        // hidden check: the rows, plus 1/0 flags that show whether the constraints exist (SQLite introspection)
        checkQuery: `SELECT id_cerc, denumire, zi_saptamana,
  -- 1 if id_cerc is the primary key
  (SELECT COUNT(*) FROM pragma_table_info('cercuri') WHERE LOWER(name) = 'id_cerc' AND pk > 0) AS are_pk,
  -- 1 if denumire is NOT NULL
  (SELECT COUNT(*) FROM pragma_table_info('cercuri') WHERE LOWER(name) = 'denumire' AND "notnull" = 1) AS denumire_nn
FROM cercuri;`,
        hint: 'Scrie întâi `CREATE TABLE cercuri (...);`, apoi câte un `INSERT` pentru fiecare rând. Separă comenzile cu `;`. Se verifică cheia primară și `NOT NULL`; numele constrângerilor nu sunt verificate, dar este bine să le scrii.',
      },
      // Exercise 9.2: foreign key to elevi and a CHECK constraint
      {
        id: 'ddl-2',
        statement: 'Creează tabelul `olimpiade` cu coloanele `id_olimpiada` (`NUMBER(4)`, cheie primară), `id_elev` (`NUMBER(5)`, cheie străină spre `elevi`), `disciplina` (`VARCHAR2(30)`, obligatorie) și `punctaj` (`NUMBER(5,2)`, între 0 și 100, verificat cu `CHECK`). Dă un nume fiecărei constrângeri. Apoi adaugă rândul: olimpiada 1, elevul cu `id_elev` 1, disciplina Informatică, punctajul 87.5.',
        solution: `CREATE TABLE olimpiade (
  id_olimpiada NUMBER(4) CONSTRAINT olimpiade_pk PRIMARY KEY,
  id_elev NUMBER(5),
  disciplina VARCHAR2(30) CONSTRAINT olimpiade_disciplina_nn NOT NULL,
  punctaj NUMBER(5,2),
  CONSTRAINT olimpiade_elev_fk FOREIGN KEY (id_elev) REFERENCES elevi (id_elev),
  CONSTRAINT olimpiade_punctaj_ck CHECK (punctaj BETWEEN 0 AND 100)
);
INSERT INTO olimpiade (id_olimpiada, id_elev, disciplina, punctaj) VALUES (1, 1, 'Informatică', 87.5);`,
        orderMatters: false,
        // hidden check: the row, plus 1/0 flags that show whether the constraints exist (SQLite introspection)
        checkQuery: `SELECT id_olimpiada, id_elev, disciplina, punctaj,
  -- 1 if id_olimpiada is the primary key
  (SELECT COUNT(*) FROM pragma_table_info('olimpiade') WHERE LOWER(name) = 'id_olimpiada' AND pk > 0) AS are_pk,
  -- 1 if disciplina is NOT NULL
  (SELECT COUNT(*) FROM pragma_table_info('olimpiade') WHERE LOWER(name) = 'disciplina' AND "notnull" = 1) AS disciplina_nn,
  -- 1 if there is a foreign key from id_elev to the elevi table
  (SELECT COUNT(*) > 0 FROM pragma_foreign_key_list('olimpiade') WHERE LOWER("from") = 'id_elev' AND LOWER("table") = 'elevi') AS are_fk,
  -- 1 if the CREATE TABLE text has a CHECK on punctaj
  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND LOWER(name) = 'olimpiade' AND UPPER(sql) LIKE '%CHECK%PUNCTAJ%') AS are_check
FROM olimpiade;`,
        hint: 'Cheia străină se scrie la final: `CONSTRAINT olimpiade_elev_fk FOREIGN KEY (id_elev) REFERENCES elevi (id_elev)`, iar verificarea: `CHECK (punctaj BETWEEN 0 AND 100)`. Se verifică toate constrângerile cerute, dar nu și numele lor.',
      },
      // Exercise 9.3: UNIQUE and NOT NULL on the same column, CHECK on a number
      {
        id: 'ddl-3',
        statement: 'Creează tabelul `sali` cu coloanele `id_sala` (`NUMBER(3)`, cheie primară), `cod` (`VARCHAR2(10)`, obligatoriu și unic) și `capacitate` (`NUMBER(3)`, mai mare decât 0, verificat cu `CHECK`). Dă un nume fiecărei constrângeri. Apoi adaugă sala 1, cu codul L1 și capacitatea 30.',
        solution: `CREATE TABLE sali (
  id_sala NUMBER(3) CONSTRAINT sali_pk PRIMARY KEY,
  cod VARCHAR2(10) CONSTRAINT sali_cod_nn NOT NULL,
  capacitate NUMBER(3),
  CONSTRAINT sali_cod_uk UNIQUE (cod),
  CONSTRAINT sali_capacitate_ck CHECK (capacitate > 0)
);
INSERT INTO sali (id_sala, cod, capacitate) VALUES (1, 'L1', 30);`,
        orderMatters: false,
        // hidden check: the row, plus 1/0 flags that show whether the constraints exist (SQLite introspection)
        checkQuery: `SELECT id_sala, cod, capacitate,
  -- 1 if id_sala is the primary key
  (SELECT COUNT(*) FROM pragma_table_info('sali') WHERE LOWER(name) = 'id_sala' AND pk > 0) AS are_pk,
  -- 1 if cod is NOT NULL
  (SELECT COUNT(*) FROM pragma_table_info('sali') WHERE LOWER(name) = 'cod' AND "notnull" = 1) AS cod_nn,
  -- 1 if there is a UNIQUE constraint on cod (a unique index that is not the primary key)
  (SELECT COUNT(*) > 0 FROM pragma_index_list('sali') il JOIN pragma_index_info(il.name) ii
   WHERE il."unique" = 1 AND il.origin <> 'pk' AND LOWER(ii.name) = 'cod') AS cod_unique,
  -- 1 if the CREATE TABLE text has a CHECK on capacitate
  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND LOWER(name) = 'sali' AND UPPER(sql) LIKE '%CHECK%CAPACITATE%') AS are_check
FROM sali;`,
        hint: 'O coloană poate avea mai multe constrângeri: `NOT NULL` lângă coloană și `UNIQUE (cod)` la final. Se verifică toate constrângerile cerute, dar nu și numele lor.',
      },
    ],
  },
];
