-- seed.sql - the sample school database: creates the tables and fills them with data.
-- Used by: js/db.js, which runs this file on every new database (main database, reset, exercise checker).
-- Written in Oracle style: VARCHAR2, NUMBER, DATE, named constraints, one INSERT per row.
-- Dates are written as TO_DATE('YYYY-MM-DD', 'YYYY-MM-DD') and stored as text 'YYYY-MM-DD'.
-- Tables are created in dependency order: a table is created only after the tables it points to.

-- ============================================================
-- TABLES
-- ============================================================

-- profesori: the teachers of the school
CREATE TABLE profesori (
  id_profesor    NUMBER(4),                    -- teacher number (primary key)
  nume           VARCHAR2(30) NOT NULL,        -- last name (required)
  prenume        VARCHAR2(30) NOT NULL,        -- first name (required)
  email          VARCHAR2(50),                 -- school email (unique, may be missing)
  data_angajarii DATE,                         -- hire date
  salariu        NUMBER(7,2),                  -- monthly salary in lei, 2 decimals
  id_sef         NUMBER(4),                    -- head of department (another teacher); NULL for the heads
  CONSTRAINT pk_profesori PRIMARY KEY (id_profesor),                                  -- each teacher has a unique id
  CONSTRAINT uq_profesori_email UNIQUE (email),                                       -- no two teachers share an email
  CONSTRAINT fk_profesori_sef FOREIGN KEY (id_sef) REFERENCES profesori (id_profesor) -- the head must be an existing teacher (self-join)
);

-- clase: the classes (9A ... 12B)
CREATE TABLE clase (
  id_clasa     NUMBER(4),                      -- class number (primary key)
  nume         VARCHAR2(10) NOT NULL,          -- class name, e.g. '9A' (required, unique)
  an_studiu    NUMBER(2),                      -- school year: 9, 10, 11 or 12
  profil       VARCHAR2(30),                   -- class profile, e.g. 'Matematică-Informatică'
  id_diriginte NUMBER(4),                      -- homeroom teacher (may be missing)
  CONSTRAINT pk_clase PRIMARY KEY (id_clasa),                                                -- each class has a unique id
  CONSTRAINT uq_clase_nume UNIQUE (nume),                                                    -- no two classes share a name
  CONSTRAINT ck_clase_an_studiu CHECK (an_studiu BETWEEN 9 AND 12),                          -- high school years only
  CONSTRAINT fk_clase_diriginte FOREIGN KEY (id_diriginte) REFERENCES profesori (id_profesor) -- the homeroom teacher must exist
);

-- materii: the school subjects
CREATE TABLE materii (
  id_materie       NUMBER(4),                  -- subject number (primary key)
  denumire         VARCHAR2(40) NOT NULL,      -- subject name (required)
  ore_pe_saptamana NUMBER(2),                  -- hours per week
  id_profesor      NUMBER(4),                  -- teacher of the subject (may be missing)
  CONSTRAINT pk_materii PRIMARY KEY (id_materie),                                            -- each subject has a unique id
  CONSTRAINT fk_materii_profesor FOREIGN KEY (id_profesor) REFERENCES profesori (id_profesor) -- the teacher must exist
);

-- elevi: the students
CREATE TABLE elevi (
  id_elev       NUMBER(5),                     -- student number (primary key)
  nume          VARCHAR2(30) NOT NULL,         -- last name (required)
  prenume       VARCHAR2(30) NOT NULL,         -- first name (required)
  data_nasterii DATE,                          -- birth date
  oras          VARCHAR2(30),                  -- home town
  email         VARCHAR2(50),                  -- email (some students have none)
  id_clasa      NUMBER(4),                     -- the class of the student
  CONSTRAINT pk_elevi PRIMARY KEY (id_elev),                                        -- each student has a unique id
  CONSTRAINT fk_elevi_clasa FOREIGN KEY (id_clasa) REFERENCES clase (id_clasa)      -- the class must exist
);

-- note: the grades of the students
CREATE TABLE note (
  id_nota    NUMBER(6),                        -- grade number (primary key)
  id_elev    NUMBER(5),                        -- the student who got the grade
  id_materie NUMBER(4),                        -- the subject of the grade
  nota       NUMBER(2),                        -- the grade itself, from 1 to 10
  data_notei DATE,                             -- the day the grade was given
  CONSTRAINT pk_note PRIMARY KEY (id_nota),                                            -- each grade has a unique id
  CONSTRAINT fk_note_elev FOREIGN KEY (id_elev) REFERENCES elevi (id_elev),            -- the student must exist
  CONSTRAINT fk_note_materie FOREIGN KEY (id_materie) REFERENCES materii (id_materie), -- the subject must exist
  CONSTRAINT ck_note_nota CHECK (nota BETWEEN 1 AND 10)                                -- grades go from 1 to 10
);

-- ============================================================
-- DATA: profesori
-- columns: id_profesor, nume, prenume, email, data_angajarii, salariu, id_sef
-- ============================================================

