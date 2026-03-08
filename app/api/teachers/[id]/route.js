import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

async function getTeacherWithSubjects(id) {
  const r = await query(`
    SELECT t.*,
      COALESCE(
        JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', s.id, 'name', s.name, 'color', s.color, 'weekly_hours', s.weekly_hours))
        FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) as subjects,
      COUNT(DISTINCT sa.id) as assigned_hours
    FROM teachers t
    LEFT JOIN teacher_subjects ts ON ts.teacher_id = t.id
    LEFT JOIN subjects s ON s.id = ts.subject_id
    LEFT JOIN schedule_assignments sa ON sa.teacher_id = t.id
      JOIN schedule_options so ON so.id = sa.option_id AND so.is_principal = true
    WHERE t.id = $1
    GROUP BY t.id
  `, [id])
  return r.rows[0]
}

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const teacher = await getTeacherWithSubjects(id)
    if (!teacher) return NextResponse.json({ error: 'Profesor no encontrado' }, { status: 404 })
    return NextResponse.json(teacher)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, max_hours, color, subject_ids = [] } = body

    await query(
      `UPDATE teachers SET name=$1, email=$2, max_hours=$3, color=$4 WHERE id=$5`,
      [name, email, max_hours, color, id]
    )

    // Replace subjects
    await query('DELETE FROM teacher_subjects WHERE teacher_id = $1', [id])
    for (const sid of subject_ids) {
      await query(
        'INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, sid]
      )
    }

    const full = await getTeacherWithSubjects(id)
    if (!full) return NextResponse.json({ error: 'Profesor no encontrado' }, { status: 404 })
    return NextResponse.json(full)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    await query('DELETE FROM teachers WHERE id = $1', [id])
    return NextResponse.json({ message: 'Profesor eliminado' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
