'use client'
import ScheduleCell from './ScheduleCell'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export default function ScheduleGrid({
  slots, assignments, section,
  isDragging, dragCellMap, overCellId,
  onRemove,
}) {
  return (
    <div id="schedule-grid-export" className="min-w-[800px] bg-white border border-border-std shadow-card rounded-sm text-xs">
      {/* Header */}
      <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr] divide-x divide-border-std border-b border-border-std bg-primary text-white sticky top-0 z-10">
        <div className="p-2 flex items-center justify-center">
          <span className="material-symbols-outlined text-white/70 text-sm">schedule</span>
        </div>
        {DAYS.map(day => (
          <div key={day} className="p-2 text-center">
            <h4 className="font-serif font-bold text-white text-xs tracking-wide">
              {day.toUpperCase()}
            </h4>
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr] divide-x divide-border-std text-xs">
        {slots.map(slot => {
          if (slot.is_special) {
            return (
              <div key={slot.id} className="contents">
                <div className="bg-primary/80 p-1 flex items-center justify-center font-tabular text-white/70 font-medium text-[10px] border-b border-white/10">
                  {slot.start_time}<br />{slot.end_time}
                </div>
                <div className="col-span-5 bg-slate-100 border-b border-slate-200 flex items-center justify-center py-1 h-6">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                    {slot.start_time}–{slot.end_time} · {slot.label || slot.special_type}
                  </span>
                </div>
              </div>
            )
          }

          return (
            <div key={slot.id} className="contents">
              <div className="bg-primary/80 p-1 flex items-center justify-center font-tabular text-white/70 font-medium text-[10px] border-b border-white/10">
                {slot.start_time}<br />{slot.end_time}
              </div>

              {DAYS.map(day => {
                const cellId = `cell-${slot.id}-${day}`
                const assignment = assignments.find(
                  a => a.slot_id === slot.id && a.day === day && a.section_id === section?.id
                )
                const dragState = isDragging ? (dragCellMap[cellId] || null) : null

                return (
                  <ScheduleCell
                    key={cellId}
                    id={cellId}
                    slotId={slot.id}
                    day={day}
                    assignment={assignment}
                    isDragging={isDragging}
                    dragState={dragState}
                    isOver={overCellId === cellId}
                    onRemove={onRemove}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
