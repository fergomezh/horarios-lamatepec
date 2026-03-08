import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query(`
      SELECT t.*,
        COALESCE(COUNT(DISTINCT sa.id), 0)::int as assigned_hours,
        COALESCE(
          JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', s.id, 'name', s.name, 'color', s.color, 'weekly_hours', s.weekly_hours))
          FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as subjects
      FROM teachers t
      LEFT JOIN teacher_subjects ts ON ts.teacher_id = t.id
      LEFT JOIN subjects s ON s.id = ts.subject_id
      LEFT JOIN schedule_assignments sa ON sa.teacher_id = t.id
      GROUP BY t.id
      ORDER BY t.name
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, email, subject_ids = [], max_hours, color } = body

    if (!name) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO teachers (name, email, max_hours, color)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email || null, max_hours || 25, color || '#1B2A4E']
    )
    const teacher = result.rows[0]

    if (subject_ids.length > 0) {
      for (const sid of subject_ids) {
        await query(
          'INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [teacher.id, sid]
        )
      }
    }

    const full = await getTeacherWithSubjects(teacher.id)
    return NextResponse.json(full, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function getTeacherWithSubjects(id) {
  const r = await query(`
    SELECT t.*,
      COALESCE(
        JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', s.id, 'name', s.name, 'color', s.color, 'weekly_hours', s.weekly_hours))
        FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) as subjects
    FROM teachers t
    LEFT JOIN teacher_subjects ts ON ts.teacher_id = t.id
    LEFT JOIN subjects s ON s.id = ts.subject_id
    WHERE t.id = $1
    GROUP BY t.id
  `, [id])
  return r.rows[0]
}
