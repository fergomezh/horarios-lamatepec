import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { checkConflicts } from '@/lib/schedule-utils'

export async function POST(request) {
  try {
    const body = await request.json()
    const { teacher_id, subject_id, section_id, slot_id, day } = body

    const allAssignments = await query(`
      SELECT sa.*, s.weekly_hours
      FROM schedule_assignments sa
      JOIN subjects s ON sa.subject_id = s.id
    `)

    const subjects = await query('SELECT * FROM subjects')

    const conflict = checkConflicts(
      parseInt(teacher_id),
      parseInt(subject_id),
      parseInt(section_id),
      parseInt(slot_id),
      day,
      allAssignments.rows,
      subjects.rows
    )

    return NextResponse.json(conflict)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
