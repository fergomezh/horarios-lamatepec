import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// POST /api/migrate — applies one-time schema migrations
// Safe to run multiple times (idempotent)
export async function POST() {
  const results = []

  try {
    // Fix: drop the old UNIQUE(section_id, slot_id, day) constraint and replace
    // with UNIQUE(option_id, section_id, slot_id, day) so that the same slot can
    // be assigned differently in each schedule option.
    await query(`
      DO $$
      DECLARE
        r record;
      BEGIN
        -- Drop any unique constraint on schedule_assignments that covers
        -- (section_id, slot_id, day) but NOT option_id
        FOR r IN (
          SELECT c.conname
          FROM pg_constraint c
          WHERE c.conrelid = 'schedule_assignments'::regclass
            AND c.contype = 'u'
            AND NOT EXISTS (
              SELECT 1
              FROM pg_attribute a
              JOIN unnest(c.conkey) AS k(attnum) ON a.attnum = k.attnum
              WHERE a.attrelid = c.conrelid AND a.attname = 'option_id'
            )
        ) LOOP
          EXECUTE 'ALTER TABLE schedule_assignments DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
      END $$;
    `)
    results.push({ step: 'drop_old_unique', status: 'ok' })

    // Add the correct constraint (IF NOT EXISTS workaround via DO block)
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'schedule_assignments'::regclass
            AND contype = 'u'
            AND conname = 'schedule_assignments_option_section_slot_day_key'
        ) THEN
          ALTER TABLE schedule_assignments
            ADD CONSTRAINT schedule_assignments_option_section_slot_day_key
            UNIQUE (option_id, section_id, slot_id, day);
        END IF;
      END $$;
    `)
    results.push({ step: 'add_new_unique', status: 'ok' })

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message, results }, { status: 500 })
  }
}
