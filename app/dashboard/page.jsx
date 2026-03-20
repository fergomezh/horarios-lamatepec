import AppLayout from '@/components/layout/AppLayout'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

async function purgeOrphanedAssignments(query) {
  try {
    // Ensure level columns exist before using them (same migration as horarios pages)
    await query(`ALTER TABLE schedule_slots    ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'secundaria'`)
    await query(`ALTER TABLE schedule_options  ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'secundaria'`)

    // Remove assignments that can never appear in any schedule module:
    // 1. Option level != slot level
    // 2. Section grade out of range for the option level
    await query(`
      DELETE FROM schedule_assignments
      WHERE id IN (
        SELECT sa.id FROM schedule_assignments sa
        JOIN schedule_options so ON so.id = sa.option_id
        JOIN schedule_slots ss ON ss.id = sa.slot_id
        WHERE COALESCE(so.level, 'secundaria') != COALESCE(ss.level, 'secundaria')
        UNION
        SELECT sa.id FROM schedule_assignments sa
        JOIN schedule_options so ON so.id = sa.option_id
        JOIN sections sec ON sec.id = sa.section_id
        WHERE (COALESCE(so.level, 'secundaria') = 'bachillerato' AND sec.grade < 10)
           OR (COALESCE(so.level, 'secundaria') = 'primaria'     AND sec.grade > 6)
           OR (COALESCE(so.level, 'secundaria') = 'secundaria'   AND (sec.grade < 7 OR sec.grade > 9))
      )
    `)
  } catch {
    // Non-fatal: tables may not exist yet on very first load
  }
}

async function getData() {
  try {
    const { query } = await import('@/lib/db')
    await purgeOrphanedAssignments(query)

    const [teachersRes, assignmentsRes, sectionsRes, subjectsRes] = await Promise.all([
      query(`
        SELECT t.*,
          COUNT(DISTINCT CASE WHEN so.is_principal = true THEN sa.id END)::int as assigned_hours,
          COALESCE(
            JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', s.id, 'name', s.name, 'color', s.color))
            FILTER (WHERE s.id IS NOT NULL),
            '[]'
          ) as subjects
        FROM teachers t
        LEFT JOIN teacher_subjects ts ON ts.teacher_id = t.id
        LEFT JOIN subjects s ON s.id = ts.subject_id
        LEFT JOIN schedule_assignments sa ON sa.teacher_id = t.id
        LEFT JOIN schedule_options so ON so.id = sa.option_id
        GROUP BY t.id
        ORDER BY assigned_hours DESC
      `),
      query(`
        SELECT sa.* FROM schedule_assignments sa
        JOIN schedule_options so ON so.id = sa.option_id AND so.is_principal = true
      `),
      query('SELECT * FROM sections'),
      query('SELECT * FROM subjects'),
    ])

    return {
      teachers: teachersRes.rows,
      assignments: assignmentsRes.rows,
      sections: sectionsRes.rows,
      subjects: subjectsRes.rows,
    }
  } catch {
    return { teachers: [], assignments: [], sections: [], subjects: [], error: true }
  }
}

export default async function DashboardPage() {
  const data = await getData()

  return (
    <AppLayout>
      <DashboardClient {...data} />
    </AppLayout>
  )
}
