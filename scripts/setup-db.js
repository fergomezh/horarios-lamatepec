/**
 * Script para inicializar la base de datos PostgreSQL
 * Uso: node scripts/setup-db.js
 * Requiere: DATABASE_URL en .env.local
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function setup() {
  console.log('🏫 Inicializando base de datos de Colegio Lamatepec...\n')

  try {
    // Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(7) DEFAULT '#1B2A4E',
        weekly_hours INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✓ Tabla subjects creada')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(200),
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        max_hours INTEGER DEFAULT 25,
        color VARCHAR(7) DEFAULT '#1B2A4E',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✓ Tabla teachers creada')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_subjects (
        teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        PRIMARY KEY (teacher_id, subject_id)
      )
    `)
    console.log('✓ Tabla teacher_subjects creada')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subject_grade_hours (
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        grade INTEGER NOT NULL,
        weekly_hours INTEGER NOT NULL,
        UNIQUE(subject_id, grade)
      )
    `)
    console.log('✓ Tabla subject_grade_hours creada')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id SERIAL PRIMARY KEY,
        grade INTEGER NOT NULL,
        section VARCHAR(1) NOT NULL,
        UNIQUE(grade, section)
      )
    `)
    console.log('✓ Tabla sections creada')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedule_slots (
        id SERIAL PRIMARY KEY,
        period INTEGER NOT NULL,
        start_time VARCHAR(5) NOT NULL,
        end_time VARCHAR(5) NOT NULL,
        is_special BOOLEAN DEFAULT FALSE,
        special_type VARCHAR(50),
        label VARCHAR(100)
      )
    `)
    console.log('✓ Tabla schedule_slots creada')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedule_options (
        id SERIAL PRIMARY KEY,
        label VARCHAR(100) NOT NULL,
        is_principal BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✓ Tabla schedule_options creada')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedule_assignments (
        id SERIAL PRIMARY KEY,
        option_id INTEGER REFERENCES schedule_options(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
        slot_id INTEGER REFERENCES schedule_slots(id) ON DELETE CASCADE,
        day VARCHAR(15) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(option_id, section_id, slot_id, day)
      )
    `)
    console.log('✓ Tabla schedule_assignments creada\n')

    // Check if already seeded
    const existing = await pool.query('SELECT COUNT(*) FROM subjects')
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('ℹ️  La base de datos ya tiene datos. Omitiendo seed.\n')
      console.log('✅ Setup completado!\n')
      return
    }

    // Seed subjects
    const subjects = [
      { name: 'Matemáticas', color: '#1B2A4E', weekly_hours: 5 },
      { name: 'Ciencias Naturales', color: '#065F46', weekly_hours: 4 },
      { name: 'Lenguaje y Literatura', color: '#4C1D95', weekly_hours: 5 },
      { name: 'Estudios Sociales', color: '#92400E', weekly_hours: 3 },
      { name: 'Inglés', color: '#0F766E', weekly_hours: 4 },
      { name: 'Educación Física', color: '#0369A1', weekly_hours: 2 },
      { name: 'Arte', color: '#BE185D', weekly_hours: 2 },
      { name: 'Religión', color: '#78350F', weekly_hours: 2 },
      { name: 'Computación', color: '#3730A3', weekly_hours: 2 },
    ]

    const subjectIds = []
    for (const s of subjects) {
      const r = await pool.query(
        'INSERT INTO subjects (name, color, weekly_hours) VALUES ($1,$2,$3) RETURNING id',
        [s.name, s.color, s.weekly_hours]
      )
      subjectIds.push(r.rows[0].id)
    }
    console.log(`✓ ${subjects.length} materias creadas`)

    // Seed teachers
    const teachers = [
      { name: 'Saúl Molina', email: 'smolina@lamatepec.edu.sv', si: 0, max: 25, color: '#1B2A4E' },
      { name: 'Edwin Barahona', email: 'ebarahona@lamatepec.edu.sv', si: 1, max: 25, color: '#065F46' },
      { name: 'Salvador Román', email: 'sroman@lamatepec.edu.sv', si: 2, max: 30, color: '#4C1D95' },
      { name: 'Carlos Menéndez', email: 'cmenendez@lamatepec.edu.sv', si: 3, max: 20, color: '#92400E' },
      { name: 'Ana Flores', email: 'aflores@lamatepec.edu.sv', si: 4, max: 25, color: '#0F766E' },
      { name: 'Roberto Álvarez', email: 'ralvarez@lamatepec.edu.sv', si: 5, max: 15, color: '#0369A1' },
      { name: 'María López', email: 'mlopez@lamatepec.edu.sv', si: 6, max: 15, color: '#BE185D' },
      { name: 'Juan Pérez', email: 'jperez@lamatepec.edu.sv', si: 7, max: 20, color: '#78350F' },
      { name: 'Sofia Vargas', email: 'svargas@lamatepec.edu.sv', si: 8, max: 20, color: '#3730A3' },
    ]

    for (const t of teachers) {
      await pool.query(
        'INSERT INTO teachers (name, email, subject_id, max_hours, color) VALUES ($1,$2,$3,$4,$5)',
        [t.name, t.email, subjectIds[t.si], t.max, t.color]
      )
    }
    console.log(`✓ ${teachers.length} profesores creados`)

    // Seed teacher_subjects (the proper way to assign subjects to teachers)
    const teacherList = await pool.query('SELECT id, name FROM teachers ORDER BY name')
    const subjectList = await pool.query('SELECT id, name FROM subjects ORDER BY name')
    const subjectByName = {}
    subjectList.rows.forEach(s => subjectByName[s.name] = s.id)

    const teacherAssignments = [
      { teacher: 'Saúl Molina', subject: 'Matemáticas' },
      { teacher: 'Edwin Barahona', subject: 'Ciencias Naturales' },
      { teacher: 'Salvador Román', subject: 'Lenguaje y Literatura' },
      { teacher: 'Carlos Menéndez', subject: 'Estudios Sociales' },
      { teacher: 'Ana Flores', subject: 'Inglés' },
      { teacher: 'Roberto Álvarez', subject: 'Educación Física' },
      { teacher: 'María López', subject: 'Arte' },
      { teacher: 'Juan Pérez', subject: 'Religión' },
      { teacher: 'Sofia Vargas', subject: 'Computación' },
    ]

    for (const a of teacherAssignments) {
      const teacherId = teacherList.rows.find(t => t.name === a.teacher)?.id
      const subjectId = subjectByName[a.subject]
      if (teacherId && subjectId) {
        await pool.query(
          'INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2)',
          [teacherId, subjectId]
        )
      }
    }
    console.log(`✓ ${teacherAssignments.length} relaciones teacher_subjects creadas`)

    // Seed sections
    for (const grade of [7, 8, 9]) {
      for (const sec of ['A', 'B', 'C']) {
        await pool.query('INSERT INTO sections (grade, section) VALUES ($1,$2) ON CONFLICT DO NOTHING', [grade, sec])
      }
    }
    console.log('✓ 9 secciones creadas (7A-9C)')

    // Seed slots
    const slots = [
      { period: 1,  start_time: '07:00', end_time: '07:45', is_special: false },
      { period: 2,  start_time: '07:45', end_time: '08:30', is_special: false },
      { period: 3,  start_time: '08:30', end_time: '09:15', is_special: false },
      { period: 4,  start_time: '09:15', end_time: '09:35', is_special: true,  special_type: 'recreo',   label: 'Recreo' },
      { period: 5,  start_time: '09:35', end_time: '10:20', is_special: false },
      { period: 6,  start_time: '10:20', end_time: '11:05', is_special: false },
      { period: 7,  start_time: '11:05', end_time: '11:50', is_special: false },
      { period: 8,  start_time: '11:50', end_time: '12:35', is_special: false },
      { period: 9,  start_time: '12:35', end_time: '13:05', is_special: true,  special_type: 'almuerzo', label: 'Almuerzo' },
      { period: 10, start_time: '13:05', end_time: '13:50', is_special: false },
      { period: 11, start_time: '13:50', end_time: '14:25', is_special: false },
    ]

    for (const s of slots) {
      await pool.query(
        'INSERT INTO schedule_slots (period, start_time, end_time, is_special, special_type, label) VALUES ($1,$2,$3,$4,$5,$6)',
        [s.period, s.start_time, s.end_time, s.is_special, s.special_type || null, s.label || null]
      )
    }
    console.log(`✓ ${slots.length} bloques horarios creados\n`)

    // Seed initial principal schedule option
    await pool.query(
      `INSERT INTO schedule_options (label, is_principal, sort_order) VALUES ('Horario 1', true, 0)`
    )
    console.log('✓ Opción de horario principal creada\n')

    console.log('✅ Base de datos inicializada con datos de ejemplo!')
    console.log('   Ahora puedes ejecutar: npm run dev\n')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

setup()
