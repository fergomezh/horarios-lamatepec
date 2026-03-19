import AppLayout from '@/components/layout/AppLayout'
import HorariosBachilleratoClient from './HorariosBachilleratoClient'

export const dynamic = 'force-dynamic'

async function runBachilleratoMigrations(query) {
  // Add level columns (idempotent — also run in other level pages)
  await query(`ALTER TABLE schedule_slots ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'secundaria'`)
  await query(`ALTER TABLE schedule_options ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'secundaria'`)

  // Insert bachillerato slots if they don't exist yet (same structure as secundaria)
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM schedule_slots WHERE level = 'bachillerato' LIMIT 1) THEN
        INSERT INTO schedule_slots (period, start_time, end_time, is_special, special_type, label, level) VALUES
          (1,  '07:00', '07:45', false, null,       'Período 1',  'bachillerato'),
          (2,  '07:45', '08:30', false, null,       'Período 2',  'bachillerato'),
          (3,  '08:30', '09:15', false, null,       'Período 3',  'bachillerato'),
          (4,  '09:15', '09:35', true,  'recreo',   'Recreo',     'bachillerato'),
          (5,  '09:35', '10:20', false, null,       'Período 4',  'bachillerato'),
          (6,  '10:20', '11:05', false, null,       'Período 5',  'bachillerato'),
          (7,  '11:05', '11:50', false, null,       'Período 6',  'bachillerato'),
          (8,  '11:50', '12:35', false, null,       'Período 7',  'bachillerato'),
          (9,  '12:35', '13:05', true,  'almuerzo', 'Almuerzo',   'bachillerato'),
          (10, '13:05', '13:50', false, null,       'Período 8',  'bachillerato'),
          (11, '13:50', '14:25', false, null,       'Período 9',  'bachillerato'),
          (12, '14:25', '15:10', false, null,       'Período 10', 'bachillerato');
      END IF;
    END $$;
  `)

  // Add period 10 (14:25–15:10) if it doesn't exist yet
  await query(`
    INSERT INTO schedule_slots (period, start_time, end_time, is_special, special_type, label, level)
    SELECT 12, '14:25', '15:10', false, null, 'Período 10', 'bachillerato'
    WHERE NOT EXISTS (
      SELECT 1 FROM schedule_slots WHERE level = 'bachillerato' AND start_time = '14:25'
    )
  `)

  // Create a default bachillerato schedule option if none exists
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM schedule_options WHERE level = 'bachillerato' LIMIT 1) THEN
        INSERT INTO schedule_options (label, is_principal, sort_order, level)
        VALUES ('Horario 1', true, 0, 'bachillerato');
      END IF;
    END $$;
  `)

  // Remove orphaned assignments: grade 10+ sections assigned with non-bachillerato slots.
  // These were created before the bachillerato module existed (using secundaria slots)
  // and can't be displayed or edited from any schedule module.
  await query(`
    DELETE FROM schedule_assignments
    WHERE id IN (
      SELECT sa.id
      FROM schedule_assignments sa
      JOIN sections sec ON sec.id = sa.section_id
      JOIN schedule_slots ss ON ss.id = sa.slot_id
      WHERE sec.grade >= 10
        AND COALESCE(ss.level, 'secundaria') != 'bachillerato'
    )
  `)
}

async function getData() {
  try {
    const { query } = await import('@/lib/db')
    await runBachilleratoMigrations(query)

    const [teachersRes, subjectsRes, sectionsRes, slotsRes, optionsRes, assignmentsRes, gradeHoursRes] = await Promise.all([
      query(`
        SELECT t.*,
          COUNT(DISTINCT CASE WHEN so.is_principal = true AND ss.level = 'bachillerato' THEN sa.id END)::int as assigned_hours,
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
      query('SELECT * FROM sections WHERE grade >= 10 ORDER BY grade, section'),
      query("SELECT * FROM schedule_slots WHERE level = 'bachillerato' ORDER BY period"),
      query("SELECT * FROM schedule_options WHERE level = 'bachillerato' ORDER BY sort_order, id"),
      query(`
        SELECT sa.*,
          t.name as teacher_name, t.color as teacher_color,
          s.name as subject_name, s.color as subject_color,
          ss.period, ss.start_time, ss.end_time
        FROM schedule_assignments sa
        LEFT JOIN teachers t ON sa.teacher_id = t.id
        LEFT JOIN subjects s ON sa.subject_id = s.id
        JOIN schedule_slots ss ON sa.slot_id = ss.id
        WHERE ss.level = 'bachillerato'
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

export default async function HorariosBachilleratoPage({ searchParams }) {
  const data = await getData()
  const params = await searchParams
  const initialGrade = params?.grade ? parseInt(params.grade) : undefined
  const initialSection = params?.section || undefined

  return (
    <AppLayout>
      <HorariosBachilleratoClient {...data} initialGrade={initialGrade} initialSection={initialSection} />
    </AppLayout>
  )
}
