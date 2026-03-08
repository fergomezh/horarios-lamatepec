import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { checkConflicts } from '@/lib/schedule-utils'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sectionId = searchParams.get('section_id')
    const teacherId = searchParams.get('teacher_id')
    const optionId = searchParams.get('option_id')

    let sql = `
      SELECT sa.*,
        t.name as teacher_name, t.color as teacher_color,
        s.name as subject_name, s.color as subject_color,
        sec.grade, sec.section,
        ss.period, ss.start_time, ss.end_time, ss.is_special, ss.special_type
      FROM schedule_assignments sa
      LEFT JOIN teachers t ON sa.teacher_id = t.id
      LEFT JOIN subjects s ON sa.subject_id = s.id
      JOIN sections sec ON sa.section_id = sec.id
      JOIN schedule_slots ss ON sa.slot_id = ss.id
    `
    const conditions = []
    const values = []

    if (optionId) {
      conditions.push(`sa.option_id = $${values.length + 1}`)
      values.push(optionId)
    }
    if (sectionId) {
      conditions.push(`sa.section_id = $${values.length + 1}`)
      values.push(sectionId)
    }
    if (teacherId) {
      conditions.push(`sa.teacher_id = $${values.length + 1}`)
      values.push(teacherId)
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ' ORDER BY ss.period, sa.day'

    const result = await query(sql, values)
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { teacher_id, subject_id, section_id, slot_id, day, block_type, label, option_id } = body

    if (!section_id || !slot_id || !day || !option_id) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // --- Block assignment (pause/break) ---
    if (block_type) {
      // Check section not already occupied in this option
      const existing = await query(
        'SELECT id FROM schedule_assignments WHERE option_id=$1 AND section_id=$2 AND slot_id=$3 AND day=$4',
        [option_id, section_id, slot_id, day]
      )
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'Esta celda ya tiene una asignación' }, { status: 409 })
      }

      const result = await query(
        `INSERT INTO schedule_assignments (option_id, section_id, slot_id, day, block_type, label)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [option_id, section_id, slot_id, day, block_type, label || block_type]
      )
      return NextResponse.json(result.rows[0], { status: 201 })
    }

    // --- Teacher assignment ---
    if (!teacher_id || !subject_id) {
      return NextResponse.json({ error: 'teacher_id y subject_id son requeridos' }, { status: 400 })
    }

    // Only check conflicts within the same option
    const allAssignments = await query(`
      SELECT sa.*, s.weekly_hours
      FROM schedule_assignments sa
      LEFT JOIN subjects s ON sa.subject_id = s.id
      WHERE sa.teacher_id IS NOT NULL AND sa.option_id = $1
    `, [option_id])
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

    if (conflict.hasConflict) {
      return NextResponse.json({ error: conflict.reason, conflict }, { status: 409 })
    }

    const result = await query(
      `INSERT INTO schedule_assignments (option_id, teacher_id, subject_id, section_id, slot_id, day)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [option_id, teacher_id, subject_id, section_id, slot_id, day]
    )

    const full = await query(
      `SELECT sa.*,
        t.name as teacher_name, t.color as teacher_color,
        s.name as subject_name, s.color as subject_color,
        ss.period, ss.start_time, ss.end_time
       FROM schedule_assignments sa
       LEFT JOIN teachers t ON sa.teacher_id = t.id
       LEFT JOIN subjects s ON sa.subject_id = s.id
       JOIN schedule_slots ss ON sa.slot_id = ss.id
       WHERE sa.id = $1`,
      [result.rows[0].id]
    )

    return NextResponse.json(full.rows[0], { status: 201 })
  } catch (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Esta celda ya tiene una asignación' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
