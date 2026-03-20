import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// DELETE /api/schedule-options/[id] — delete a schedule option and its assignments
export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    // Check it exists
    const existing = await query('SELECT * FROM schedule_options WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Opción no encontrada' }, { status: 404 })
    }

    // Cannot delete if it's the only option
    const countRes = await query('SELECT COUNT(*)::int as cnt FROM schedule_options')
    if (countRes.rows[0].cnt <= 1) {
      return NextResponse.json({ error: 'No se puede eliminar la única opción de horario' }, { status: 400 })
    }

    const wasPrincipal = existing.rows[0].is_principal

    await query('BEGIN')
    try {
      // Delete assignments for this option
      await query('DELETE FROM schedule_assignments WHERE option_id = $1', [id])
      // Delete the option
      await query('DELETE FROM schedule_options WHERE id = $1', [id])

      // If we deleted the principal, promote the first remaining one
      if (wasPrincipal) {
        const first = await query('SELECT id FROM schedule_options ORDER BY sort_order, id LIMIT 1')
        if (first.rows.length > 0) {
          await query('UPDATE schedule_options SET is_principal = true WHERE id = $1', [first.rows[0].id])
        }
      }

      await query('COMMIT')
    } catch (err) {
      await query('ROLLBACK')
      throw err
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/schedule-options/[id] — update label or set as principal
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await query('SELECT * FROM schedule_options WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Opción no encontrada' }, { status: 404 })
    }

    // Update label if provided
    if (body.label !== undefined) {
      await query('UPDATE schedule_options SET label = $1 WHERE id = $2', [body.label, id])
    }

    // Set as principal: unset all others IN THE SAME LEVEL, set this one
    if (body.is_principal === true) {
      const optLevel = existing.rows[0].level ?? 'secundaria'
      await query('BEGIN')
      try {
        await query(
          `UPDATE schedule_options SET is_principal = false WHERE COALESCE(level, 'secundaria') = $1`,
          [optLevel]
        )
        await query('UPDATE schedule_options SET is_principal = true WHERE id = $1', [id])
        await query('COMMIT')
      } catch (err) {
        await query('ROLLBACK')
        throw err
      }
    }

    const updated = await query('SELECT * FROM schedule_options WHERE id = $1', [id])
    return NextResponse.json(updated.rows[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
