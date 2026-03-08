'use client'
import { useEffect } from 'react'

export default function SubjectPickerModal({ teacher, slotId, day, slots, onConfirm, onCancel }) {
  const slot = slots?.find(s => s.id === slotId)
  const subjects = teacher?.subjects || []

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" style={{ overscrollBehavior: 'contain' }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subject-picker-title"
        className="bg-white rounded shadow-floating w-full max-w-sm mx-4 overflow-hidden overscroll-contain"
      >
        {/* Header */}
        <div className="bg-primary px-5 py-4 flex items-start justify-between">
          <div>
            <p className="text-secondary text-[10px] uppercase tracking-widest font-bold mb-1">
              Asignar clase
            </p>
            <h3 id="subject-picker-title" className="text-white font-serif font-bold text-lg leading-tight">
              {teacher?.name}
            </h3>
            <p className="text-white/60 text-xs mt-0.5">
              {day} · {slot ? `${slot.start_time}–${slot.end_time}` : ''}
            </p>
          </div>
          <button onClick={onCancel} aria-label="Cerrar modal" className="text-white/50 hover:text-white mt-0.5">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Subject list */}
        <div className="p-4">
          <p className="text-[11px] uppercase tracking-wider font-bold text-text-muted mb-3">
            Selecciona la materia a impartir
          </p>
          {subjects.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">
              Este profesor no tiene materias asignadas.
            </p>
          ) : (
            <div className="space-y-2">
              {subjects.map(subject => (
                <button
                  key={subject.id}
                  onClick={() => onConfirm(subject)}
                  className="w-full flex items-center gap-3 p-3 rounded border border-border-std hover:border-primary hover:bg-background transition-all text-left group"
                >
                  <div
                    className="w-9 h-9 rounded flex items-center justify-center shrink-0"
                    style={{ backgroundColor: subject.color + '20' }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-main group-hover:text-primary">
                      {subject.name}
                    </p>
                    <p className="text-xs text-text-muted">{subject.weekly_hours} hrs/semana</p>
                  </div>
                  <span className="material-symbols-outlined text-border-std group-hover:text-primary text-[18px] transition-colors">
                    arrow_forward
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onCancel}
            className="w-full py-2 text-xs font-bold text-text-muted border border-border-std rounded hover:bg-background transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
