'use client'
import { useEffect, useRef } from 'react'

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  variant = 'danger', // 'danger' | 'warning'
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null)

  // Focus confirm button on open, close on Escape
  useEffect(() => {
    confirmRef.current?.focus()
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const iconColor = variant === 'danger' ? 'text-error' : 'text-warning'
  const iconBg = variant === 'danger' ? 'bg-error-light' : 'bg-warning'
  const confirmCls = variant === 'danger'
    ? 'bg-error hover:bg-red-700 text-white border-b-2 border-red-900'
    : 'bg-secondary hover:bg-secondary-dark text-white border-b-2 border-amber-700'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="bg-white rounded shadow-floating w-full max-w-sm overflow-hidden animate-[slideUp_0.2s_ease-out] overscroll-contain"
      >
        {/* Top accent bar */}
        <div className={`h-1 w-full ${variant === 'danger' ? 'bg-error' : 'bg-secondary'}`} />

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
              <span className={`material-symbols-outlined text-[22px] ${iconColor}`}>
                {variant === 'danger' ? 'delete' : 'warning'}
              </span>
            </div>
            <div>
              <h3 id="confirm-modal-title" className="font-serif font-bold text-primary text-lg leading-tight">{title}</h3>
              {message && (
                <p className="text-sm text-text-muted mt-1 leading-relaxed">{message}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-text-muted border border-border-std rounded hover:bg-background transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-bold rounded transition-colors ${confirmCls}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
