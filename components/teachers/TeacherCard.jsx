'use client'
import { useDraggable } from '@dnd-kit/core'
import { getInitials } from '@/lib/schedule-utils'

export default function TeacherCard({ teacher, isDragging = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isCurrentlyDragging } = useDraggable({
    id: `teacher-${teacher.id}`,
    data: { type: 'teacher', teacher },
  })

  const pct = teacher.max_hours > 0
    ? Math.min(100, Math.round((teacher.assigned_hours / teacher.max_hours) * 100))
    : 0
  const isFull = pct >= 100
  const isOverloaded = teacher.assigned_hours > teacher.max_hours

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      suppressHydrationWarning
      className={`bg-white p-2 rounded border border-border-std shadow-card cursor-grab active:cursor-grabbing
        hover:border-primary hover:shadow-md transition-all group flex items-center gap-2 select-none
        ${isCurrentlyDragging ? 'opacity-40' : ''}
        ${isFull ? 'opacity-60' : ''}`}
    >
      {/* Avatar */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
        style={{ backgroundColor: '#1B2A4E' }}
      >
        {getInitials(teacher.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <p className="text-xs font-bold text-text-main truncate">{teacher.name}</p>
          <span className="material-symbols-outlined text-text-muted text-[14px] opacity-0 group-hover:opacity-100 cursor-grab shrink-0" aria-hidden="true">
            drag_indicator
          </span>
        </div>
        {/* Subjects */}
        {(teacher.subjects || []).length > 0 ? (
          <div className="flex flex-wrap gap-0.5 mt-0.5">
            {(teacher.subjects || []).map(s => (
              <span
                key={s.id}
                className="text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded"
                style={{ backgroundColor: s.color + '20', color: s.color }}
              >
                {s.name.split(' ')[0]}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-text-muted truncate">Sin materia</p>
        )}

        {/* Workload bar */}
        <div className="mt-1">
          <div className="h-0.5 flex-1 bg-border-std rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isOverloaded ? 'bg-error' : 'bg-secondary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
