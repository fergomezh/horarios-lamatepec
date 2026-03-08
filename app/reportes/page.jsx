import AppLayout from '@/components/layout/AppLayout'
import ReportesClient from './ReportesClient'

export const dynamic = 'force-dynamic'

async function getData() {
  try {
    const { query } = await import('@/lib/db')

    const [teachersRes, subjectsRes, sectionsRes, assignmentsRes] = await Promise.all([
      query(`
        SELECT t.*, s.name as subject_name, s.color as subject_color,
          COALESCE(COUNT(sa.id), 0)::int as assigned_hours
        FROM teachers t
        LEFT JOIN subjects s ON t.subject_id = s.id
        LEFT JOIN schedule_assignments sa ON sa.teacher_id = t.id
          JOIN schedule_options so ON so.id = sa.option_id AND so.is_principal = true
        GROUP BY t.id, s.name, s.color
        ORDER BY assigned_hours DESC
      `),
      query('SELECT * FROM subjects ORDER BY name'),
      query('SELECT * FROM sections ORDER BY grade, section'),
      query(`
        SELECT sa.*,
          t.name as teacher_name,
          s.name as subject_name, s.color as subject_color,
          sec.grade, sec.section
        FROM schedule_assignments sa
        JOIN schedule_options so ON so.id = sa.option_id AND so.is_principal = true
        JOIN teachers t ON sa.teacher_id = t.id
        JOIN subjects s ON sa.subject_id = s.id
        JOIN sections sec ON sa.section_id = sec.id
      `),
    ])

    return {
      teachers: teachersRes.rows,
      subjects: subjectsRes.rows,
      sections: sectionsRes.rows,
      assignments: assignmentsRes.rows,
    }
  } catch {
    return { teachers: [], subjects: [], sections: [], assignments: [], error: true }
  }
}

export default async function ReportesPage() {
  const data = await getData()
  return (
    <AppLayout>
      <ReportesClient {...data} />
    </AppLayout>
  )
}
