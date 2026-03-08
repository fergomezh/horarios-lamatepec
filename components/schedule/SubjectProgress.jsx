'use client'

export default function SubjectProgress({ subjects, assignments, sectionId, grade, gradeHours = [] }) {
  const progress = subjects.map(subject => {
    const count = assignments.filter(
      a => a.subject_id === subject.id && a.section_id === sectionId
    ).length
    const gradeSpecific = grade ? gradeHours.find(gh => gh.subject_id === subject.id && gh.grade === grade) : null
    const maxHours = gradeSpecific?.weekly_hours ?? subject.weekly_hours
    const pct = maxHours > 0 ? Math.min(100, (count / maxHours) * 100) : 0
    return { ...subject, assigned: count, weekly_hours: maxHours, pct, complete: count >= maxHours, inactive: maxHours === 0 }
  }).filter(s => s.weekly_hours > 0) // hide subjects not taught at this grade

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {progress.map(s => (
        <div
          key={s.id}
          title={`${s.name}: ${s.assigned}/${s.weekly_hours} horas`}
          className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
            s.complete
              ? 'border-success/40 bg-success-light text-success'
              : 'border-white/20 bg-white/10 text-white/80'
          }`}
        >
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: s.color || '#1B2A4E' }}
          />
          <span>{s.name.split(' ')[0].substring(0, 4)}</span>
          <span className={`font-tabular ${s.complete ? 'text-success' : 'text-white'}`}>
            {s.assigned}/{s.weekly_hours}
          </span>
          {s.complete && (
            <span className="material-symbols-outlined text-[11px]" aria-hidden="true">check</span>
          )}
        </div>
      ))}
    </div>
  )
}
