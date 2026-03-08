import AppLayout from '@/components/layout/AppLayout'
import ConfiguracionClient from './ConfiguracionClient'

export const dynamic = 'force-dynamic'

async function getData() {
  try {
    const { query } = await import('@/lib/db')
    const [subjectsRes, slotsRes, gradeHoursRes, sectionsRes] = await Promise.all([
      query('SELECT * FROM subjects ORDER BY name'),
      query('SELECT * FROM schedule_slots ORDER BY period'),
      query('SELECT * FROM subject_grade_hours ORDER BY subject_id, grade'),
      query('SELECT * FROM sections ORDER BY grade, section'),
    ])
    return {
      subjects: subjectsRes.rows,
      slots: slotsRes.rows,
      gradeHours: gradeHoursRes.rows,
      sections: sectionsRes.rows,
    }
  } catch {
    return { subjects: [], slots: [], gradeHours: [], sections: [], error: true }
  }
}

export default async function ConfiguracionPage() {
  const data = await getData()
  return (
    <AppLayout>
      <ConfiguracionClient {...data} />
    </AppLayout>
  )
}
