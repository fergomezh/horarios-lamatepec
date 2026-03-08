export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export const DEFAULT_SLOTS = [
  { period: 1,  start_time: '07:00', end_time: '07:45', is_special: false },
  { period: 2,  start_time: '07:45', end_time: '08:30', is_special: false },
  { period: 3,  start_time: '08:30', end_time: '09:15', is_special: false },
  { period: 4,  start_time: '09:15', end_time: '09:35', is_special: true, special_type: 'recreo',   label: 'Recreo' },
  { period: 5,  start_time: '09:35', end_time: '10:20', is_special: false },
  { period: 6,  start_time: '10:20', end_time: '11:05', is_special: false },
  { period: 7,  start_time: '11:05', end_time: '11:50', is_special: false },
  { period: 8,  start_time: '11:50', end_time: '12:35', is_special: false },
  { period: 9,  start_time: '12:35', end_time: '13:05', is_special: true, special_type: 'almuerzo', label: 'Almuerzo' },
  { period: 10, start_time: '13:05', end_time: '13:50', is_special: false },
  { period: 11, start_time: '13:50', end_time: '14:25', is_special: false },
]

export const SUBJECT_COLORS = {
  Matemáticas: '#1B2A4E',
  Ciencias: '#065F46',
  'Ciencias Naturales': '#065F46',
  Lenguaje: '#4C1D95',
  Historia: '#92400E',
  'Estudios Sociales': '#92400E',
  'Educación Física': '#0369A1',
  Arte: '#BE185D',
  Inglés: '#0F766E',
  Computación: '#3730A3',
  Religión: '#78350F',
  Música: '#9D174D',
  default: '#374151',
}

export function getSubjectColor(subjectName) {
  return SUBJECT_COLORS[subjectName] || SUBJECT_COLORS.default
}

export function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')
}

// gradeHours: array of { subject_id, grade, weekly_hours } — optional, falls back to subject.weekly_hours
export function checkConflicts(teacherId, subjectId, sectionId, slotId, day, allAssignments, subjects, grade, gradeHours) {
  // 1. Teacher already assigned in another section at same day/slot
  const teacherBusy = allAssignments.some(
    a =>
      a.teacher_id === teacherId &&
      a.slot_id === slotId &&
      a.day === day &&
      a.section_id !== sectionId
  )

  // 2. Section already has a class at this day/slot
  const sectionBusy = allAssignments.some(
    a => a.section_id === sectionId && a.slot_id === slotId && a.day === day
  )

  // 3. Subject at max weekly hours for this section's grade
  const subject = subjects?.find(s => s.id === subjectId)
  const gradeSpecific = grade && gradeHours
    ? gradeHours.find(gh => gh.subject_id === subjectId && gh.grade === grade)
    : null
  const maxHours = gradeSpecific?.weekly_hours ?? subject?.weekly_hours ?? 99

  const subjectCount = allAssignments.filter(
    a => a.subject_id === subjectId && a.section_id === sectionId
  ).length
  // maxHours === 0 means subject not taught at this grade
  const subjectFull = maxHours === 0 || subjectCount >= maxHours

  return {
    teacherBusy,
    sectionBusy,
    subjectFull,
    hasConflict: teacherBusy || sectionBusy || subjectFull,
    reason: teacherBusy
      ? 'Profesor ocupado en otra sección'
      : sectionBusy
        ? 'Sección ya tiene clase en este bloque'
        : subjectFull
          ? maxHours === 0
            ? 'Esta materia no se imparte en este grado'
            : `Materia alcanzó máximo semanal (${maxHours} hrs)`
          : null,
  }
}

export function getSubjectProgress(assignments, subjects, sectionId) {
  return subjects.map(subject => {
    const count = assignments.filter(
      a => a.subject_id === subject.id && a.section_id === sectionId
    ).length
    return {
      ...subject,
      assigned: count,
      complete: count >= subject.weekly_hours,
    }
  })
}
