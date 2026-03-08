import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    await query('DELETE FROM schedule_assignments WHERE id = $1', [id])
    return NextResponse.json({ message: 'Asignación eliminada' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