-- heads of department (id_sef is NULL): 1 = Matematică-Informatică, 2 = Limbă și comunicare, 3 = Științe
INSERT INTO profesori VALUES (1, 'Ionescu', 'Maria', 'maria.ionescu@liceu.ro', TO_DATE('1998-09-01', 'YYYY-MM-DD'), 7850.00, NULL);
INSERT INTO profesori VALUES (2, 'Popescu', 'Andrei', 'andrei.popescu@liceu.ro', TO_DATE('2001-09-01', 'YYYY-MM-DD'), 7600.00, NULL);
INSERT INTO profesori VALUES (3, 'Dumitrescu', 'Elena', 'elena.dumitrescu@liceu.ro', TO_DATE('2003-09-01', 'YYYY-MM-DD'), 7420.50, NULL);
-- teachers whose head is teacher 1 (Matematică-Informatică)
INSERT INTO profesori VALUES (4, 'Stan', 'Mihai', 'mihai.stan@liceu.ro', TO_DATE('2010-09-01', 'YYYY-MM-DD'), 5980.00, 1);
INSERT INTO profesori VALUES (5, 'Georgescu', 'Ioana', 'ioana.georgescu@liceu.ro', TO_DATE('2012-09-01', 'YYYY-MM-DD'), 6210.75, 1);
INSERT INTO profesori VALUES (11, 'Tudor', 'Alexandru', 'alexandru.tudor@liceu.ro', TO_DATE('2014-09-01', 'YYYY-MM-DD'), 5600.00, 1);
INSERT INTO profesori VALUES (13, 'Nistor', 'Bogdan', 'bogdan.nistor@liceu.ro', TO_DATE('2023-09-01', 'YYYY-MM-DD'), 4380.00, 1);
INSERT INTO profesori VALUES (14, 'Șerban', 'Irina', 'irina.serban@liceu.ro', TO_DATE('2021-09-01', 'YYYY-MM-DD'), 4750.00, 1);
-- teachers whose head is teacher 2 (Limbă și comunicare)
INSERT INTO profesori VALUES (7, 'Constantinescu', 'Ana', 'ana.constantinescu@liceu.ro', TO_DATE('2015-09-01', 'YYYY-MM-DD'), 5720.00, 2);
INSERT INTO profesori VALUES (8, 'Stoica', 'Cristina', 'cristina.stoica@liceu.ro', TO_DATE('2006-09-01', 'YYYY-MM-DD'), 6680.25, 2);
INSERT INTO profesori VALUES (12, 'Florea', 'Simona', 'simona.florea@liceu.ro', TO_DATE('2019-09-01', 'YYYY-MM-DD'), 5210.00, 2);
-- teachers whose head is teacher 3 (Științe)
INSERT INTO profesori VALUES (6, 'Marinescu', 'Radu', 'radu.marinescu@liceu.ro', TO_DATE('2008-09-01', 'YYYY-MM-DD'), 6450.00, 3);
INSERT INTO profesori VALUES (9, 'Radu', 'Gabriel', 'gabriel.radu@liceu.ro', TO_DATE('2011-09-01', 'YYYY-MM-DD'), 6050.00, 3);
INSERT INTO profesori VALUES (10, 'Munteanu', 'Daniela', 'daniela.munteanu@liceu.ro', TO_DATE('2018-09-01', 'YYYY-MM-DD'), 5340.00, 3);
-- newly hired teacher: no school email yet (NULL value)
INSERT INTO profesori VALUES (15, 'Ene', 'Florin', NULL, TO_DATE('2025-09-01', 'YYYY-MM-DD'), 4150.00, 3);

-- ============================================================
-- DATA: clase
-- columns: id_clasa, nume, an_studiu, profil, id_diriginte
-- ============================================================

-- 9th grade classes
INSERT INTO clase VALUES (1, '9A', 9, 'Matematică-Informatică', 4);
INSERT INTO clase VALUES (2, '9B', 9, 'Științe ale naturii', 3);
-- 10th grade classes
INSERT INTO clase VALUES (3, '10A', 10, 'Matematică-Informatică', 5);
INSERT INTO clase VALUES (4, '10B', 10, 'Filologie', 7);
-- 11th grade classes
INSERT INTO clase VALUES (5, '11A', 11, 'Matematică-Informatică', 14);
INSERT INTO clase VALUES (6, '11B', 11, 'Științe sociale', 8);
-- 12th grade classes (12B has no homeroom teacher: id_diriginte is NULL)
INSERT INTO clase VALUES (7, '12A', 12, 'Matematică-Informatică', 13);
INSERT INTO clase VALUES (8, '12B', 12, 'Filologie', NULL);

-- ============================================================
-- DATA: materii
-- columns: id_materie, denumire, ore_pe_saptamana, id_profesor
-- ============================================================

-- subjects with their teachers
INSERT INTO materii VALUES (1, 'Matematică', 4, 1);
INSERT INTO materii VALUES (2, 'Limba și literatura română', 4, 2);
INSERT INTO materii VALUES (3, 'Biologie', 2, 3);
INSERT INTO materii VALUES (4, 'Informatică', 3, 5);
INSERT INTO materii VALUES (5, 'Fizică', 2, 6);
INSERT INTO materii VALUES (6, 'Limba engleză', 2, 7);
INSERT INTO materii VALUES (7, 'Istorie', 2, 8);
INSERT INTO materii VALUES (8, 'Chimie', 2, 9);
INSERT INTO materii VALUES (9, 'Geografie', 1, 10);
INSERT INTO materii VALUES (10, 'Educație fizică', 2, 11);
INSERT INTO materii VALUES (11, 'Limba franceză', 2, 12);
-- subject with no teacher assigned yet (id_profesor is NULL) and no grades
INSERT INTO materii VALUES (12, 'Educație antreprenorială', 1, NULL);

