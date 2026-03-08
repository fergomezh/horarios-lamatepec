import AppLayout from '@/components/layout/AppLayout'
import HorariosClient from './HorariosClient'

export const dynamic = 'force-dynamic'

async function getData() {
  try {
    const { query } = await import('@/lib/db')

    const [teachersRes, subjectsRes, sectionsRes, slotsRes, optionsRes, assignmentsRes, gradeHoursRes] = await Promise.all([
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
        GROUP BY t.id
        ORDER BY t.name
      `),
      query('SELECT * FROM subjects ORDER BY name'),
      query('SELECT * FROM sections ORDER BY grade, section'),
      query('SELECT * FROM schedule_slots ORDER BY period'),
      query('SELECT * FROM schedule_options ORDER BY sort_order, id'),
      query(`
        SELECT sa.*,
          t.name as teacher_name, t.color as teacher_color,
          s.name as subject_name, s.color as subject_color,
          ss.period, ss.start_time, ss.end_time
        FROM schedule_assignments sa
        LEFT JOIN teachers t ON sa.teacher_id = t.id
        LEFT JOIN subjects s ON sa.subject_id = s.id
        JOIN schedule_slots ss ON sa.slot_id = ss.id
        ORDER BY sa.option_id, ss.period, sa.day
      `),
      query('SELECT * FROM subject_grade_hours'),
    ])

    // Group assignments by option_id
    const assignmentsByOption = {}
    for (const row of assignmentsRes.rows) {
      const key = row.option_id
      if (!assignmentsByOption[key]) assignmentsByOption[key] = []
      assignmentsByOption[key].push(row)
    }

    // Build schedule options with their assignments and isPrincipal flag
    const scheduleOptions = optionsRes.rows.map(opt => ({
      id: opt.id,
      label: opt.label,
      isPrincipal: opt.is_principal,
      sortOrder: opt.sort_order,
      assignments: assignmentsByOption[opt.id] ?? [],
    }))

    return {
      teachers: teachersRes.rows,
      subjects: subjectsRes.rows,
      sections: sectionsRes.rows,
      slots: slotsRes.rows,
      scheduleOptions,
      gradeHours: gradeHoursRes.rows,
    }
  } catch {
    return { teachers: [], subjects: [], sections: [], slots: [], scheduleOptions: [], error: true }
  }
}

export default async function HorariosPage({ searchParams }) {
  const data = await getData()
  const params = await searchParams
  const initialGrade = params?.grade ? parseInt(params.grade) : undefined
  const initialSection = params?.section || undefined

  return (
    <AppLayout>
      <HorariosClient {...data} initialGrade={initialGrade} initialSection={initialSection} />
    </AppLayout>
  )
}
