import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    // Check if section has assignments
    const assignments = await query(
      'SELECT COUNT(*) FROM schedule_assignments WHERE section_id = $1',
      [id]
    )
    if (parseInt(assignments.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar: la sección tiene clases asignadas. Borra el horario primero.' },
        { status: 409 }
      )
    }
    await query('DELETE FROM sections WHERE id = $1', [id])
    return NextResponse.json({ message: 'Sección eliminada' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
