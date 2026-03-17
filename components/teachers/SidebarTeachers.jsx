'use client'
import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import TeacherCard from './TeacherCard'
import Link from 'next/link'

function CancelZone({ isDragging }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'sidebar-cancel' })

  if (!isDragging) return null

  return (
    <div
      ref={setNodeRef}
      className={`mx-3 mb-3 flex items-center justify-center gap-2 py-2.5 rounded border-2 border-dashed text-xs font-bold uppercase tracking-wide transition-all ${
        isOver
          ? 'border-error bg-error-light text-error'
          : 'border-white/20 text-white/50 bg-primary'
      }`}
    >
      <span className="material-symbols-outlined text-[16px]">undo</span>
      {isOver ? 'Soltar para cancelar' : 'Regresar al sidebar'}
    </div>
  )
}

export default function SidebarTeachers({ teachers, isDragging, onTeacherSelect, selectedTeacherId }) {
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')

  // Unique subjects across all teachers, sorted by name
  const allSubjects = [...new Map(
    teachers.flatMap(t => t.subjects || []).map(s => [s.id, s])
  ).values()].sort((a, b) => a.name.localeCompare(b.name))

  const filtered = teachers.filter(t => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.subjects || []).some(s => s.name.toLowerCase().includes(search.toLowerCase()))
    const matchSubject = !subjectFilter || (t.subjects || []).some(s => s.id === subjectFilter)
    return matchSearch && matchSubject
  })

  return (
    <aside className="w-[280px] bg-primary/95 border-r border-primary-dark flex flex-col shrink-0 z-10">
      <div className="p-4 border-b border-primary-dark bg-primary/80">
        <h3 className="font-serif font-bold text-white text-lg mb-3">Claustro Docente</h3>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-white/50 text-[20px]">search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Buscar profesor"
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-white/20 rounded focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 text-white placeholder-white/50 bg-white/10 shadow-card"
            placeholder="Buscar profesor…"
          />
        </div>
        <div className="relative mt-3">
          {subjectFilter && (
            <span
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full shrink-0 pointer-events-none"
              style={{ backgroundColor: allSubjects.find(s => s.id === subjectFilter)?.color }}
            />
          )}
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value ? Number(e.target.value) : '')}
            aria-label="Filtrar por materia"
            className={`w-full py-1.5 pr-8 text-xs font-bold border border-white/20 rounded appearance-none bg-white/10 text-white focus:outline-none focus:border-white/40 cursor-pointer hover:bg-white/20 transition-colors ${subjectFilter ? 'pl-7' : 'pl-3'}`}
          >
            <option value="" className="text-primary font-bold">Todas las materias</option>
            {allSubjects.map(s => (
              <option key={s.id} value={s.id} className="text-primary">{s.name}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-white/50 text-[18px] pointer-events-none" aria-hidden="true">
            expand_more
          </span>
        </div>
      </div>

      <CancelZone isDragging={isDragging} />

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-primary/80">
        {filtered.length === 0 ? (
          <p className="text-xs text-white/50 text-center py-4">No hay profesores</p>
        ) : (
          filtered.map(teacher => <TeacherCard key={teacher.id} teacher={teacher} onSelect={onTeacherSelect} isSelected={selectedTeacherId === teacher.id} />)
        )}
      </div>

      <div className="p-3 border-t border-primary-dark bg-primary/80 text-center">
        <Link
          href="/profesores"
          className="text-xs font-bold text-white/70 hover:text-secondary uppercase tracking-wider transition-colors"
        >
          Ver Directorio Completo
        </Link>
      </div>
    </aside>
  )
}
