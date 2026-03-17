'use client'
import { useState, useTransition, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import ScheduleEditor from '@/components/schedule/ScheduleEditor'
import SubjectProgress from '@/components/schedule/SubjectProgress'
import SectionSelector from '@/components/schedule/SectionSelector'
import ConfirmModal from '@/components/ui/ConfirmModal'

export default function HorariosPrimariaClient({ teachers, subjects, sections, slots, scheduleOptions: initialOptions, gradeHours = [], error, initialGrade, initialSection }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState(null)
  const sortedSections = [...sections].sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section))

  const resolveInitial = (key) => {
    if (initialGrade && initialSection) {
      const match = sortedSections.find(s => s.grade === initialGrade && s.section === initialSection)
      if (match) return key === 'grade' ? match.grade : match.section
    }
    return key === 'grade' ? (sortedSections[0]?.grade ?? 1) : (sortedSections[0]?.section ?? 'A')
  }

  const [selectedGrade, setSelectedGrade] = useState(() => resolveInitial('grade'))
  const [selectedSection, setSelectedSection] = useState(() => resolveInitial('section'))

  const [scheduleOptions, setScheduleOptions] = useState(initialOptions ?? [])
  const [activeOptionId, setActiveOptionId] = useState(initialOptions?.[0]?.id ?? null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmRemoveAssignment, setConfirmRemoveAssignment] = useState(null)
  const [settingPrincipal, setSettingPrincipal] = useState(false)
  const [creatingOption, setCreatingOption] = useState(false)
  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    setScheduleOptions(initialOptions ?? [])
  }, [initialOptions])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        startTransition(() => router.refresh())
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [router])

  useEffect(() => {
    if (!scheduleOptions.find(o => o.id === activeOptionId)) {
      const principal = scheduleOptions.find(o => o.isPrincipal)
      setActiveOptionId(principal?.id ?? scheduleOptions[0]?.id ?? null)
    }
  }, [scheduleOptions, activeOptionId])

  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openDropdown = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 6, left: rect.left })
    }
    setDropdownOpen(v => !v)
  }

  const activeOption = scheduleOptions.find(o => o.id === activeOptionId)
  const activeAssignments = activeOption?.assignments ?? []

  const createNewOption = async () => {
    setCreatingOption(true)
    setDropdownOpen(false)
    try {
      const newLabel = `Horario ${scheduleOptions.length + 1}`
      const res = await fetch('/api/schedule-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel, sort_order: scheduleOptions.length, level: 'primaria' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear horario')
      }
      const newOption = await res.json()
      startTransition(() => { router.refresh() })
      setScheduleOptions(prev => [...prev, { ...newOption, isPrincipal: false, assignments: [] }])
      setActiveOptionId(newOption.id)
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingOption(false)
    }
  }

  const handleSetPrincipal = async (optId) => {
    const opt = scheduleOptions.find(o => o.id === optId)
    if (!opt || opt.isPrincipal) return
    setSettingPrincipal(true)
    setDropdownOpen(false)
    try {
      const res = await fetch(`/api/schedule-options/${optId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_principal: true }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al establecer como principal')
      }
      setScheduleOptions(prev => prev.map(o => ({
        ...o,
        isPrincipal: o.id === optId,
      })))
      startTransition(() => { router.refresh() })
    } catch (err) {
      alert(err.message)
    } finally {
      setSettingPrincipal(false)
    }
  }

  const handleDeleteOption = (optId) => {
    if (scheduleOptions.length <= 1) return
    setConfirmDelete(optId)
    setDropdownOpen(false)
  }

  const confirmDeleteOption = async () => {
    const optId = confirmDelete
    setConfirmDelete(null)
    try {
      const res = await fetch(`/api/schedule-options/${optId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar horario')
      }

      const remaining = scheduleOptions.filter(o => o.id !== optId)
      const wasActive = activeOptionId === optId
      const wasPrincipal = scheduleOptions.find(o => o.id === optId)?.isPrincipal

      if (wasActive) {
        setActiveOptionId(remaining[0]?.id ?? null)
      }

      let updated = remaining
      if (wasPrincipal && remaining.length > 0) {
        updated = remaining.map((o, i) => ({ ...o, isPrincipal: i === 0 }))
      }

      setScheduleOptions(updated)
      startTransition(() => { router.refresh() })
    } catch (err) {
      alert(err.message)
    }
  }

  if (error || slots.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-lg">
          <span className="material-symbols-outlined text-white/30 text-[48px] block mb-3">database</span>
          <h2 className="font-serif text-xl font-bold text-white mb-2">Base de datos no inicializada</h2>
          <p className="text-sm text-white/60 mb-4">
            Primero debes configurar <code className="bg-white/10 px-1 rounded text-secondary">.env.local</code> con tu DATABASE_URL
            e inicializar la base de datos.
          </p>
          <button
            onClick={async () => {
              await fetch('/api/seed', { method: 'POST' })
              router.refresh()
            }}
            className="px-4 py-2 bg-secondary text-primary text-sm font-bold rounded hover:bg-secondary-light"
          >
            Inicializar Base de Datos
          </button>
        </div>
      </div>
    )
  }

  const currentSection = sortedSections.find(
    s => s.grade === selectedGrade && s.section === selectedSection
  )

  const handleSelect = (grade, section) => {
    setSelectedGrade(grade)
    setSelectedSection(section)
  }

  const handleAssign = async (data) => {
    if (!activeOption) return
    const res = await fetch('/api/schedule-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, option_id: activeOption.id }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Error al asignar')
    }
    startTransition(() => { router.refresh() })
  }

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 3500)
  }

  const handleRemove = (assignmentId) => {
    const assignment = activeAssignments.find(a => a.id === assignmentId)
    if (assignment) {
      setConfirmRemoveAssignment(assignment)
    }
  }

  const confirmRemoveAssignmentAction = async () => {
    if (!confirmRemoveAssignment) return
    const res = await fetch(`/api/schedule-assignments/${confirmRemoveAssignment.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      showToast(err.error || 'Error al eliminar la asignación', true)
      return
    }
    setConfirmRemoveAssignment(null)
    startTransition(() => { router.refresh() })
  }

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { toPng } = await import('html-to-image')

    const element = document.getElementById('schedule-grid-export')
    if (!element) return

    const imgData = await toPng(element, {
      pixelRatio: 2,
      skipFonts: true,
    })
    const pdf = new jsPDF('l', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10
    const headerHeight = 28
    const availableWidth = pageWidth - margin * 2
    const availableHeight = pageHeight - headerHeight - margin
    const img = new Image()
    await new Promise(resolve => { img.onload = resolve; img.src = imgData })
    const imgAspect = img.width / img.height
    let imgW = availableWidth
    let imgH = imgW / imgAspect
    if (imgH > availableHeight) { imgH = availableHeight; imgW = imgH * imgAspect }
    const imgX = margin + (availableWidth - imgW) / 2
    pdf.setFontSize(16); pdf.setFont('helvetica', 'bold')
    pdf.text(`Primaria — ${activeOption?.label ?? 'Horario'} - ${selectedGrade}° ${selectedSection}`, margin, 14)
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal')
    pdf.text('Colegio Lamatepec - Sistema de Gestión Académica 2026-2027', margin, 22)
    pdf.addImage(imgData, 'PNG', imgX, headerHeight, imgW, imgH)
    pdf.save(`horario-primaria-${selectedGrade}${selectedSection}.pdf`)
  }

  const dropdownPortal = dropdownOpen && typeof document !== 'undefined' && createPortal(
    <div
      ref={dropdownRef}
      className="fixed bg-white border border-border-std rounded shadow-floating py-1"
      style={{ top: dropdownPos.top, left: dropdownPos.left, zIndex: 99999, minWidth: '220px' }}
    >
      {scheduleOptions.map(opt => (
        <div
          key={opt.id}
          className={`flex items-center gap-1 px-2 py-1.5 group transition-colors ${
            opt.id === activeOptionId ? 'bg-primary/5' : 'hover:bg-gray-100'
          }`}
        >
          <button
            onClick={() => { setActiveOptionId(opt.id); setDropdownOpen(false) }}
            className="flex-1 flex items-center gap-2 text-left"
          >
            <span className={`material-symbols-outlined text-[15px] ${opt.id === activeOptionId ? 'text-primary' : 'text-text-muted'}`}>
              {opt.id === activeOptionId ? 'radio_button_checked' : 'radio_button_unchecked'}
            </span>
            <span className={`text-sm ${opt.id === activeOptionId ? 'text-primary font-bold' : 'text-text-main'}`}>
              {opt.label}
            </span>
            {opt.isPrincipal && (
              <span
                className="ml-auto flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                style={{ backgroundColor: '#FEF9C3', color: '#92400E' }}
              >
                <span className="material-symbols-outlined text-[11px]">star</span>
                Principal
              </span>
            )}
          </button>

          {!opt.isPrincipal && (
            <button
              onClick={() => handleSetPrincipal(opt.id)}
              disabled={settingPrincipal}
              aria-label={`Establecer ${opt.label} como horario principal`}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-yellow-50 text-text-muted hover:text-yellow-600 transition-all disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">star</span>
            </button>
          )}

          {scheduleOptions.length > 1 && (
            <button
              onClick={() => handleDeleteOption(opt.id)}
              aria-label={`Eliminar ${opt.label}`}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-text-muted hover:text-error transition-all"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
            </button>
          )}
        </div>
      ))}

      <div className="border-t border-border-std mt-1 pt-1">
        <button
          onClick={createNewOption}
          disabled={creatingOption}
          className="w-full text-left px-4 py-2 text-sm text-primary font-semibold flex items-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-60"
        >
          {creatingOption
            ? <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
            : <span className="material-symbols-outlined text-[15px]">add</span>
          }
          Crear nuevo horario
        </button>
      </div>
    </div>,
    document.body
  )

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Toolbar */}
      <div className="bg-primary border-b border-primary-dark px-6 py-3 flex items-center justify-between shrink-0 shadow-card z-10">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Schedule options dropdown */}
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={openDropdown}
              disabled={settingPrincipal || creatingOption}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded text-sm font-bold text-white hover:bg-white/20 transition-colors disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">calendar_today</span>
              {activeOption?.label ?? 'Horario'}
              {activeOption?.isPrincipal && (
                <span className="material-symbols-outlined text-[13px] text-yellow-500" aria-hidden="true">star</span>
              )}
              {settingPrincipal || creatingOption
                ? <span className="material-symbols-outlined text-[16px] text-text-muted animate-spin" aria-hidden="true">progress_activity</span>
                : <span className="material-symbols-outlined text-[16px] text-text-muted" aria-hidden="true">{dropdownOpen ? 'expand_less' : 'expand_more'}</span>
              }
            </button>
          </div>

          <div className="h-6 w-px bg-white/20" />

          {/* Section title + tabs */}
          <div className="flex items-center gap-3">
            <SectionSelector
              sections={sortedSections}
              selectedGrade={selectedGrade}
              selectedSection={selectedSection}
              onSelect={handleSelect}
            />
          </div>

          {/* Subject progress */}
          {currentSection && subjects.length > 0 && (
            <>
              <div className="h-6 w-px bg-border-std hidden lg:block" />
              <SubjectProgress
                subjects={subjects}
                assignments={activeAssignments}
                sectionId={currentSection.id}
                grade={selectedGrade}
                gradeHours={gradeHours}
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isPending && (
            <span className="text-xs text-white/70 flex items-center gap-1" aria-live="polite">
              <span className="material-symbols-outlined text-[16px] animate-spin" aria-hidden="true">progress_activity</span>
              Guardando…
            </span>
          )}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">print</span>
            Exportar PDF
          </button>
          <button
            onClick={() => handleSetPrincipal(activeOptionId)}
            disabled={settingPrincipal || activeOption?.isPrincipal}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-primary text-sm font-semibold rounded shadow-card hover:bg-secondary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={activeOption?.isPrincipal ? 'Este horario ya es el principal' : 'Establecer como horario principal'}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {activeOption?.isPrincipal ? 'star' : 'check'}
            </span>
            {activeOption?.isPrincipal ? 'Horario Principal' : 'Publicar Horario'}
          </button>
        </div>
      </div>

      {/* Main workspace */}
      {sortedSections.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-white/20 text-[48px] block mb-3">groups</span>
            <p className="text-white/50 text-sm">No hay secciones de primaria (grados 1–6).</p>
            <p className="text-white/30 text-xs mt-1">Agrégalas desde Configuración.</p>
          </div>
        </div>
      ) : currentSection ? (
        <ScheduleEditor
          slots={slots}
          assignments={activeAssignments}
          teachers={teachers}
          subjects={subjects}
          section={currentSection}
          gradeHours={gradeHours}
          onAssign={handleAssign}
          onRemove={handleRemove}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-white/50">Selecciona una sección para comenzar</p>
        </div>
      )}

      {/* Confirm delete schedule option */}
      {confirmDelete !== null && (
        <ConfirmModal
          title="Eliminar horario"
          message={
            scheduleOptions.find(o => o.id === confirmDelete)?.isPrincipal
              ? `¿Eliminar "${scheduleOptions.find(o => o.id === confirmDelete)?.label}"? Este es el horario principal. Al eliminarlo, el siguiente horario pasará a ser el principal. Esta acción no se puede deshacer.`
              : `¿Eliminar "${scheduleOptions.find(o => o.id === confirmDelete)?.label}"? Esta acción no se puede deshacer.`
          }
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          variant="danger"
          onConfirm={confirmDeleteOption}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Confirm remove assignment */}
      {confirmRemoveAssignment && (
        <ConfirmModal
          title="Eliminar materia del horario"
          message={`¿Eliminar "${confirmRemoveAssignment.subject_name}" del ${confirmRemoveAssignment.day} a las ${confirmRemoveAssignment.start_time}? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          variant="danger"
          onConfirm={confirmRemoveAssignmentAction}
          onCancel={() => setConfirmRemoveAssignment(null)}
        />
      )}

      {dropdownPortal}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded shadow-floating z-50 toast-enter ${
          toast.isError ? 'bg-error text-white' : 'bg-secondary text-primary'
        }`}>
          <span className="material-symbols-outlined" aria-hidden="true">
            {toast.isError ? 'warning' : 'check_circle'}
          </span>
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}
    </div>
  )
}