-- ============================================================
-- DATA: elevi
-- columns: id_elev, nume, prenume, data_nasterii, oras, email, id_clasa
-- ============================================================

-- students of class 9A (born in 2010)
INSERT INTO elevi VALUES (1, 'Popa', 'Andrei', TO_DATE('2010-03-14', 'YYYY-MM-DD'), 'Brașov', 'andrei.popa@elev.liceu.ro', 1);
INSERT INTO elevi VALUES (2, 'Mureșan', 'Ioana', TO_DATE('2010-07-22', 'YYYY-MM-DD'), 'Brașov', 'ioana.muresan@elev.liceu.ro', 1);
INSERT INTO elevi VALUES (3, 'Ștefănescu', 'Rareș', TO_DATE('2010-01-05', 'YYYY-MM-DD'), 'Râșnov', 'rares.stefanescu@elev.liceu.ro', 1);
INSERT INTO elevi VALUES (4, 'Bălan', 'Maria', TO_DATE('2010-11-30', 'YYYY-MM-DD'), 'Brașov', NULL, 1);
INSERT INTO elevi VALUES (5, 'Țurcanu', 'Vlad', TO_DATE('2010-05-18', 'YYYY-MM-DD'), 'Codlea', 'vlad.turcanu@elev.liceu.ro', 1);
-- students of class 9B (born in 2010)
INSERT INTO elevi VALUES (6, 'Lazăr', 'Elena', TO_DATE('2010-02-09', 'YYYY-MM-DD'), 'Săcele', 'elena.lazar@elev.liceu.ro', 2);
INSERT INTO elevi VALUES (7, 'Oprea', 'Luca', TO_DATE('2010-09-03', 'YYYY-MM-DD'), 'Brașov', 'luca.oprea@elev.liceu.ro', 2);
INSERT INTO elevi VALUES (8, 'Dinu', 'Ana-Maria', TO_DATE('2010-06-27', 'YYYY-MM-DD'), 'Ghimbav', 'anamaria.dinu@elev.liceu.ro', 2);
INSERT INTO elevi VALUES (9, 'Toma', 'David', TO_DATE('2010-12-11', 'YYYY-MM-DD'), 'Brașov', 'david.toma@elev.liceu.ro', 2);
INSERT INTO elevi VALUES (10, 'Popa', 'Teodora', TO_DATE('2010-04-16', 'YYYY-MM-DD'), 'Zărnești', 'teodora.popa@elev.liceu.ro', 2);
-- students of class 10A (born in 2009)
INSERT INTO elevi VALUES (11, 'Moldovan', 'Alexandru', TO_DATE('2009-08-21', 'YYYY-MM-DD'), 'Brașov', 'alexandru.moldovan@elev.liceu.ro', 3);
INSERT INTO elevi VALUES (12, 'Rusu', 'Bianca', TO_DATE('2009-01-13', 'YYYY-MM-DD'), 'Brașov', NULL, 3);
INSERT INTO elevi VALUES (13, 'Sârbu', 'Mihai', TO_DATE('2009-10-02', 'YYYY-MM-DD'), 'Făgăraș', 'mihai.sarbu@elev.liceu.ro', 3);
INSERT INTO elevi VALUES (14, 'Cristea', 'Irina', TO_DATE('2009-03-29', 'YYYY-MM-DD'), 'Brașov', 'irina.cristea@elev.liceu.ro', 3);
INSERT INTO elevi VALUES (15, 'Matei', 'Ștefan', TO_DATE('2009-06-07', 'YYYY-MM-DD'), 'Râșnov', 'stefan.matei@elev.liceu.ro', 3);
-- students of class 10B (born in 2009)
INSERT INTO elevi VALUES (16, 'Enache', 'Denisa', TO_DATE('2009-05-15', 'YYYY-MM-DD'), 'Săcele', 'denisa.enache@elev.liceu.ro', 4);
INSERT INTO elevi VALUES (17, 'Diaconu', 'Tudor', TO_DATE('2009-11-19', 'YYYY-MM-DD'), 'Brașov', 'tudor.diaconu@elev.liceu.ro', 4);
INSERT INTO elevi VALUES (18, 'Barbu', 'Ilinca', TO_DATE('2009-02-24', 'YYYY-MM-DD'), 'Prejmer', 'ilinca.barbu@elev.liceu.ro', 4);
INSERT INTO elevi VALUES (19, 'Ciobanu', 'Răzvan', TO_DATE('2009-07-08', 'YYYY-MM-DD'), 'Brașov', NULL, 4);
INSERT INTO elevi VALUES (20, 'Iordache', 'Sara', TO_DATE('2009-09-12', 'YYYY-MM-DD'), 'Codlea', 'sara.iordache@elev.liceu.ro', 4);
-- students of class 11A (born in 2008)
INSERT INTO elevi VALUES (21, 'Manea', 'Cătălin', TO_DATE('2008-04-03', 'YYYY-MM-DD'), 'Brașov', 'catalin.manea@elev.liceu.ro', 5);
INSERT INTO elevi VALUES (22, 'Pavel', 'Alina', TO_DATE('2008-12-20', 'YYYY-MM-DD'), 'Brașov', 'alina.pavel@elev.liceu.ro', 5);
INSERT INTO elevi VALUES (23, 'Anghel', 'Matei', TO_DATE('2008-01-26', 'YYYY-MM-DD'), 'Ghimbav', 'matei.anghel@elev.liceu.ro', 5);
INSERT INTO elevi VALUES (24, 'Voicu', 'Diana', TO_DATE('2008-08-14', 'YYYY-MM-DD'), 'Brașov', 'diana.voicu@elev.liceu.ro', 5);
INSERT INTO elevi VALUES (25, 'Dobre', 'Bogdan', TO_DATE('2008-06-01', 'YYYY-MM-DD'), 'Râșnov', 'bogdan.dobre@elev.liceu.ro', 5);
-- students of class 11B (born in 2008)
INSERT INTO elevi VALUES (26, 'Preda', 'Andreea', TO_DATE('2008-10-10', 'YYYY-MM-DD'), 'Brașov', 'andreea.preda@elev.liceu.ro', 6);
INSERT INTO elevi VALUES (27, 'Nedelcu', 'Darius', TO_DATE('2008-03-17', 'YYYY-MM-DD'), 'Zărnești', NULL, 6);
INSERT INTO elevi VALUES (28, 'Tănase', 'Cristiana', TO_DATE('2008-07-04', 'YYYY-MM-DD'), 'Brașov', 'cristiana.tanase@elev.liceu.ro', 6);
INSERT INTO elevi VALUES (29, 'Grigore', 'Robert', TO_DATE('2008-11-28', 'YYYY-MM-DD'), 'Săcele', 'robert.grigore@elev.liceu.ro', 6);
INSERT INTO elevi VALUES (30, 'Chiriac', 'Iulia', TO_DATE('2008-02-19', 'YYYY-MM-DD'), 'Brașov', 'iulia.chiriac@elev.liceu.ro', 6);
-- students of class 12A (born in 2007)
INSERT INTO elevi VALUES (31, 'Zamfir', 'Adrian', TO_DATE('2007-05-09', 'YYYY-MM-DD'), 'Brașov', 'adrian.zamfir@elev.liceu.ro', 7);
INSERT INTO elevi VALUES (32, 'Surdu', 'Larisa', TO_DATE('2007-09-23', 'YYYY-MM-DD'), 'Codlea', 'larisa.surdu@elev.liceu.ro', 7);
INSERT INTO elevi VALUES (33, 'Ilie', 'Octavian', TO_DATE('2007-01-31', 'YYYY-MM-DD'), 'Brașov', NULL, 7);
INSERT INTO elevi VALUES (34, 'Costache', 'Roxana', TO_DATE('2007-12-05', 'YYYY-MM-DD'), 'Făgăraș', 'roxana.costache@elev.liceu.ro', 7);
INSERT INTO elevi VALUES (35, 'Mocanu', 'Gabriel', TO_DATE('2007-06-16', 'YYYY-MM-DD'), 'Brașov', 'gabriel.mocanu@elev.liceu.ro', 7);
-- students of class 12B (born in 2007)
INSERT INTO elevi VALUES (36, 'Gheorghe', 'Oana', TO_DATE('2007-04-22', 'YYYY-MM-DD'), 'Brașov', 'oana.gheorghe@elev.liceu.ro', 8);
INSERT INTO elevi VALUES (37, 'Vasile', 'Victor', TO_DATE('2007-08-30', 'YYYY-MM-DD'), 'Prejmer', 'victor.vasile@elev.liceu.ro', 8);
INSERT INTO elevi VALUES (38, 'Neagu', 'Ramona', TO_DATE('2007-10-18', 'YYYY-MM-DD'), 'Brașov', NULL, 8);
INSERT INTO elevi VALUES (39, 'Stănescu', 'Horia', TO_DATE('2007-03-06', 'YYYY-MM-DD'), 'Râșnov', 'horia.stanescu@elev.liceu.ro', 8);
INSERT INTO elevi VALUES (40, 'Popa', 'Ștefania', TO_DATE('2007-11-09', 'YYYY-MM-DD'), 'Brașov', 'stefania.popa@elev.liceu.ro', 8);

