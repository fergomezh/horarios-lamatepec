'use client'
import WorkloadChart from '@/components/dashboard/WorkloadChart'
import { getInitials } from '@/lib/schedule-utils'

export default function ReportesClient({ teachers, subjects, sections, assignments, error }) {
  if (error) {
    return (
      <div className="p-8 text-center">
        <span className="material-symbols-outlined text-white/30 text-[48px] block mb-3">database</span>
        <p className="text-white/50">Base de datos no conectada</p>
      </div>
    )
  }

  const totalHours = assignments.length
  const teachersActive = teachers.filter(t => t.assigned_hours > 0).length
  const overloaded = teachers.filter(t => t.assigned_hours > t.max_hours).length

  // Distribution by section × subject
  const sectionData = sections.map(sec => {
    const secAssignments = assignments.filter(a => a.section_id === sec.id)
    const subjectBreakdown = subjects.map(sub => ({
      subject: sub,
      count: secAssignments.filter(a => a.subject_id === sub.id).length,
    })).filter(x => x.count > 0)

    // Teachers in this section
    const teacherIds = [...new Set(secAssignments.map(a => a.teacher_id))]
    const secTeachers = teachers.filter(t => teacherIds.includes(t.id))

    return {
      section: sec,
      label: `${sec.grade}° ${sec.section}`,
      subjectBreakdown,
      teachers: secTeachers,
      total: secAssignments.length,
    }
  })

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="border-b border-primary-dark pb-4">
        <h2 className="text-2xl font-serif font-bold text-white">Reportes Académicos</h2>
        <p className="text-white/50 text-sm mt-1">Análisis de carga docente y distribución de materias</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Profesores', value: teachers.length, icon: 'person', sub: 'Registrados en el sistema' },
          { title: 'Horas Asignadas', value: totalHours, icon: 'schedule', sub: 'Total de bloques asignados' },
          { title: 'Profesores Activos', value: teachersActive, icon: 'groups', sub: 'Con al menos 1 clase' },
          { title: 'Sobrecargas', value: overloaded, icon: 'warning', sub: 'Exceden carga máxima', variant: overloaded > 0 ? 'error' : 'default' },
        ].map((card, i) => (
          <div key={i} className={`bg-primary/20 border border-primary-dark rounded p-6 shadow-card ${card.variant === 'error' ? 'border-l-4 border-l-error' : ''}`}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xs font-bold tracking-widest text-white/60 uppercase">{card.title}</h3>
              <span className={`material-symbols-outlined ${card.variant === 'error' ? 'text-error' : 'text-white/30'}`}>
                {card.icon}
              </span>
            </div>
            <span className="font-serif text-[42px] font-bold text-white leading-none block">{card.value}</span>
            <p className="text-xs text-white/50 mt-2">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Workload Chart */}
      <WorkloadChart teachers={teachers} />

      {/* Section × Subject table */}
      <div className="bg-primary/20 border border-primary-dark rounded shadow-card overflow-hidden">
        <div className="p-5 border-b border-primary-dark">
          <h3 className="text-lg font-serif font-bold text-white">Distribución de Materias por Sección</h3>
          <p className="text-xs text-white/50 mt-1">Clases asignadas por sección y materia</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary">
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">Sección</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">Materia</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-secondary uppercase tracking-wider">Horas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/20">
              {sectionData.flatMap(({ label, subjectBreakdown }) =>
                subjectBreakdown.length === 0 ? (
                  <tr key={label}>
                    <td className="px-6 py-3 font-serif font-bold text-white">{label}</td>
                    <td className="px-6 py-3 text-white/50 italic text-xs" colSpan={2}>Sin clases asignadas</td>
                  </tr>
                ) : (
                  subjectBreakdown.map(({ subject, count }, idx) => (
                    <tr key={`${label}-${subject.id}`} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-3">
                        {idx === 0 ? (
                          <span className="font-serif font-bold text-white">{label}</span>
                        ) : (
                          <span className="text-transparent select-none">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: subject.color }} />
                          <span className="text-white/80">{subject.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center font-tabular font-bold text-white">{count}</td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team per section */}
      <div>
        <h3 className="text-lg font-serif font-bold text-white mb-4">Equipo Educador por Sección</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectionData.map(({ label, teachers: secTeachers, subjectBreakdown }) => (
            <div key={label} className="bg-primary/20 border border-primary-dark rounded p-4 shadow-card">
              <div className="flex items-center justify-between mb-3 border-b border-primary-dark pb-3">
                <h4 className="font-serif font-bold text-white text-base">Sección {label}</h4>
                <span className="text-xs text-white/50 font-tabular">{secTeachers.length} prof.</span>
              </div>
              {secTeachers.length === 0 ? (
                <p className="text-xs text-white/50 italic">Sin asignaciones</p>
              ) : (
                <ul className="space-y-2">
                  {secTeachers.map(teacher => {
                    const breakdown = subjectBreakdown.find(sb => {
                      const a = teacher
                      return sb.subject.id === a.subject_id
                    })
                    return (
                      <li key={teacher.id} className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: teacher.color || '#1B2A4E' }}
                        >
                          {getInitials(teacher.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{teacher.name}</p>
                          <p className="text-[10px] text-white/50 truncate">{teacher.subject_name}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
