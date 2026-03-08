import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query('SELECT * FROM subject_grade_hours ORDER BY subject_id, grade')
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const { subject_id, grade, weekly_hours } = await request.json()
    const result = await query(`
      INSERT INTO subject_grade_hours (subject_id, grade, weekly_hours)
      VALUES ($1, $2, $3)
      ON CONFLICT (subject_id, grade) DO UPDATE SET weekly_hours = EXCLUDED.weekly_hours
      RETURNING *
    `, [subject_id, grade, weekly_hours])
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
