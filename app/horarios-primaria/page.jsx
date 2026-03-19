import AppLayout from '@/components/layout/AppLayout'
import HorariosPrimariaClient from './HorariosPrimariaClient'

export const dynamic = 'force-dynamic'

async function runPrimariaMigrations(query) {
  // Add level columns (idempotent — also run in /horarios-secundaria for safety)
  await query(`ALTER TABLE schedule_slots ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'secundaria'`)
  await query(`ALTER TABLE schedule_options ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'secundaria'`)

  // Insert primaria slots if they don't exist yet
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM schedule_slots WHERE level = 'primaria' LIMIT 1) THEN
        INSERT INTO schedule_slots (period, start_time, end_time, is_special, special_type, label, level) VALUES
          (1,  '07:00', '07:45', false, null,       'Período 1', 'primaria'),
          (2,  '07:45', '08:30', false, null,       'Período 2', 'primaria'),
          (3,  '08:30', '08:50', true,  'recreo',   'Recreo',    'primaria'),
          (4,  '08:50', '09:35', false, null,       'Período 3', 'primaria'),
          (5,  '09:35', '10:20', false, null,       'Período 4', 'primaria'),
          (6,  '10:20', '11:05', false, null,       'Período 5', 'primaria'),
          (7,  '11:05', '11:50', false, null,       'Período 6', 'primaria'),
          (8,  '11:50', '12:20', true,  'almuerzo', 'Almuerzo',  'primaria'),
          (9,  '12:20', '13:05', false, null,       'Período 7', 'primaria'),
          (10, '13:05', '13:50', false, null,       'Período 8', 'primaria');
      END IF;
    END $$;
  `)

  // Create a default primaria schedule option if none exists
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM schedule_options WHERE level = 'primaria' LIMIT 1) THEN
        INSERT INTO schedule_options (label, is_principal, sort_order, level)
        VALUES ('Horario 1', true, 0, 'primaria');
      END IF;
    END $$;
  `)

  // Remove orphaned assignments: grade 1–6 sections assigned with non-primaria slots.
  // These were created before the primaria module existed (using secundaria slots)
  // and can't be displayed or edited from any schedule module.
  await query(`
    DELETE FROM schedule_assignments
    WHERE id IN (
      SELECT sa.id
      FROM schedule_assignments sa
      JOIN sections sec ON sec.id = sa.section_id
      JOIN schedule_slots ss ON ss.id = sa.slot_id
      WHERE sec.grade <= 6
        AND COALESCE(ss.level, 'secundaria') != 'primaria'
    )
  `)
}

async function getData() {
  try {
    const { query } = await import('@/lib/db')
    await runPrimariaMigrations(query)

    const [teachersRes, subjectsRes, sectionsRes, slotsRes, optionsRes, assignmentsRes, gradeHoursRes] = await Promise.all([
      query(`
        SELECT t.*,
          COUNT(DISTINCT CASE WHEN so.is_principal = true AND ss.level = 'primaria' THEN sa.id END)::int as assigned_hours,
          COALESCE(
            JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', s.id, 'name', s.name, 'color', s.color, 'weekly_hours', s.weekly_hours))
            FILTER (WHERE s.id IS NOT NULL),
            '[]'
          ) as subjects
        FROM teachers t
        LEFT JOIN teacher_subjects ts ON ts.teacher_id = t.id
        LEFT JOIN subjects s ON s.id = ts.subject_id
        LEFT JOIN schedule_assignments sa ON sa.teacher_id = t.id
        LEFT JOIN schedule_options so ON so.id = sa.option_id
        LEFT JOIN schedule_slots ss ON ss.id = sa.slot_id
        GROUP BY t.id
        ORDER BY t.name
      `),
      query('SELECT * FROM subjects ORDER BY name'),
      query('SELECT * FROM sections WHERE grade <= 6 ORDER BY grade, section'),
      query("SELECT * FROM schedule_slots WHERE level = 'primaria' ORDER BY period"),
      query("SELECT * FROM schedule_options WHERE level = 'primaria' ORDER BY sort_order, id"),
      query(`
        SELECT sa.*,
          t.name as teacher_name, t.color as teacher_color,
          s.name as subject_name, s.color as subject_color,
          ss.period, ss.start_time, ss.end_time
        FROM schedule_assignments sa
        LEFT JOIN teachers t ON sa.teacher_id = t.id
        LEFT JOIN subjects s ON sa.subject_id = s.id
        JOIN schedule_slots ss ON sa.slot_id = ss.id
        WHERE ss.level = 'primaria'
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
    return { teachers: [], subjects: [], sections: [], slots: [], scheduleOptions: [], gradeHours: [], error: true }
  }
}

export default async function HorariosPrimariaPage({ searchParams }) {
  const data = await getData()
  const params = await searchParams
  const initialGrade = params?.grade ? parseInt(params.grade) : undefined
  const initialSection = params?.section || undefined

  return (
    <AppLayout>
      <HorariosPrimariaClient {...data} initialGrade={initialGrade} initialSection={initialSection} />
    </AppLayout>
  )
}
