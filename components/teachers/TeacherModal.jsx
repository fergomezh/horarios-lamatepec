'use client'
import { useState, useEffect } from 'react'

const COLORS = [
  '#1B2A4E', '#065F46', '#4C1D95', '#92400E', '#0F766E',
  '#0369A1', '#BE185D', '#78350F', '#3730A3', '#374151',
]

export default function TeacherModal({ teacher, subjects, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject_ids: [],
    max_hours: 25,
    color: '#1B2A4E',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (teacher) {
      setForm({
        name: teacher.name || '',
        email: teacher.email || '',
        subject_ids: (teacher.subjects || []).map(s => s.id),
        max_hours: teacher.max_hours || 25,
        color: teacher.color || '#1B2A4E',
      })
    }
  }, [teacher])

  const toggleSubject = (id) => {
    setForm(f => ({
      ...f,
      subject_ids: f.subject_ids.includes(id)
        ? f.subject_ids.filter(s => s !== id)
        : [...f.subject_ids, id],
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-sm shadow-elevation w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="text-secondary font-serif text-xl font-bold">
              {teacher ? 'Editar Docente' : 'Nuevo Docente'}
            </h3>
            <p className="text-white/70 text-sm mt-1">
              {teacher ? 'Actualiza los datos del profesor' : 'Registra un nuevo profesor al sistema'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar modal" className="text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-error-light border border-error/30 text-error text-sm px-3 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-bold text-text-muted mb-1">
              Nombre completo *
            </label>
            <input
              required
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="institutional-input w-full px-3 py-2 text-sm border border-border-std rounded text-text-main focus:ring-0"
              autoComplete="name"
              placeholder="Ej: Saúl Molina…"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-bold text-text-muted mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="institutional-input w-full px-3 py-2 text-sm border border-border-std rounded text-text-main focus:ring-0"
              autoComplete="email"
              spellCheck={false}
              placeholder="profesor@lamatepec.edu.sv…"
            />
          </div>

          {/* Multi-subject selector */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-bold text-text-muted mb-2">
              Materias que imparte
              {form.subject_ids.length > 0 && (
                <span className="ml-2 text-primary normal-case tracking-normal font-normal">
                  ({form.subject_ids.length} seleccionada{form.subject_ids.length > 1 ? 's' : ''})
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {subjects.map(s => {
                const selected = form.subject_ids.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSubject(s.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded border text-xs font-medium text-left transition-all ${
                      selected
                        ? 'border-primary bg-primary text-white'
                        : 'border-border-std bg-white text-text-muted hover:border-primary hover:text-primary'
                    }`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: selected ? 'white' : s.color }}
                    />
                    <span className="truncate">{s.name}</span>
                    {selected && (
                      <span className="material-symbols-outlined text-[13px] ml-auto shrink-0">check</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-bold text-text-muted mb-1">
              Carga máxima semanal (horas)
            </label>
            <input
              type="number"
              min="1"
              max="40"
              inputMode="numeric"
              value={form.max_hours}
              onChange={e => setForm(f => ({ ...f, max_hours: parseInt(e.target.value) }))}
              className="institutional-input w-full px-3 py-2 text-sm border border-border-std rounded text-text-main focus:ring-0"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-bold text-text-muted mb-2">
              Color de identificación
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Seleccionar color ${c}`}
                  aria-pressed={form.color === c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    form.color === c ? 'border-text-main scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border-std">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-muted border border-border-std rounded hover:bg-background transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-bold text-white bg-primary rounded border-b-2 border-primary-dark hover:bg-primary-light transition-colors uppercase tracking-wide disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
              {teacher ? 'Guardar Cambios' : 'Crear Docente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
