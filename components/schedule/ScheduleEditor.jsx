'use client'
import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  pointerWithin,
} from '@dnd-kit/core'
import { restrictToWindowEdges, snapCenterToCursor } from '@dnd-kit/modifiers'
import SidebarTeachers from '../teachers/SidebarTeachers'
import ScheduleGrid from './ScheduleGrid'
import SubjectPickerModal from './SubjectPickerModal'
import { getInitials, checkConflicts } from '@/lib/schedule-utils'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

// Pre-compute availability for every cell when drag starts
function buildDragCellMap(teacher, slots, assignments, section) {
  if (!teacher || !section) return {}
  const map = {}
  slots.forEach(slot => {
    if (slot.is_special) return
    DAYS.forEach(day => {
      const cellId = `cell-${slot.id}-${day}`
      const occupied = assignments.some(
        a => a.section_id === section.id && a.slot_id === slot.id && a.day === day
      )
      const teacherBusy = assignments.some(
        a => a.teacher_id === teacher.id && a.slot_id === slot.id && a.day === day && a.section_id !== section.id
      )
      map[cellId] = { blocked: occupied || teacherBusy, occupied, teacherBusy }
    })
  })
  return map
}

export default function ScheduleEditor({
  slots, assignments, teachers, subjects, section, gradeHours = [], onAssign, onRemove,
}) {
  const [activeTeacher, setActiveTeacher] = useState(null)
  const [overCellId, setOverCellId] = useState(null)
  const [dragCellMap, setDragCellMap] = useState({})  // all cells pre-computed on drag start
  const [toast, setToast] = useState(null)
  const [pendingDrop, setPendingDrop] = useState(null)
  const [selectedTeacher, setSelectedTeacher] = useState(null)

  const handleTeacherClick = (teacher) => {
    setSelectedTeacher(prev => prev?.id === teacher.id ? null : teacher)
  }

  const clickCellMap = selectedTeacher ? buildDragCellMap(selectedTeacher, slots, assignments, section) : {}

  const handleCellClick = ({ slotId, day }) => {
    if (!selectedTeacher || !section) return
    const cellId = `cell-${slotId}-${day}`
    if (clickCellMap[cellId]?.blocked) {
      showToast(
        clickCellMap[cellId].teacherBusy
          ? 'Profesor ocupado en otra sección a esa hora'
          : 'Sección ya tiene clase en ese bloque',
        true
      )
      return
    }
    const teacherSubjects = selectedTeacher.subjects || []
    if (teacherSubjects.length === 0) {
      showToast('Este profesor no tiene materias asignadas', true)
      return
    }
    if (teacherSubjects.length === 1) {
      doAssign(selectedTeacher, teacherSubjects[0], slotId, day)
      setSelectedTeacher(null)
      return
    }
    setPendingDrop({ teacher: selectedTeacher, slotId, day })
    setSelectedTeacher(null)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 3500)
  }

  const handleDragStart = ({ active }) => {
    const teacher = active.data.current?.teacher || null
    setActiveTeacher(teacher)
    setDragCellMap(buildDragCellMap(teacher, slots, assignments, section))
  }

  const handleDragOver = useCallback(({ over }) => {
    setOverCellId(over && over.id !== 'sidebar-cancel' ? over.id : null)
  }, [])

  const handleDragEnd = ({ over }) => {
    const teacher = activeTeacher
    setActiveTeacher(null)
    setOverCellId(null)
    setDragCellMap({})

    if (!over || over.id === 'sidebar-cancel' || !teacher || !section) return

    const { slotId, day } = over.data.current || {}
    if (!slotId || !day) return

    // Don't allow drop on blocked cells
    const cellId = `cell-${slotId}-${day}`
    if (dragCellMap[cellId]?.blocked) {
      showToast(
        dragCellMap[cellId].teacherBusy
          ? 'Profesor ocupado en otra sección a esa hora'
          : 'Sección ya tiene clase en ese bloque',
        true
      )
      return
    }

    const teacherSubjects = teacher.subjects || []
    if (teacherSubjects.length === 0) {
      showToast('Este profesor no tiene materias asignadas', true)
      return
    }
    if (teacherSubjects.length === 1) {
      doAssign(teacher, teacherSubjects[0], slotId, day)
      return
    }
    setPendingDrop({ teacher, slotId, day })
  }

  const doAssign = async (teacher, subject, slotId, day) => {
    const conflict = checkConflicts(
      teacher.id, subject.id, section.id, slotId, day,
      assignments, subjects, section?.grade, gradeHours
    )
    if (conflict.hasConflict) {
      showToast(conflict.reason, true)
      return
    }
    try {
      await onAssign({
        teacher_id: teacher.id,
        subject_id: subject.id,
        section_id: section.id,
        slot_id: slotId,
        day,
      })
      showToast(`${teacher.name} — ${subject.name} asignado`)
    } catch (err) {
      showToast(err.message || 'Error al asignar', true)
    }
  }

  const handleDragCancel = () => {
    setActiveTeacher(null)
    setOverCellId(null)
    setDragCellMap({})
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => pointerWithin(args).length ? pointerWithin(args) : closestCenter(args)}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-1 overflow-hidden">
        <SidebarTeachers teachers={teachers} isDragging={!!activeTeacher} onTeacherSelect={handleTeacherClick} selectedTeacherId={selectedTeacher?.id} />

        <section className="flex-1 overflow-auto bg-background p-3">
          <ScheduleGrid
            slots={slots}
            assignments={assignments}
            section={section}
            isDragging={!!activeTeacher}
            dragCellMap={dragCellMap}
            overCellId={overCellId}
            onRemove={onRemove}
            onCellClick={handleCellClick}
            selectedTeacher={selectedTeacher}
          />
        </section>
      </div>

      <DragOverlay modifiers={[snapCenterToCursor, restrictToWindowEdges]}>
        {activeTeacher && (
          <div className="bg-white p-3 rounded border border-primary shadow-floating flex items-center gap-3 select-none opacity-95 rotate-2 w-[220px] pointer-events-none">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: activeTeacher.color || '#1B2A4E' }}
            >
              {getInitials(activeTeacher.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-main truncate">{activeTeacher.name}</p>
              <p className="text-xs text-text-muted truncate">
                {(activeTeacher.subjects || []).map(s => s.name).join(', ') || 'Sin materia'}
              </p>
            </div>
            <span className="material-symbols-outlined text-text-muted text-[16px]">drag_indicator</span>
          </div>
        )}
      </DragOverlay>

      {pendingDrop && (
        <SubjectPickerModal
          teacher={pendingDrop.teacher}
          slotId={pendingDrop.slotId}
          day={pendingDrop.day}
          slots={slots}
          onConfirm={(subject) => {
            const { teacher, slotId, day } = pendingDrop
            setPendingDrop(null)
            doAssign(teacher, subject, slotId, day)
          }}
          onCancel={() => setPendingDrop(null)}
        />
      )}

      {toast && (
        <div
          role={toast.isError ? 'alert' : 'status'}
          aria-live={toast.isError ? 'assertive' : 'polite'}
          className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded shadow-floating z-50 toast-enter ${
          toast.isError ? 'bg-error text-white' : 'bg-primary text-white'
        }`}>
          <span className="material-symbols-outlined text-secondary">
            {toast.isError ? 'warning' : 'check_circle'}
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-bold">{toast.isError ? 'Conflicto' : 'Éxito'}</span>
            <span className="text-xs text-white/80">{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)} aria-label="Cerrar notificación" className="ml-2 text-white/60 hover:text-white">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
          </button>
        </div>
      )}
    </DndContext>
  )
}
