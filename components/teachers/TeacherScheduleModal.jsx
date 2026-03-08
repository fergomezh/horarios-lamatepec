'use client'
import { useState, useEffect, useRef } from 'react'
import { getInitials } from '@/lib/schedule-utils'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export default function TeacherScheduleModal({ teacher, onClose }) {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const tableRef = useRef(null)

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await fetch(`/api/teachers/schedule?teacher_id=${teacher.id}`)
        if (!res.ok) throw new Error('Error al cargar el horario')
        const data = await res.json()
        setSchedule(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchSchedule()
  }, [teacher.id])

  const slots = [...new Set(schedule.map(s => ({ id: s.slot_id, period: s.period, start_time: s.start_time, end_time: s.end_time })))]
    .sort((a, b) => a.period - b.period)

  const getCellContent = (slotId, day) => {
    return schedule.filter(s => s.slot_id === slotId && s.day === day)
  }

  const totalHours = schedule.length

  const dept = (teacher.subjects || []).map(s => s.name).join(', ') || 'Sin departamento'

  const handleExportPDF = async () => {
    if (!tableRef.current || schedule.length === 0) return
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { toPng } = await import('html-to-image')

      const imgData = await toPng(tableRef.current, {
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
      pdf.text(`Horario de ${teacher.name}`, margin, 14)
      pdf.setFontSize(10); pdf.setFont('helvetica', 'normal')
      pdf.text(`Colegio Lamatepec - ${dept} - ${totalHours} horas asignadas`, margin, 22)
      pdf.addImage(imgData, 'PNG', imgX, headerHeight, imgW, imgH)
      pdf.save(`horario-${teacher.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
    } catch (err) {
      console.error('Error exporting PDF:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-lg shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-primary rounded-t-lg flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: teacher.color || '#1B2A4E' }}
            >
              {getInitials(teacher.name)}
            </div>
            <div>
              <h2 className="text-white font-serif font-bold text-lg">Horario del Docente</h2>
              <p className="text-white/70 text-sm">{teacher.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Info bar */}
        <div className="px-6 py-3 bg-primary/10 border-b border-primary/20 flex gap-6 text-sm shrink-0">
          <div>
            <span className="text-text-muted font-medium">Departamento:</span>
            <span className="ml-2 text-text-main font-semibold">{dept}</span>
          </div>
          <div>
            <span className="text-text-muted font-medium">Horas asignadas:</span>
            <span className="ml-2 text-text-main font-semibold">{totalHours} hrs</span>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <span className="material-symbols-outlined text-primary animate-spin text-3xl">sync</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-40 text-error">
              <span>{error}</span>
            </div>
          ) : schedule.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-text-muted">
              <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
              <p>Este docente no tiene clases asignadas</p>
            </div>
          ) : (
            <div ref={tableRef} className="border border-border-std rounded shadow-card text-xs bg-white">
              {/* Table Header */}
              <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] divide-x divide-border-std bg-primary text-white">
                <div className="p-2 text-center font-bold">Hora</div>
                {DAYS.map(day => (
                  <div key={day} className="p-2 text-center font-bold">{day}</div>
                ))}
              </div>

              {/* Table Body */}
              <div className="divide-y divide-border-std">
                {slots.map(slot => (
                  <div key={slot.id} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] divide-x divide-border-std">
                    <div className="p-2 bg-primary/5 text-center font-tabular font-medium text-text-muted">
                      {slot.start_time}<br />{slot.end_time}
                    </div>
                    {DAYS.map(day => {
                      const classes = getCellContent(slot.id, day)
                      return (
                        <div key={day} className="p-1 min-h-[50px]">
                          {classes.map(c => (
                            <div 
                              key={c.id}
                              className="p-1.5 rounded mb-1"
                              style={{ backgroundColor: c.subject_color + '15', borderLeft: `3px solid ${c.subject_color}` }}
                            >
                              <div className="font-bold truncate" style={{ color: c.subject_color }}>
                                {c.subject_name}
                              </div>
                              <div className="text-[10px] text-text-muted">
                                {c.grade}°{c.section}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-std flex justify-between shrink-0">
          <button
            onClick={handleExportPDF}
            disabled={loading || error || schedule.length === 0 || exporting}
            className="px-4 py-2 bg-secondary text-primary text-sm font-medium rounded hover:bg-secondary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className={`material-symbols-outlined text-[18px] ${exporting ? 'animate-spin' : ''}`}>
              {exporting ? 'sync' : 'picture_as_pdf'}
            </span>
            {exporting ? 'Exportando...' : 'Guardar PDF'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary-dark transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
