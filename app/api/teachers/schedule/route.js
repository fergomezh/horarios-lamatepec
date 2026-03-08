import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacher_id')

    if (!teacherId) {
      return NextResponse.json({ error: 'teacher_id es requerido' }, { status: 400 })
    }

    const result = await query(`
      SELECT sa.*,
        t.name as teacher_name, t.color as teacher_color,
        s.name as subject_name, s.color as subject_color,
        sec.grade, sec.section,
        ss.period, ss.start_time, ss.end_time,
        so.label as option_label
      FROM schedule_assignments sa
      JOIN schedule_options so ON sa.option_id = so.id AND so.is_principal = true
      LEFT JOIN teachers t ON sa.teacher_id = t.id
      LEFT JOIN subjects s ON sa.subject_id = s.id
      JOIN sections sec ON sa.section_id = sec.id
      JOIN schedule_slots ss ON sa.slot_id = ss.id
      WHERE sa.teacher_id = $1
      ORDER BY ss.period, sa.day
    `, [teacherId])

    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
