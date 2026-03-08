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

export default function SidebarTeachers({ teachers, isDragging }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = teachers.filter(t => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.subjects || []).some(s => s.name.toLowerCase().includes(search.toLowerCase()))
    if (filter === 'available') return matchSearch && (t.assigned_hours || 0) < t.max_hours
    if (filter === 'full') return matchSearch && (t.assigned_hours || 0) >= t.max_hours
    return matchSearch
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
        <div className="flex gap-2 mt-3">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'available', label: 'Libre' },
            { key: 'full', label: 'Completo' },
          ].map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1 rounded-sm border transition-colors ${
                filter === btn.key
                  ? 'bg-white text-primary border-white'
                  : 'bg-transparent text-white/70 border-white/20 hover:bg-white/10 hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <CancelZone isDragging={isDragging} />

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-primary/80">
        {filtered.length === 0 ? (
          <p className="text-xs text-white/50 text-center py-4">No hay profesores</p>
        ) : (
          filtered.map(teacher => <TeacherCard key={teacher.id} teacher={teacher} />)
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
