'use client'
import { useDroppable } from '@dnd-kit/core'

export default function ScheduleCell({ id, assignment, slotId, day, isDragging, dragState, isOver, onRemove }) {
  const { setNodeRef } = useDroppable({ id, data: { slotId, day } })

  // ── Occupied cell (teacher assigned) ──────────────────────────────────────
  if (assignment?.teacher_id) {
    const color = assignment.subject_color || '#1B2A4E'
    return (
      <div className={`p-0.5 h-[52px] relative group border-b border-border-std transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}>
        <div
          className="w-full h-full rounded p-1 flex flex-col justify-between bg-white shadow-card"
          style={{ border: `3px solid ${color}` }}
        >
          <div className="flex justify-between items-start gap-0.5">
            <span
              className="text-[11px] font-extrabold uppercase tracking-wide leading-tight truncate"
              style={{ color }}
            >
              {assignment.subject_name}
            </span>
            {!isDragging && (
              <button
                onClick={() => onRemove(assignment.id)}
                aria-label={`Quitar ${assignment.subject_name}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 rounded hover:bg-gray-100"
                style={{ color }}
              >
                <span className="material-symbols-outlined text-[10px]" aria-hidden="true">close</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-text-muted font-medium leading-tight truncate">
            {assignment.teacher_name}
          </p>
        </div>
      </div>
    )
  }

  // ── Empty cell ─────────────────────────────────────────────────────────────
  // dragState: null (not dragging) | { blocked, occupied, teacherBusy } (dragging)
  const isBlocked = dragState?.blocked
  const isAvailable = isDragging && !isBlocked

  let bg, border, content

  if (isOver && isDragging) {
    // Hovering — show prominent indicator
    if (isBlocked) {
      bg = 'var(--color-error-light)'
      border = '1px solid var(--color-error)'
      content = (
        <div className="flex flex-col items-center justify-center h-full gap-0.5">
          <span className="material-symbols-outlined text-error text-[14px]" aria-hidden="true">block</span>
          <span className="text-[8px] font-bold text-error uppercase tracking-wide text-center leading-tight px-0.5">
            {dragState.teacherBusy ? 'Ocupado' : 'Celda'}
          </span>
        </div>
      )
    } else {
      bg = 'var(--color-success-light)'
      border = '1px solid var(--color-success)'
      content = (
        <div className="flex flex-col items-center justify-center h-full gap-0.5">
          <span className="material-symbols-outlined text-success text-[14px]" aria-hidden="true">add_circle</span>
          <span className="text-[8px] font-bold text-success uppercase tracking-wide">Soltar</span>
        </div>
      )
    }
  } else if (isDragging) {
    // Not hovering but dragging — color all cells
    if (isBlocked) {
      bg = 'var(--color-error-light)'
      border = '1px solid var(--color-conflict)'
      content = null
    } else {
      bg = 'var(--color-success-light)'
      border = '1px solid var(--color-success)'
      content = null
    }
  } else {
    // Normal state
    bg = 'white'
    border = '1px dashed #CBD5E1'
    content = null
  }

  return (
    <div ref={setNodeRef} className="p-0.5 h-[52px] relative group border-b border-border-std">
      <div
        className="w-full h-full rounded flex items-center justify-center transition-all duration-150"
        style={{ backgroundColor: bg, border }}
      >
        {content}
        {!isDragging && (
          <span className="text-[8px] text-text-muted opacity-0 group-hover:opacity-60 select-none">
            Arrastrar
          </span>
        )}
      </div>
    </div>
  )
}
