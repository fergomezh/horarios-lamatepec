import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST() {
  try {
    // Create tables
    await query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(7) DEFAULT '#1B2A4E',
        weekly_hours INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    await query(`
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

    await query(`
      CREATE TABLE IF NOT EXISTS sections (
        id SERIAL PRIMARY KEY,
        grade INTEGER NOT NULL,
        section VARCHAR(1) NOT NULL,
        UNIQUE(grade, section)
      )
    `)

    await query(`
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

    await query(`
      CREATE TABLE IF NOT EXISTS schedule_options (
        id SERIAL PRIMARY KEY,
        label VARCHAR(100) NOT NULL,
        is_principal BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS teacher_subjects (
        teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        PRIMARY KEY (teacher_id, subject_id)
      )
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS subject_grade_hours (
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        grade INTEGER NOT NULL,
        weekly_hours INTEGER NOT NULL,
        UNIQUE(subject_id, grade)
      )
    `)

    await query(`
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

    // Seed subjects
    await query(`DELETE FROM schedule_assignments`)
    await query(`DELETE FROM schedule_options`)
    await query(`DELETE FROM teacher_subjects`)
    await query(`DELETE FROM teachers`)
    await query(`DELETE FROM subjects`)
    await query(`DELETE FROM sections`)
    await query(`DELETE FROM schedule_slots`)

    const subjectsData = [
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
    for (const s of subjectsData) {
      const res = await query(
        'INSERT INTO subjects (name, color, weekly_hours) VALUES ($1, $2, $3) RETURNING id',
        [s.name, s.color, s.weekly_hours]
      )
      subjectIds.push(res.rows[0].id)
    }

    // Seed teachers
    const teachersData = [
      { name: 'Saúl Molina', email: 'smolina@lamatepec.edu.sv', subjectIdx: 0, max_hours: 25, color: '#1B2A4E' },
      { name: 'Edwin Barahona', email: 'ebarahona@lamatepec.edu.sv', subjectIdx: 1, max_hours: 25, color: '#065F46' },
      { name: 'Salvador Román', email: 'sroman@lamatepec.edu.sv', subjectIdx: 2, max_hours: 30, color: '#4C1D95' },
      { name: 'Carlos Menéndez', email: 'cmenendez@lamatepec.edu.sv', subjectIdx: 3, max_hours: 20, color: '#92400E' },
      { name: 'Ana Flores', email: 'aflores@lamatepec.edu.sv', subjectIdx: 4, max_hours: 25, color: '#0F766E' },
      { name: 'Roberto Álvarez', email: 'ralvarez@lamatepec.edu.sv', subjectIdx: 5, max_hours: 15, color: '#0369A1' },
      { name: 'María López', email: 'mlopez@lamatepec.edu.sv', subjectIdx: 6, max_hours: 15, color: '#BE185D' },
      { name: 'Juan Pérez', email: 'jperez@lamatepec.edu.sv', subjectIdx: 7, max_hours: 20, color: '#78350F' },
      { name: 'Sofia Vargas', email: 'svargas@lamatepec.edu.sv', subjectIdx: 8, max_hours: 20, color: '#3730A3' },
    ]

    for (const t of teachersData) {
      await query(
        'INSERT INTO teachers (name, email, subject_id, max_hours, color) VALUES ($1, $2, $3, $4, $5)',
        [t.name, t.email, subjectIds[t.subjectIdx], t.max_hours, t.color]
      )
    }

    // Seed teacher_subjects (many-to-many join table)
    const teacherList = await query('SELECT id, name FROM teachers ORDER BY name')
    const subjectList = await query('SELECT id, name FROM subjects ORDER BY name')
    const subjectByName = {}
    subjectList.rows.forEach(s => { subjectByName[s.name] = s.id })

    const teacherSubjectAssignments = [
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

    for (const a of teacherSubjectAssignments) {
      const teacherId = teacherList.rows.find(t => t.name === a.teacher)?.id
      const subjectId = subjectByName[a.subject]
      if (teacherId && subjectId) {
        await query(
          'INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [teacherId, subjectId]
        )
      }
    }

    // Seed sections (grades 7, 8, 9 with sections A, B, C)
    for (const grade of [7, 8, 9]) {
      for (const section of ['A', 'B', 'C']) {
        await query('INSERT INTO sections (grade, section) VALUES ($1, $2) ON CONFLICT DO NOTHING', [grade, section])
      }
    }

    // Seed schedule slots
    const slotsData = [
      { period: 1, start_time: '07:00', end_time: '07:45', is_special: false },
      { period: 2, start_time: '07:45', end_time: '08:30', is_special: false },
      { period: 3, start_time: '08:30', end_time: '09:15', is_special: false },
      { period: 4, start_time: '09:15', end_time: '09:35', is_special: true, special_type: 'recreo', label: 'Recreo Matutino' },
      { period: 5, start_time: '09:35', end_time: '10:20', is_special: false },
      { period: 6, start_time: '10:20', end_time: '11:05', is_special: false },
      { period: 7, start_time: '11:05', end_time: '11:50', is_special: false },
      { period: 8, start_time: '11:50', end_time: '12:35', is_special: false },
      { period: 9, start_time: '12:35', end_time: '13:20', is_special: true, special_type: 'almuerzo', label: 'Almuerzo' },
      { period: 10, start_time: '13:20', end_time: '14:05', is_special: false },
      { period: 11, start_time: '14:05', end_time: '14:50', is_special: false },
    ]

    for (const slot of slotsData) {
      await query(
        'INSERT INTO schedule_slots (period, start_time, end_time, is_special, special_type, label) VALUES ($1, $2, $3, $4, $5, $6)',
        [slot.period, slot.start_time, slot.end_time, slot.is_special, slot.special_type || null, slot.label || null]
      )
    }

    // Seed initial schedule option (principal)
    await query(
      `INSERT INTO schedule_options (label, is_principal, sort_order) VALUES ('Horario 1', true, 0)`
    )

    return NextResponse.json({ message: 'Base de datos inicializada correctamente' })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