-- ============================================================
-- DATA: note (school year 2024-2025)
-- columns: id_nota, id_elev, id_materie, nota, data_notei
-- students 8, 23 and 37 have no grades on purpose (useful for LEFT JOIN)
-- ============================================================

-- grades of student 1 (Popa Andrei, 9A)
INSERT INTO note VALUES (1, 1, 1, 8, TO_DATE('2024-11-05', 'YYYY-MM-DD'));
INSERT INTO note VALUES (2, 1, 2, 9, TO_DATE('2024-12-10', 'YYYY-MM-DD'));
INSERT INTO note VALUES (3, 1, 10, 9, TO_DATE('2025-03-26', 'YYYY-MM-DD'));
INSERT INTO note VALUES (4, 1, 5, 9, TO_DATE('2025-04-08', 'YYYY-MM-DD'));
-- grades of student 2 (Mureșan Ioana, 9A)
INSERT INTO note VALUES (5, 2, 4, 9, TO_DATE('2024-12-05', 'YYYY-MM-DD'));
INSERT INTO note VALUES (6, 2, 4, 10, TO_DATE('2025-02-13', 'YYYY-MM-DD'));
INSERT INTO note VALUES (7, 2, 10, 10, TO_DATE('2025-02-14', 'YYYY-MM-DD'));
INSERT INTO note VALUES (8, 2, 6, 9, TO_DATE('2025-03-24', 'YYYY-MM-DD'));
-- grades of student 3 (Ștefănescu Rareș, 9A)
INSERT INTO note VALUES (9, 3, 4, 7, TO_DATE('2024-10-11', 'YYYY-MM-DD'));
INSERT INTO note VALUES (10, 3, 4, 7, TO_DATE('2025-03-26', 'YYYY-MM-DD'));
INSERT INTO note VALUES (11, 3, 5, 7, TO_DATE('2025-04-03', 'YYYY-MM-DD'));
-- grades of student 4 (Bălan Maria, 9A)
INSERT INTO note VALUES (12, 4, 5, 8, TO_DATE('2024-09-16', 'YYYY-MM-DD'));
INSERT INTO note VALUES (13, 4, 6, 8, TO_DATE('2024-10-14', 'YYYY-MM-DD'));
INSERT INTO note VALUES (14, 4, 1, 8, TO_DATE('2025-02-05', 'YYYY-MM-DD'));
INSERT INTO note VALUES (15, 4, 5, 8, TO_DATE('2025-03-27', 'YYYY-MM-DD'));
INSERT INTO note VALUES (16, 4, 6, 8, TO_DATE('2025-03-27', 'YYYY-MM-DD'));
-- grades of student 5 (Țurcanu Vlad, 9A)
INSERT INTO note VALUES (17, 5, 6, 6, TO_DATE('2024-10-11', 'YYYY-MM-DD'));
INSERT INTO note VALUES (18, 5, 10, 5, TO_DATE('2024-10-23', 'YYYY-MM-DD'));
INSERT INTO note VALUES (19, 5, 6, 6, TO_DATE('2024-11-25', 'YYYY-MM-DD'));
INSERT INTO note VALUES (20, 5, 2, 5, TO_DATE('2025-05-08', 'YYYY-MM-DD'));
INSERT INTO note VALUES (21, 5, 4, 7, TO_DATE('2025-06-02', 'YYYY-MM-DD'));
-- grades of student 6 (Lazăr Elena, 9B)
INSERT INTO note VALUES (22, 6, 6, 9, TO_DATE('2024-09-12', 'YYYY-MM-DD'));
INSERT INTO note VALUES (23, 6, 8, 9, TO_DATE('2024-11-25', 'YYYY-MM-DD'));
INSERT INTO note VALUES (24, 6, 1, 8, TO_DATE('2025-01-20', 'YYYY-MM-DD'));
INSERT INTO note VALUES (25, 6, 8, 10, TO_DATE('2025-04-28', 'YYYY-MM-DD'));
-- grades of student 7 (Oprea Luca, 9B)
INSERT INTO note VALUES (26, 7, 6, 6, TO_DATE('2024-12-03', 'YYYY-MM-DD'));
INSERT INTO note VALUES (27, 7, 1, 6, TO_DATE('2024-12-09', 'YYYY-MM-DD'));
INSERT INTO note VALUES (28, 7, 3, 7, TO_DATE('2025-06-03', 'YYYY-MM-DD'));
-- grades of student 9 (Toma David, 9B)
INSERT INTO note VALUES (29, 9, 1, 5, TO_DATE('2024-09-27', 'YYYY-MM-DD'));
INSERT INTO note VALUES (30, 9, 6, 6, TO_DATE('2024-10-02', 'YYYY-MM-DD'));
INSERT INTO note VALUES (31, 9, 8, 5, TO_DATE('2025-01-21', 'YYYY-MM-DD'));
INSERT INTO note VALUES (32, 9, 2, 7, TO_DATE('2025-03-25', 'YYYY-MM-DD'));
INSERT INTO note VALUES (33, 9, 3, 6, TO_DATE('2025-03-26', 'YYYY-MM-DD'));
-- grades of student 10 (Popa Teodora, 9B)
INSERT INTO note VALUES (34, 10, 3, 8, TO_DATE('2024-11-14', 'YYYY-MM-DD'));
INSERT INTO note VALUES (35, 10, 2, 9, TO_DATE('2024-11-20', 'YYYY-MM-DD'));
INSERT INTO note VALUES (36, 10, 8, 8, TO_DATE('2025-05-20', 'YYYY-MM-DD'));
INSERT INTO note VALUES (37, 10, 8, 8, TO_DATE('2025-05-28', 'YYYY-MM-DD'));
INSERT INTO note VALUES (38, 10, 2, 8, TO_DATE('2025-06-06', 'YYYY-MM-DD'));
-- grades of student 11 (Moldovan Alexandru, 10A)
INSERT INTO note VALUES (39, 11, 10, 10, TO_DATE('2024-11-04', 'YYYY-MM-DD'));
INSERT INTO note VALUES (40, 11, 4, 10, TO_DATE('2024-12-20', 'YYYY-MM-DD'));
INSERT INTO note VALUES (41, 11, 6, 10, TO_DATE('2025-02-07', 'YYYY-MM-DD'));
INSERT INTO note VALUES (42, 11, 5, 10, TO_DATE('2025-05-14', 'YYYY-MM-DD'));
-- grades of student 12 (Rusu Bianca, 10A)
INSERT INTO note VALUES (43, 12, 2, 6, TO_DATE('2024-10-10', 'YYYY-MM-DD'));
INSERT INTO note VALUES (44, 12, 5, 7, TO_DATE('2024-10-11', 'YYYY-MM-DD'));
INSERT INTO note VALUES (45, 12, 2, 7, TO_DATE('2024-12-18', 'YYYY-MM-DD'));
INSERT INTO note VALUES (46, 12, 4, 7, TO_DATE('2025-04-02', 'YYYY-MM-DD'));
-- grades of student 13 (Sârbu Mihai, 10A)
INSERT INTO note VALUES (47, 13, 1, 7, TO_DATE('2024-09-18', 'YYYY-MM-DD'));
INSERT INTO note VALUES (48, 13, 5, 7, TO_DATE('2025-04-08', 'YYYY-MM-DD'));
INSERT INTO note VALUES (49, 13, 1, 7, TO_DATE('2025-04-14', 'YYYY-MM-DD'));
INSERT INTO note VALUES (50, 13, 5, 6, TO_DATE('2025-06-04', 'YYYY-MM-DD'));
INSERT INTO note VALUES (51, 13, 6, 6, TO_DATE('2025-06-12', 'YYYY-MM-DD'));
-- grades of student 14 (Cristea Irina, 10A)
INSERT INTO note VALUES (52, 14, 1, 8, TO_DATE('2024-10-25', 'YYYY-MM-DD'));
INSERT INTO note VALUES (53, 14, 5, 9, TO_DATE('2024-12-11', 'YYYY-MM-DD'));
INSERT INTO note VALUES (54, 14, 6, 8, TO_DATE('2025-02-25', 'YYYY-MM-DD'));
INSERT INTO note VALUES (55, 14, 4, 10, TO_DATE('2025-05-13', 'YYYY-MM-DD'));
-- grades of student 15 (Matei Ștefan, 10A)
INSERT INTO note VALUES (56, 15, 6, 8, TO_DATE('2024-09-16', 'YYYY-MM-DD'));
INSERT INTO note VALUES (57, 15, 5, 8, TO_DATE('2024-10-04', 'YYYY-MM-DD'));
INSERT INTO note VALUES (58, 15, 1, 9, TO_DATE('2024-11-19', 'YYYY-MM-DD'));
INSERT INTO note VALUES (59, 15, 1, 8, TO_DATE('2025-02-07', 'YYYY-MM-DD'));
-- grades of student 16 (Enache Denisa, 10B)
INSERT INTO note VALUES (60, 16, 2, 4, TO_DATE('2024-09-18', 'YYYY-MM-DD'));
INSERT INTO note VALUES (61, 16, 6, 2, TO_DATE('2025-02-26', 'YYYY-MM-DD'));
INSERT INTO note VALUES (62, 16, 2, 4, TO_DATE('2025-05-26', 'YYYY-MM-DD'));
INSERT INTO note VALUES (63, 16, 6, 3, TO_DATE('2025-06-12', 'YYYY-MM-DD'));
-- grades of student 17 (Diaconu Tudor, 10B)
INSERT INTO note VALUES (64, 17, 2, 5, TO_DATE('2024-11-18', 'YYYY-MM-DD'));
INSERT INTO note VALUES (65, 17, 7, 6, TO_DATE('2024-12-03', 'YYYY-MM-DD'));
INSERT INTO note VALUES (66, 17, 7, 7, TO_DATE('2024-12-19', 'YYYY-MM-DD'));
INSERT INTO note VALUES (67, 17, 6, 7, TO_DATE('2025-01-09', 'YYYY-MM-DD'));
INSERT INTO note VALUES (68, 17, 11, 8, TO_DATE('2025-04-15', 'YYYY-MM-DD'));
-- grades of student 18 (Barbu Ilinca, 10B)
INSERT INTO note VALUES (69, 18, 11, 7, TO_DATE('2024-09-09', 'YYYY-MM-DD'));
INSERT INTO note VALUES (70, 18, 6, 9, TO_DATE('2024-10-16', 'YYYY-MM-DD'));
INSERT INTO note VALUES (71, 18, 11, 9, TO_DATE('2024-11-08', 'YYYY-MM-DD'));
INSERT INTO note VALUES (72, 18, 9, 9, TO_DATE('2025-05-23', 'YYYY-MM-DD'));
-- grades of student 19 (Ciobanu Răzvan, 10B)
INSERT INTO note VALUES (73, 19, 7, 5, TO_DATE('2024-09-20', 'YYYY-MM-DD'));
INSERT INTO note VALUES (74, 19, 10, 5, TO_DATE('2024-09-23', 'YYYY-MM-DD'));
INSERT INTO note VALUES (75, 19, 11, 6, TO_DATE('2024-11-08', 'YYYY-MM-DD'));
-- grades of student 20 (Iordache Sara, 10B)
INSERT INTO note VALUES (76, 20, 7, 9, TO_DATE('2024-10-09', 'YYYY-MM-DD'));
INSERT INTO note VALUES (77, 20, 7, 8, TO_DATE('2025-02-11', 'YYYY-MM-DD'));
INSERT INTO note VALUES (78, 20, 11, 8, TO_DATE('2025-04-01', 'YYYY-MM-DD'));
INSERT INTO note VALUES (79, 20, 9, 10, TO_DATE('2025-05-01', 'YYYY-MM-DD'));
-- grades of student 21 (Manea Cătălin, 11A)
INSERT INTO note VALUES (80, 21, 6, 8, TO_DATE('2024-09-11', 'YYYY-MM-DD'));
INSERT INTO note VALUES (81, 21, 5, 9, TO_DATE('2025-05-09', 'YYYY-MM-DD'));
INSERT INTO note VALUES (82, 21, 6, 8, TO_DATE('2025-05-14', 'YYYY-MM-DD'));
INSERT INTO note VALUES (83, 21, 4, 8, TO_DATE('2025-05-15', 'YYYY-MM-DD'));
-- grades of student 22 (Pavel Alina, 11A)
INSERT INTO note VALUES (84, 22, 2, 10, TO_DATE('2024-10-02', 'YYYY-MM-DD'));
INSERT INTO note VALUES (85, 22, 4, 9, TO_DATE('2025-01-08', 'YYYY-MM-DD'));
INSERT INTO note VALUES (86, 22, 5, 10, TO_DATE('2025-02-10', 'YYYY-MM-DD'));
INSERT INTO note VALUES (87, 22, 2, 10, TO_DATE('2025-03-17', 'YYYY-MM-DD'));
INSERT INTO note VALUES (88, 22, 1, 9, TO_DATE('2025-05-28', 'YYYY-MM-DD'));
-- grades of student 24 (Voicu Diana, 11A)
INSERT INTO note VALUES (89, 24, 4, 8, TO_DATE('2024-09-23', 'YYYY-MM-DD'));
INSERT INTO note VALUES (90, 24, 2, 6, TO_DATE('2025-01-14', 'YYYY-MM-DD'));
INSERT INTO note VALUES (91, 24, 6, 8, TO_DATE('2025-03-07', 'YYYY-MM-DD'));
INSERT INTO note VALUES (92, 24, 6, 8, TO_DATE('2025-05-29', 'YYYY-MM-DD'));
-- grades of student 25 (Dobre Bogdan, 11A)
INSERT INTO note VALUES (93, 25, 4, 6, TO_DATE('2024-11-28', 'YYYY-MM-DD'));
INSERT INTO note VALUES (94, 25, 1, 6, TO_DATE('2025-01-17', 'YYYY-MM-DD'));
INSERT INTO note VALUES (95, 25, 5, 4, TO_DATE('2025-05-23', 'YYYY-MM-DD'));
INSERT INTO note VALUES (96, 25, 2, 5, TO_DATE('2025-06-05', 'YYYY-MM-DD'));
-- grades of student 26 (Preda Andreea, 11B)
INSERT INTO note VALUES (97, 26, 6, 9, TO_DATE('2024-09-23', 'YYYY-MM-DD'));
INSERT INTO note VALUES (98, 26, 7, 9, TO_DATE('2025-01-21', 'YYYY-MM-DD'));
INSERT INTO note VALUES (99, 26, 7, 9, TO_DATE('2025-03-05', 'YYYY-MM-DD'));
INSERT INTO note VALUES (100, 26, 10, 8, TO_DATE('2025-03-18', 'YYYY-MM-DD'));
INSERT INTO note VALUES (101, 26, 10, 9, TO_DATE('2025-05-22', 'YYYY-MM-DD'));
-- grades of student 27 (Nedelcu Darius, 11B)
INSERT INTO note VALUES (102, 27, 1, 5, TO_DATE('2024-09-20', 'YYYY-MM-DD'));
INSERT INTO note VALUES (103, 27, 9, 7, TO_DATE('2024-12-18', 'YYYY-MM-DD'));
INSERT INTO note VALUES (104, 27, 9, 6, TO_DATE('2025-02-05', 'YYYY-MM-DD'));
INSERT INTO note VALUES (105, 27, 2, 6, TO_DATE('2025-05-21', 'YYYY-MM-DD'));
INSERT INTO note VALUES (106, 27, 6, 5, TO_DATE('2025-05-21', 'YYYY-MM-DD'));
-- grades of student 28 (Tănase Cristiana, 11B)
INSERT INTO note VALUES (107, 28, 10, 8, TO_DATE('2024-09-20', 'YYYY-MM-DD'));
INSERT INTO note VALUES (108, 28, 7, 9, TO_DATE('2024-10-17', 'YYYY-MM-DD'));
INSERT INTO note VALUES (109, 28, 9, 10, TO_DATE('2024-11-27', 'YYYY-MM-DD'));
-- grades of student 29 (Grigore Robert, 11B)
INSERT INTO note VALUES (110, 29, 2, 7, TO_DATE('2024-10-18', 'YYYY-MM-DD'));
INSERT INTO note VALUES (111, 29, 1, 8, TO_DATE('2024-11-04', 'YYYY-MM-DD'));
INSERT INTO note VALUES (112, 29, 10, 8, TO_DATE('2025-02-05', 'YYYY-MM-DD'));
INSERT INTO note VALUES (113, 29, 7, 8, TO_DATE('2025-05-09', 'YYYY-MM-DD'));
INSERT INTO note VALUES (114, 29, 7, 9, TO_DATE('2025-06-11', 'YYYY-MM-DD'));
-- grades of student 30 (Chiriac Iulia, 11B)
INSERT INTO note VALUES (115, 30, 7, 8, TO_DATE('2024-10-15', 'YYYY-MM-DD'));
INSERT INTO note VALUES (116, 30, 6, 8, TO_DATE('2024-11-26', 'YYYY-MM-DD'));
INSERT INTO note VALUES (117, 30, 2, 9, TO_DATE('2025-01-29', 'YYYY-MM-DD'));
INSERT INTO note VALUES (118, 30, 2, 8, TO_DATE('2025-02-06', 'YYYY-MM-DD'));
INSERT INTO note VALUES (119, 30, 6, 7, TO_DATE('2025-03-20', 'YYYY-MM-DD'));
-- grades of student 31 (Zamfir Adrian, 12A)
INSERT INTO note VALUES (120, 31, 1, 9, TO_DATE('2024-11-12', 'YYYY-MM-DD'));
INSERT INTO note VALUES (121, 31, 2, 9, TO_DATE('2025-02-14', 'YYYY-MM-DD'));
INSERT INTO note VALUES (122, 31, 10, 10, TO_DATE('2025-04-16', 'YYYY-MM-DD'));
-- grades of student 32 (Surdu Larisa, 12A)
INSERT INTO note VALUES (123, 32, 10, 8, TO_DATE('2024-09-18', 'YYYY-MM-DD'));
INSERT INTO note VALUES (124, 32, 2, 7, TO_DATE('2024-12-03', 'YYYY-MM-DD'));
INSERT INTO note VALUES (125, 32, 1, 8, TO_DATE('2025-01-29', 'YYYY-MM-DD'));
-- grades of student 33 (Ilie Octavian, 12A)
INSERT INTO note VALUES (126, 33, 6, 4, TO_DATE('2024-10-09', 'YYYY-MM-DD'));
INSERT INTO note VALUES (127, 33, 1, 5, TO_DATE('2024-12-10', 'YYYY-MM-DD'));
INSERT INTO note VALUES (128, 33, 5, 3, TO_DATE('2024-12-12', 'YYYY-MM-DD'));
INSERT INTO note VALUES (129, 33, 6, 5, TO_DATE('2025-02-28', 'YYYY-MM-DD'));
-- grades of student 34 (Costache Roxana, 12A)
INSERT INTO note VALUES (130, 34, 4, 8, TO_DATE('2024-09-19', 'YYYY-MM-DD'));
INSERT INTO note VALUES (131, 34, 1, 9, TO_DATE('2025-01-15', 'YYYY-MM-DD'));
INSERT INTO note VALUES (132, 34, 5, 8, TO_DATE('2025-02-05', 'YYYY-MM-DD'));
INSERT INTO note VALUES (133, 34, 4, 7, TO_DATE('2025-05-15', 'YYYY-MM-DD'));
-- grades of student 35 (Mocanu Gabriel, 12A)
INSERT INTO note VALUES (134, 35, 6, 8, TO_DATE('2024-09-12', 'YYYY-MM-DD'));
INSERT INTO note VALUES (135, 35, 4, 7, TO_DATE('2024-09-16', 'YYYY-MM-DD'));
INSERT INTO note VALUES (136, 35, 10, 8, TO_DATE('2025-01-20', 'YYYY-MM-DD'));
INSERT INTO note VALUES (137, 35, 5, 8, TO_DATE('2025-02-10', 'YYYY-MM-DD'));
-- grades of student 36 (Gheorghe Oana, 12B)
INSERT INTO note VALUES (138, 36, 7, 8, TO_DATE('2025-02-05', 'YYYY-MM-DD'));
INSERT INTO note VALUES (139, 36, 2, 8, TO_DATE('2025-02-06', 'YYYY-MM-DD'));
INSERT INTO note VALUES (140, 36, 6, 7, TO_DATE('2025-05-26', 'YYYY-MM-DD'));
-- grades of student 38 (Neagu Ramona, 12B)
INSERT INTO note VALUES (141, 38, 11, 7, TO_DATE('2024-10-09', 'YYYY-MM-DD'));
INSERT INTO note VALUES (142, 38, 11, 6, TO_DATE('2024-12-20', 'YYYY-MM-DD'));
INSERT INTO note VALUES (143, 38, 7, 7, TO_DATE('2025-02-03', 'YYYY-MM-DD'));
INSERT INTO note VALUES (144, 38, 6, 7, TO_DATE('2025-05-15', 'YYYY-MM-DD'));
-- grades of student 39 (Stănescu Horia, 12B)
INSERT INTO note VALUES (145, 39, 6, 7, TO_DATE('2024-09-10', 'YYYY-MM-DD'));
INSERT INTO note VALUES (146, 39, 11, 5, TO_DATE('2024-09-17', 'YYYY-MM-DD'));
INSERT INTO note VALUES (147, 39, 7, 5, TO_DATE('2024-10-11', 'YYYY-MM-DD'));
INSERT INTO note VALUES (148, 39, 2, 8, TO_DATE('2025-03-24', 'YYYY-MM-DD'));
-- grades of student 40 (Popa Ștefania, 12B)
INSERT INTO note VALUES (149, 40, 10, 10, TO_DATE('2024-10-03', 'YYYY-MM-DD'));
INSERT INTO note VALUES (150, 40, 11, 9, TO_DATE('2024-12-17', 'YYYY-MM-DD'));
INSERT INTO note VALUES (151, 40, 6, 9, TO_DATE('2025-01-21', 'YYYY-MM-DD'));
INSERT INTO note VALUES (152, 40, 6, 10, TO_DATE('2025-01-23', 'YYYY-MM-DD'));
INSERT INTO note VALUES (153, 40, 10, 9, TO_DATE('2025-04-08', 'YYYY-MM-DD'));
