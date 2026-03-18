'use client'
import Link from 'next/link'
import StatCard from '@/components/dashboard/StatCard'
import WorkloadChart from '@/components/dashboard/WorkloadChart'

export default function DashboardClient({ teachers, assignments, sections, subjects, error }) {
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-error/10 border border-error/30 rounded p-6 text-center max-w-lg mx-auto">
          <span className="material-symbols-outlined text-error text-[40px] mb-3 block">database</span>
          <h2 className="font-serif text-xl font-bold text-white mb-2">Base de datos no conectada</h2>
          <p className="text-sm text-white/60 mb-4">
            Configura tu <code className="bg-white/10 px-1 rounded text-secondary">DATABASE_URL</code> en{' '}
            <code className="bg-white/10 px-1 rounded text-secondary">.env.local</code> y ejecuta la inicialización.
          </p>
          <button
            onClick={() => fetch('/api/seed', { method: 'POST' }).then(() => window.location.reload())}
            className="px-4 py-2 bg-secondary text-primary text-sm font-bold rounded hover:bg-secondary-light transition-colors"
          >
            Inicializar Base de Datos
          </button>
        </div>
      </div>
    )
  }

  const totalTeachers = teachers.length
  const totalAssignments = assignments.length
  const teachersWithClasses = teachers.filter(t => (t.assigned_hours || 0) > 0).length
  const overloadedTeachers = teachers.filter(t => (t.assigned_hours || 0) > t.max_hours)
  const totalConflicts = overloadedTeachers.length

  // Subject distribution by section
  const sectionSubjectData = sections.map(sec => {
    const secAssignments = assignments.filter(a => a.section_id === sec.id)
    return {
      section: `${sec.grade}${sec.section}`,
      total: secAssignments.length,
    }
  })

  const assignedPct = teachers.length > 0
    ? Math.round((teachersWithClasses / totalTeachers) * 100)
    : 0

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-primary-dark pb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">Resumen Ejecutivo</h2>
          <p className="text-white/50 text-sm mt-1">Estado actual de la programación académica</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded px-3 py-1.5">
            <span className="material-symbols-outlined text-white/50 text-[18px]">calendar_today</span>
            <span className="text-sm font-medium text-white">Ciclo 2026-2027</span>
          </div>
          <Link
            href="/horarios-secundaria"
            className="flex items-center gap-2 bg-secondary hover:bg-secondary-light text-primary font-medium text-sm px-4 py-1.5 rounded shadow-card transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nueva Asignación
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Horas Asignadas"
          value={totalAssignments}
          unit="horas asignadas"
          icon="schedule"
          progress={assignedPct}
          progressTarget={`Cobertura docente: ${assignedPct}%`}
        />
        <StatCard
          title="Conflictos"
          value={totalConflicts}
          icon="warning"
          variant="error"
          trendValue={totalConflicts > 0 ? 'Críticos' : 'Sin conflictos'}
          progress={totalConflicts > 0 ? Math.min(100, (totalConflicts / totalTeachers) * 100) : 0}
          progressTarget={totalConflicts > 0 ? 'Requiere atención inmediata' : 'Todo en orden'}
        />
        <StatCard
          title="Cobertura Docente"
          value={`${assignedPct}%`}
          icon="groups"
          variant="success"
          trendValue="Óptimo"
          progress={assignedPct}
          progressTarget={`${teachersWithClasses} de ${totalTeachers} profesores activos`}
        />
        <StatCard
          title="Total Profesores"
          value={totalTeachers}
          icon="person"
          trendValue="Registrados"
          progress={(totalTeachers / Math.max(totalTeachers, 1)) * 100}
          progressTarget={`${totalTeachers} en el sistema`}
        />
      </div>

      {/* Charts Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workload Chart */}
        <div className="lg:col-span-2">
          <WorkloadChart teachers={teachers} />
        </div>

        {/* Alerts Panel */}
        <div className="bg-primary/20 border border-primary-dark rounded shadow-card flex flex-col overflow-hidden">
          <div className="p-5 border-b border-primary-dark flex items-center justify-between">
            <h3 className="text-lg font-serif font-bold text-white">Alertas Recientes</h3>
            {overloadedTeachers.length > 0 && (
              <span className="bg-error text-white text-[10px] font-bold px-2 py-1 rounded-full">
                {overloadedTeachers.length} NUEVA{overloadedTeachers.length > 1 ? 'S' : ''}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {overloadedTeachers.length === 0 && totalConflicts === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-success text-[40px] block mb-2">check_circle</span>
                <p className="text-sm font-bold text-success">Sin conflictos detectados</p>
                <p className="text-xs text-white/50 mt-1">El horario está en buen estado</p>
              </div>
            ) : (
              <ul className="divide-y divide-primary/20">
                {overloadedTeachers.map(t => (
                  <li key={t.id} className="p-4 border-l-4 border-error bg-error/10">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-error text-[20px] mt-0.5">error</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">Sobrecarga Docente</p>
                        <p className="text-xs text-white/70 mt-1">
                          <span className="font-semibold">{t.name}</span> excede el límite semanal (
                          {t.assigned_hours}h / {t.max_hours}h)
                        </p>
                        <Link
                          href="/profesores"
                          className="mt-2 inline-block text-xs font-bold text-error border border-error/30 bg-error/10 px-2 py-1 rounded hover:bg-error hover:text-white transition-all uppercase tracking-wide"
                        >
                          Resolver
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-3 bg-primary/30 border-t border-primary-dark text-center">
            <Link
              href="/profesores"
              className="text-xs font-bold text-white/70 uppercase tracking-wider hover:text-secondary transition-colors"
            >
              Ver Directorio Completo
            </Link>
          </div>
        </div>
      </div>

      {/* Section Summary Table */}
      <div className="bg-primary/20 border border-primary-dark rounded shadow-card overflow-hidden">
        <div className="p-5 border-b border-primary-dark">
          <h3 className="text-lg font-serif font-bold text-white">Distribución por Sección</h3>
          <p className="text-xs text-white/50 mt-1">Resumen de clases asignadas por grado y sección</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary text-secondary">
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Sección</th>
                <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">Clases Asignadas</th>
                <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">Progreso</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/20">
              {sections.map(sec => {
                const count = assignments.filter(a => a.section_id === sec.id).length
                const maxPossible = 45 // 5 days × 9 regular slots approx
                const pct = Math.min(100, Math.round((count / maxPossible) * 100))
                return (
                  <tr key={sec.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-serif font-bold text-white text-base">
                        {sec.grade}° {sec.section}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center font-tabular font-bold text-white/80">{count}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-secondary rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/50 font-tabular w-8">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`${sec.grade >= 10 ? '/horarios-bachillerato' : '/horarios-secundaria'}?grade=${sec.grade}&section=${sec.section}`}
                        className="text-xs font-bold text-secondary hover:text-white border border-secondary/30 px-2 py-1 rounded hover:border-secondary transition-colors"
                      >
                        Ver Horario
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {[
          { href: '/profesores', title: 'Directorio Docente', desc: 'Gestionar perfiles y disponibilidad', icon: 'person_search' },
          { href: '/configuracion', title: 'Configuración Académica', desc: 'Ajustar bloques y restricciones', icon: 'settings' },
          { href: '/horarios-bachillerato', title: 'Horarios Bachillerato', desc: 'Crear y editar horarios de bachillerato', icon: 'school' },
          { href: '/horarios-secundaria', title: 'Horarios Secundaria', desc: 'Crear y editar horarios de secundaria', icon: 'calendar_month' },
          { href: '/horarios-primaria', title: 'Horarios Primaria', desc: 'Crear y editar horarios de primaria', icon: 'school' },
        ].map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-primary/20 border border-primary-dark rounded p-5 shadow-card hover:shadow-md transition-shadow cursor-pointer group flex items-center justify-between"
          >
            <div>
              <h4 className="font-bold text-white mb-1 group-hover:text-secondary transition-colors">
                {link.title}
              </h4>
              <p className="text-xs text-white/50">{link.desc}</p>
            </div>
            <div className="w-10 h-10 rounded bg-secondary/20 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined">{link.icon}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
