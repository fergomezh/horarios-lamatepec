import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, color, weekly_hours } = body

    const result = await query(
      'UPDATE subjects SET name=$1, color=$2, weekly_hours=$3 WHERE id=$4 RETURNING *',
      [name, color, weekly_hours, id]
    )
    if (!result.rows.length) {
      return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
    }
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    await query('DELETE FROM subjects WHERE id = $1', [id])
    return NextResponse.json({ message: 'Materia eliminada' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
