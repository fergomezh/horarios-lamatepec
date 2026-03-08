import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * POST /api/migrate
 * Runs idempotent schema migrations to add schedule_options support.
 * Safe to run multiple times — uses IF NOT EXISTS and column existence checks.
 */
export async function POST() {
  try {
    await query('BEGIN')
    try {
      // 1. Create schedule_options table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS schedule_options (
          id SERIAL PRIMARY KEY,
          label VARCHAR(100) NOT NULL,
          is_principal BOOLEAN DEFAULT FALSE,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `)

      // 2. Add option_id column to schedule_assignments if it doesn't exist
      await query(`
        ALTER TABLE schedule_assignments
          ADD COLUMN IF NOT EXISTS option_id INTEGER REFERENCES schedule_options(id) ON DELETE CASCADE
      `)

      // 3. If schedule_options is empty, seed it with a default principal option
      //    and assign all existing assignments to it
      const optCount = await query('SELECT COUNT(*)::int as cnt FROM schedule_options')
      if (optCount.rows[0].cnt === 0) {
        const optRes = await query(
          `INSERT INTO schedule_options (label, is_principal, sort_order)
           VALUES ('Horario 1', true, 0) RETURNING id`
        )
        const principalId = optRes.rows[0].id

        // Assign all existing assignments (those without option_id) to principal
        await query(
          'UPDATE schedule_assignments SET option_id = $1 WHERE option_id IS NULL',
          [principalId]
        )
      } else {
        // If options already exist but some assignments have no option_id, assign to principal
        const principal = await query(
          'SELECT id FROM schedule_options WHERE is_principal = true ORDER BY id LIMIT 1'
        )
        if (principal.rows.length > 0) {
          await query(
            'UPDATE schedule_assignments SET option_id = $1 WHERE option_id IS NULL',
            [principal.rows[0].id]
          )
        }
      }

      await query('COMMIT')
    } catch (err) {
      await query('ROLLBACK')
      throw err
    }

    return NextResponse.json({ ok: true, message: 'Migración completada' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
