import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/schedule-options?level=primaria — list schedule options, optionally filtered by level
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')

    let sql = 'SELECT * FROM schedule_options'
    const values = []
    if (level) {
      sql += ` WHERE COALESCE(level, 'secundaria') = $1`
      values.push(level)
    }
    sql += ' ORDER BY sort_order, id'

    const result = await query(sql, values)
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/schedule-options — create a new schedule option
export async function POST(request) {
  try {
    const { label, sort_order, level } = await request.json()
    if (!label) {
      return NextResponse.json({ error: 'label es requerido' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO schedule_options (label, is_principal, sort_order, level)
       VALUES ($1, false, $2, $3) RETURNING *`,
      [label, sort_order ?? 99, level ?? 'secundaria']
    )
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
