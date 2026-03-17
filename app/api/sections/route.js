import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query('SELECT * FROM sections ORDER BY grade, section')
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { grade, section } = await request.json()
    if (!grade || !section) {
      return NextResponse.json({ error: 'Grado y sección son requeridos' }, { status: 400 })
    }

    const result = await query(
      'INSERT INTO sections (grade, section) VALUES ($1, $2) RETURNING *',
      [grade, section.toUpperCase()]
    )

    // Seed subject_grade_hours for all existing subjects.
    // Primaria grades (1-6) start at 0 — user configures which subjects apply.
    // Secundaria grades (7+) use each subject's default weekly_hours.
    if (grade <= 6) {
      await query(`
        INSERT INTO subject_grade_hours (subject_id, grade, weekly_hours)
        SELECT id, $1, 0 FROM subjects
        ON CONFLICT DO NOTHING
      `, [grade])
    } else {
      await query(`
        INSERT INTO subject_grade_hours (subject_id, grade, weekly_hours)
        SELECT id, $1, weekly_hours FROM subjects
        ON CONFLICT DO NOTHING
      `, [grade])
    }

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Esa sección ya existe' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
