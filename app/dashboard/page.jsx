import AppLayout from '@/components/layout/AppLayout'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

async function getData() {
  try {
    const { query } = await import('@/lib/db')

    const [teachersRes, assignmentsRes, sectionsRes, subjectsRes] = await Promise.all([
      query(`
        SELECT t.*,
          COALESCE(COUNT(DISTINCT sa.id), 0)::int as assigned_hours,
          COALESCE(
            JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', s.id, 'name', s.name, 'color', s.color))
            FILTER (WHERE s.id IS NOT NULL),
            '[]'
          ) as subjects
        FROM teachers t
        LEFT JOIN teacher_subjects ts ON ts.teacher_id = t.id
        LEFT JOIN subjects s ON s.id = ts.subject_id
        LEFT JOIN schedule_assignments sa ON sa.teacher_id = t.id
          JOIN schedule_options so ON so.id = sa.option_id AND so.is_principal = true
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
