import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query('SELECT * FROM subjects ORDER BY name')
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, color, weekly_hours } = body

    if (!name) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }

    const result = await query(
      'INSERT INTO subjects (name, color, weekly_hours) VALUES ($1, $2, $3) RETURNING *',
      [name, color || '#1B2A4E', weekly_hours || 5]
    )
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
