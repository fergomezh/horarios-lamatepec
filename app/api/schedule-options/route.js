import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/schedule-options — list all schedule options
export async function GET() {
  try {
    const result = await query(
      'SELECT * FROM schedule_options ORDER BY sort_order, id'
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/schedule-options — create a new schedule option
export async function POST(request) {
  try {
    const { label, sort_order } = await request.json()
    if (!label) {
      return NextResponse.json({ error: 'label es requerido' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO schedule_options (label, is_principal, sort_order)
       VALUES ($1, false, $2) RETURNING *`,
      [label, sort_order ?? 99]
    )
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
