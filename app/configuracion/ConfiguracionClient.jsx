'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'

const SUBJECT_COLORS = [
  '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#14B8A6',
  '#6366F1', '#F43F5E', '#22C55E', '#FBBF24', '#60A5FA',
  '#A78BFA', '#34D399', '#FB923C', '#E879F9', '#38BDF8',
]

function pickColor(usedColors) {
  const used = new Set(usedColors.map(c => c.toLowerCase()))
  const available = SUBJECT_COLORS.filter(c => !used.has(c.toLowerCase()))
  if (available.length > 0) return available[0]
  // All colors taken — cycle back from the start
  return SUBJECT_COLORS[usedColors.length % SUBJECT_COLORS.length]
}

export default function ConfiguracionClient({ subjects: initialSubjects, gradeHours: initialGradeHours = [], sections: initialSections = [], error }) {
  const router = useRouter()
  const [subjects, setSubjects] = useState(initialSubjects)

  // gradeHours map: `${subject_id}-${grade}` → weekly_hours
  const buildMap = (rows) => Object.fromEntries(rows.map(r => [`${r.subject_id}-${r.grade}`, r.weekly_hours]))
  const [gradeHoursMap, setGradeHoursMap] = useState(() => buildMap(initialGradeHours))
  const gradeHoursDebounce = useRef({})

  const handleGradeHoursChange = (subjectId, grade, hours) => {
    const key = `${subjectId}-${grade}`
    setGradeHoursMap(prev => ({ ...prev, [key]: hours }))
    // Debounce the DB write — cancel any pending write for this key
    if (gradeHoursDebounce.current[key]) clearTimeout(gradeHoursDebounce.current[key])
    gradeHoursDebounce.current[key] = setTimeout(() => {
      fetch('/api/subject-grade-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: subjectId, grade, weekly_hours: hours }),
      })
    }, 600)
  }

  const getHours = (subjectId, grade) => gradeHoursMap[`${subjectId}-${grade}`] ?? 5

  // Sections state
  const [sections, setSections] = useState(initialSections)
  const [newSection, setNewSection] = useState({ grade: 7, section: '' })
  const [sectionError, setSectionError] = useState('')

  const handleAddSection = async () => {
    setSectionError('')
    if (!newSection.section.trim()) return
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSection),
      })
      if (!res.ok) {
        const err = await res.json()
        setSectionError(err.error)
        return
      }
      const saved = await res.json()
      setSections(prev => [...prev, saved].sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section)))
      // If new grade, seed gradeHoursMap for all subjects
      const gradeExists = sections.some(s => s.grade === saved.grade)
      if (!gradeExists) {
        const newMap = { ...gradeHoursMap }
        subjects.forEach(sub => {
          const key = `${sub.id}-${saved.grade}`
          if (newMap[key] === undefined) newMap[key] = sub.weekly_hours
        })
        setGradeHoursMap(newMap)
      }
      setNewSection(prev => ({ ...prev, section: '' }))
      showToast(`Sección ${saved.grade}° ${saved.section} creada`)
    } catch {
      setSectionError('Error al crear la sección')
    }
  }

  const handleDeleteSection = async (sec) => {
    const res = await fetch(`/api/sections/${sec.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json()
      showToast(err.error, true)
    } else {
      setSections(prev => prev.filter(s => s.id !== sec.id))
      showToast(`Sección ${sec.grade}° ${sec.section} eliminada`)
    }
    setConfirmSection(null)
  }

  // Derived grades from sections (dynamic)
  const grades = [...new Set(sections.map(s => s.grade))].sort((a, b) => a - b)

  // Group sections by grade
  const sectionsByGrade = sections.reduce((acc, s) => {
    if (!acc[s.grade]) acc[s.grade] = []
    acc[s.grade].push(s)
    return acc
  }, {})
  const [toast, setToast] = useState(null)
  const [confirmSubject, setConfirmSubject] = useState(null) // subject to delete
  const [confirmSection, setConfirmSection] = useState(null) // section to delete
  const [newSubject, setNewSubject] = useState({ name: '', weekly_hours: 5 })
  const [showNewSubject, setShowNewSubject] = useState(false)

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSaveSubject = async () => {
    if (!newSubject.name.trim()) return
    const color = pickColor(subjects.map(s => s.color))
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSubject, color }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      const saved = await res.json()
      setSubjects(prev => [...prev, saved])
      // Seed grade hours for new subject across all existing grades
      const newMap = { ...gradeHoursMap }
      for (const g of grades) {
        const key = `${saved.id}-${g}`
        newMap[key] = saved.weekly_hours
        fetch('/api/subject-grade-hours', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject_id: saved.id, grade: g, weekly_hours: saved.weekly_hours }),
        })
      }
      setGradeHoursMap(newMap)
      setNewSubject({ name: '', weekly_hours: 5 })
      setShowNewSubject(false)
      showToast('Materia creada correctamente')
    } catch {
      showToast('Error al guardar la materia', true)
    }
  }

  const handleDeleteSubject = async (id) => {
    const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json()
      showToast(err.error || 'Error al eliminar la materia', true)
      setConfirmSubject(null)
      return
    }
    setSubjects(prev => prev.filter(s => s.id !== id))
    showToast('Materia eliminada')
    setConfirmSubject(null)
  }

  const handleUpdateWeeklyHours = async (subject, hours) => {
    setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, weekly_hours: hours } : s))
    await fetch(`/api/subjects/${subject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...subject, weekly_hours: hours }),
    })
  }



  return (
    <div className="min-h-full py-10 px-4">
      <div className="w-full bg-primary/10 shadow-paper border border-primary-dark rounded relative pb-24">
        {/* Header */}
        <div className="px-10 pt-10 pb-6 border-b border-primary-dark/60">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-serif text-3xl font-bold text-white mb-2">Configuración Académica</h2>
              <p className="text-white/60 text-sm max-w-2xl">
                Administre las materias, horas por grado y secciones del ciclo escolar 2026-2027.
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase tracking-wider font-bold text-white/40 block mb-1">
                Última actualización
              </span>
              <span className="text-xs font-medium text-white/70">
                {new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="w-24 h-[3px] bg-secondary mt-6" />
        </div>

        <div className="px-10 py-8 space-y-12">
          {/* Section 1: Materias y Horas por Grado */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">menu_book</span>
                <h3 className="font-serif text-xl font-bold text-white">Materias y Horas por Grado</h3>
              </div>
              <button
                onClick={() => setShowNewSubject(true)}
                className="text-xs font-bold text-secondary hover:text-white uppercase tracking-wide flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add</span> Añadir Materia
              </button>
            </div>

            {/* Grade hours grid */}
            <div className="border border-white/20 rounded overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary">
                    <th className="px-4 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider w-[50%]">Materia</th>
                    {grades.map(g => (
                      <th key={g} className="px-4 py-3 text-center text-xs font-bold text-secondary uppercase tracking-wider">
                        {g}° grado
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-bold text-secondary uppercase tracking-wider w-[8%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {subjects.map(subject => (
                    <tr key={subject.id} className="group hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                          <span className="font-semibold text-white text-sm">{subject.name}</span>
                        </div>
                      </td>
                      {grades.map(grade => (
                        <td key={grade} className="px-4 py-2.5 text-center">
                          <input
                            type="number"
                            min="0"
                            max="15"
                            value={getHours(subject.id, grade)}
                            onChange={e => handleGradeHoursChange(subject.id, grade, Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-14 text-center text-sm font-bold border border-white/20 rounded py-1 focus:ring-1 focus:ring-secondary focus:border-secondary bg-white/10 text-white"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => setConfirmSubject(subject)}
                          className="text-white/40 hover:text-error transition-colors p-1 opacity-0 group-hover:opacity-100"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* New subject form */}
            {showNewSubject && (
              <div className="p-4 bg-white/5 border-2 border-dashed border-secondary/40 rounded space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={newSubject.name}
                    onChange={e => setNewSubject(p => ({ ...p, name: e.target.value }))}
                    placeholder="Nombre de la materia"
                    className="institutional-input px-3 py-2 text-sm border border-white/20 rounded text-white bg-white/10 md:col-span-2"
                  />
                  <input
                    type="number"
                    value={newSubject.weekly_hours}
                    onChange={e => setNewSubject(p => ({ ...p, weekly_hours: parseInt(e.target.value) }))}
                    min="1" max="10"
                    className="institutional-input px-2 py-2 text-sm border border-white/20 rounded bg-white/10 text-white"
                    placeholder="Hrs semanales"
                  />
                </div>
                <p className="text-xs text-white/40">Las horas base se aplicarán a todos los grados. Puedes ajustarlas individualmente después.</p>
                <div className="flex gap-2">
                  <button onClick={handleSaveSubject} className="px-3 py-1.5 text-xs font-bold bg-secondary text-primary rounded hover:bg-secondary-light">
                    Guardar
                  </button>
                  <button onClick={() => setShowNewSubject(false)} className="px-3 py-1.5 text-xs text-white/60 border border-white/20 rounded hover:bg-white/10">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {!showNewSubject && (
              <button
                onClick={() => setShowNewSubject(true)}
                className="w-full py-3 border border-dashed border-white/20 rounded text-white/40 text-xs font-medium hover:bg-white/5 hover:text-white hover:border-secondary transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                Definir nueva materia
              </button>
            )}
          </section>

          {/* Section 2: Secciones */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-secondary">groups</span>
              <h3 className="font-serif text-xl font-bold text-white">Secciones</h3>
            </div>

            {/* Existing sections grouped by grade */}
            <div className="space-y-4 mb-5">
              {Object.keys(sectionsByGrade).sort((a, b) => a - b).map(grade => (
                <div key={grade}>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-white/50 mb-2">{grade}° grado</p>
                  <div className="flex flex-wrap gap-2">
                    {sectionsByGrade[grade].sort((a, b) => a.section.localeCompare(b.section)).map(sec => (
                      <div
                        key={sec.id}
                        className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-white/10 border border-white/20 rounded-full group hover:border-error/40 transition-colors"
                      >
                        <span className="text-sm font-bold text-white">{sec.grade}° {sec.section}</span>
                        <button
                          onClick={() => setConfirmSection(sec)}
                          className="text-white/40 hover:text-error opacity-0 group-hover:opacity-100 transition-all p-0.5 rounded-full"
                          title="Eliminar sección"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {sections.length === 0 && (
                <p className="text-sm text-white/40 italic">No hay secciones creadas.</p>
              )}
            </div>

            {/* Add new section */}
            <div className="flex items-end gap-3 p-4 bg-white/5 border border-dashed border-secondary/40 rounded">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-white/50 mb-1">Grado</label>
                <select
                  value={newSection.grade}
                  onChange={e => setNewSection(p => ({ ...p, grade: parseInt(e.target.value) }))}
                  className="institutional-input px-3 py-2 text-sm border border-white/20 rounded bg-white/10 text-white w-24"
                >
                  {[7, 8, 9, 10, 11, 12].map(g => (
                    <option key={g} value={g} className="text-primary">{g}°</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-white/50 mb-1">Sección</label>
                <input
                  type="text"
                  maxLength={2}
                  value={newSection.section}
                  onChange={e => setNewSection(p => ({ ...p, section: e.target.value.toUpperCase() }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddSection()}
                  placeholder="A"
                  className="institutional-input px-3 py-2 text-sm border border-white/20 rounded bg-white/10 text-white w-20 uppercase font-bold"
                />
              </div>
              <button
                onClick={handleAddSection}
                className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-primary text-sm font-bold rounded hover:bg-secondary-light transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Agregar
              </button>
            </div>
            {sectionError && (
              <p className="text-xs text-error mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                {sectionError}
              </p>
            )}
          </section>
        </div>

        {/* Sticky action bar */}
        <div className="absolute bottom-0 left-0 w-full bg-primary/95 backdrop-blur-sm border-t border-primary-dark px-10 py-4 rounded-b flex justify-between items-center z-10">
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>Los cambios se guardan automáticamente.</span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 rounded border border-white/20 bg-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </div>

      {/* Confirm delete subject modal */}
      {confirmSubject && (
        <ConfirmModal
          title={`Eliminar "${confirmSubject.name}"`}
          message="Se eliminarán todas las asignaciones relacionadas con esta materia. Esta acción no se puede deshacer."
          confirmLabel="Sí, eliminar"
          onConfirm={() => handleDeleteSubject(confirmSubject.id)}
          onCancel={() => setConfirmSubject(null)}
        />
      )}

      {/* Confirm delete section modal */}
      {confirmSection && (
        <ConfirmModal
          title={`Eliminar sección ${confirmSection.grade}° ${confirmSection.section}`}
          message="Se eliminarán todas las asignaciones de horario de esta sección. Esta acción no se puede deshacer."
          confirmLabel="Sí, eliminar"
          onConfirm={() => handleDeleteSection(confirmSection)}
          onCancel={() => setConfirmSection(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded shadow-floating z-50 toast-enter ${
          toast.isError ? 'bg-error text-white' : 'bg-secondary text-primary'
        }`}>
          <span className="material-symbols-outlined">
            {toast.isError ? 'warning' : 'check_circle'}
          </span>
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      <div className="w-full mt-6 text-center">
        <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">
          Sistema de Gestión Académica Colegio Lamatepec © 2026
        </p>
      </div>
    </div>
  )
}
