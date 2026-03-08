'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import TeacherModal from '@/components/teachers/TeacherModal'
import TeacherScheduleModal from '@/components/teachers/TeacherScheduleModal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { getInitials } from '@/lib/schedule-utils'


const PAGE_SIZE = 10

export default function ProfesoresClient({ teachers: initialTeachers, subjects, error }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [teachers, setTeachers] = useState(initialTeachers)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null) // null | 'new' | teacher obj
  const [scheduleTeacher, setScheduleTeacher] = useState(null) // teacher obj for schedule modal
  const [confirmDelete, setConfirmDelete] = useState(null) // teacher obj to delete

  const filtered = teachers.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.email || '').toLowerCase().includes(search.toLowerCase())
    const matchDept = !deptFilter || (t.subjects || []).some(s => s.name === deptFilter)
    return matchSearch && matchDept
  })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const overloadedCount = teachers.filter(t => t.assigned_hours > t.max_hours).length
  const avgAvailability = teachers.length > 0
    ? Math.round(teachers.reduce((sum, t) => sum + Math.min(100, ((t.max_hours - t.assigned_hours) / t.max_hours) * 100), 0) / teachers.length)
    : 0

  const handleSave = async (formData) => {
    const isEdit = modal && modal.id
    const url = isEdit ? `/api/teachers/${modal.id}` : '/api/teachers'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Error al guardar')
    }

    const saved = await res.json()

    if (isEdit) {
      setTeachers(prev => prev.map(t => t.id === saved.id
        ? { ...saved, assigned_hours: t.assigned_hours ?? 0 }
        : t
      ))
    } else {
      setTeachers(prev => [...prev, { ...saved, assigned_hours: 0 }])
    }
    setModal(null)
  }

  const handleDelete = async (id) => {
    const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'Error al eliminar el docente')
      setConfirmDelete(null)
      return
    }
    setTeachers(prev => prev.filter(t => t.id !== id))
    setConfirmDelete(null)
    startTransition(() => router.refresh())
  }

  const depts = [...new Set(teachers.flatMap(t => (t.subjects || []).map(s => s.name)))]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="px-8 py-6 bg-primary border-b border-primary-dark flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-serif text-3xl font-bold text-white tracking-tight mb-1">
              Directorio Docente
            </h1>
            <p className="text-white/60 text-sm max-w-2xl">
              Gestión de carga académica, asignación departamental y disponibilidad horaria del personal.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Department filter */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-[20px]">
                filter_list
              </span>
              <select
                value={deptFilter}
                onChange={e => { setDeptFilter(e.target.value); setPage(1) }}
                className="pl-10 pr-8 h-10 w-48 appearance-none bg-white/10 border border-white/20 rounded text-sm font-medium text-white focus:border-white/40 focus:ring-0 cursor-pointer hover:bg-white/20"
              >
                <option value="">Todos los Dept.</option>
                {depts.map(d => <option key={d} value={d} className="text-primary">{d}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-white/50 text-[18px] pointer-events-none">
                expand_more
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-[20px]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="institutional-input pl-10 pr-4 h-10 w-64 bg-white/10 border border-white/20 rounded text-sm placeholder-white/50 text-white hover:bg-white/20"
                placeholder="Buscar profesor…"
              />
            </div>

            {/* New teacher button */}
            <button
              onClick={() => setModal('new')}
              className="flex items-center gap-2 px-4 h-10 bg-secondary text-primary text-sm font-medium rounded shadow-elevation hover:bg-secondary-light transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Nuevo Docente</span>
            </button>
          </div>
        </div>

        {/* Metrics bar */}
        <div className="flex gap-6 pt-2 border-t border-white/20 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Total Docentes:</span>
            <span className="font-serif text-lg font-bold text-white">{teachers.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Sobrecarga:</span>
            <span className={`font-serif text-lg font-bold ${overloadedCount > 0 ? 'text-error' : 'text-success'}`}>
              {overloadedCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Disponibilidad Promedio:</span>
            <span className="font-serif text-lg font-bold text-success">{avgAvailability}%</span>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="bg-primary/20 border border-primary-dark rounded shadow-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary border-b border-primary-dark">
                <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider w-[35%]">Docente</th>
                <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider w-[20%]">Departamento</th>
                <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider text-center w-[12%]">Carga Máx</th>
                <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider text-center w-[12%]">Asignado</th>
                <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider text-center w-[11%]">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider text-center w-[10%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/20">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/50 text-sm">
                    No hay profesores registrados
                  </td>
                </tr>
              ) : (
                paginated.map(teacher => {
                  const isOverloaded = teacher.assigned_hours > teacher.max_hours

                  return (
                    <tr
                      key={teacher.id}
                      className={`transition-colors ${
                        isOverloaded
                          ? 'bg-warning/30 hover:bg-warning/50 border-l-4 border-l-error'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-primary/30 shadow-sm shrink-0"
                            style={{ backgroundColor: teacher.color || '#1B2A4E' }}
                          >
                            {getInitials(teacher.name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white group-hover:text-secondary transition-colors">
                              {teacher.name}
                            </span>
                            <span className="text-xs text-white/50">{teacher.email || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {(teacher.subjects || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(teacher.subjects || []).map(s => (
                              <span
                                key={s.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                                style={{ backgroundColor: s.color + '18', color: s.color, borderColor: s.color + '40' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                {s.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-white/50">Sin materia</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`text-sm font-medium font-tabular ${isOverloaded ? 'text-error font-bold' : 'text-white/70'}`}>
                          {teacher.max_hours} h
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className={`flex items-center justify-center gap-1 text-sm font-medium font-tabular ${isOverloaded ? 'text-error font-bold' : 'text-white/70'}`}>
                          <span>{teacher.assigned_hours} h</span>
                          {isOverloaded && (
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">warning</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isOverloaded ? 'bg-error' : 'bg-secondary'}`}
                              style={{ width: `${Math.min(100, (teacher.assigned_hours / teacher.max_hours) * 100)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-tabular font-bold ${isOverloaded ? 'text-error' : 'text-white/50'}`}>
                            {Math.round((teacher.assigned_hours / Math.max(1, teacher.max_hours)) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setScheduleTeacher(teacher)}
                            className="p-1.5 text-white/50 hover:text-secondary hover:bg-secondary/10 rounded transition-all"
                            aria-label={`Ver horario de ${teacher.name}`}
                          >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">calendar_month</span>
                          </button>
                          <button
                            onClick={() => setModal(teacher)}
                            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded transition-all"
                            aria-label={`Editar a ${teacher.name}`}
                          >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
                          </button>
                          <button
                            onClick={() => setConfirmDelete(teacher)}
                            className="p-1.5 text-white/50 hover:text-error hover:bg-error/10 rounded transition-all"
                            aria-label={`Eliminar a ${teacher.name}`}
                          >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="bg-primary/80 px-6 py-3 border-t border-primary-dark flex items-center justify-between">
            <span className="text-xs text-white/60">
              {filtered.length === 0
                ? 'No hay resultados'
                : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length} docentes`
              }
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs font-medium text-white bg-white/10 border border-white/20 rounded hover:bg-white/20 disabled:opacity-30"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs font-medium text-white bg-white/10 border border-white/20 rounded hover:bg-white/20 disabled:opacity-30"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Modal */}
      {modal && (
        <TeacherModal
          teacher={modal === 'new' ? null : modal}
          subjects={subjects}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Teacher Schedule Modal */}
      {scheduleTeacher && (
        <TeacherScheduleModal
          teacher={scheduleTeacher}
          onClose={() => setScheduleTeacher(null)}
        />
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <ConfirmModal
          title={`Eliminar a ${confirmDelete.name}`}
          message="Se eliminarán todas sus asignaciones en el horario. Esta acción no se puede deshacer."
          confirmLabel="Sí, eliminar"
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
