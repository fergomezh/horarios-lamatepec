import AppLayout from '@/components/layout/AppLayout'
import ProfesoresClient from './ProfesoresClient'

export const dynamic = 'force-dynamic'

async function getData() {
  try {
    const { query } = await import('@/lib/db')
    const [teachersRes, subjectsRes] = await Promise.all([
      query(`
        SELECT t.*,
          COALESCE(COUNT(DISTINCT sa.id), 0)::int as assigned_hours,
          COALESCE(
            JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', s.id, 'name', s.name, 'color', s.color, 'weekly_hours', s.weekly_hours))
            FILTER (WHERE s.id IS NOT NULL),
            '[]'
          ) as subjects
        FROM teachers t
        LEFT JOIN teacher_subjects ts ON ts.teacher_id = t.id
        LEFT JOIN subjects s ON s.id = ts.subject_id
        LEFT JOIN schedule_assignments sa ON sa.teacher_id = t.id
          JOIN schedule_options so ON so.id = sa.option_id AND so.is_principal = true
        GROUP BY t.id
        ORDER BY t.name
      `),
      query('SELECT * FROM subjects ORDER BY name'),
    ])
    return { teachers: teachersRes.rows, subjects: subjectsRes.rows }
  } catch {
    return { teachers: [], subjects: [], error: true }
  }
}

export default async function ProfesoresPage() {
  const data = await getData()
  return (
    <AppLayout>
      <ProfesoresClient {...data} />
    </AppLayout>
  )
}
