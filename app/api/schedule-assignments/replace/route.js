import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * PUT /api/schedule-assignments/replace
 * Body: { option_id: number, assignments: Array<{ teacher_id, subject_id, section_id, slot_id, day }> }
 *
 * Atomically replaces ALL assignments for the given option_id with the provided array.
 */
export async function PUT(request) {
  try {
    const { option_id, assignments } = await request.json()

    if (!option_id) {
      return NextResponse.json({ error: 'option_id es requerido' }, { status: 400 })
    }

    if (!Array.isArray(assignments)) {
      return NextResponse.json({ error: 'assignments debe ser un array' }, { status: 400 })
    }

    // Filter out local-only or incomplete entries
    const valid = assignments.filter(
      a => a.teacher_id && a.subject_id && a.section_id && a.slot_id && a.day
    )

    await query('BEGIN')
    try {
      // Delete only assignments for this option
      await query('DELETE FROM schedule_assignments WHERE option_id = $1', [option_id])

      for (const a of valid) {
        await query(
          `INSERT INTO schedule_assignments (option_id, teacher_id, subject_id, section_id, slot_id, day)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (option_id, section_id, slot_id, day) DO UPDATE
             SET teacher_id = EXCLUDED.teacher_id,
                 subject_id = EXCLUDED.subject_id`,
          [option_id, a.teacher_id, a.subject_id, a.section_id, a.slot_id, a.day]
        )
      }

      await query('COMMIT')
    } catch (err) {
      await query('ROLLBACK')
      throw err
    }

    return NextResponse.json({ ok: true, replaced: valid.length })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
