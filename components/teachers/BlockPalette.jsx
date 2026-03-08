'use client'
import { useDraggable } from '@dnd-kit/core'

const BLOCKS = [
  { type: 'recreo',      label: 'Recreo',       icon: 'wb_sunny',        color: '#F59E0B' },
  { type: 'almuerzo',    label: 'Almuerzo',      icon: 'restaurant',      color: '#10B981' },
  { type: 'libre',       label: 'Hora Libre',    icon: 'event_available', color: '#6B7280' },
  { type: 'acto',        label: 'Acto Especial', icon: 'star',            color: '#8B5CF6' },
  { type: 'examen',      label: 'Examen',        icon: 'quiz',            color: '#EF4444' },
]

function DraggableBlock({ block }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-${block.type}`,
    data: { type: 'block', block },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-3 py-2 rounded border border-border-std bg-white shadow-card
        cursor-grab active:cursor-grabbing hover:border-primary hover:shadow-md transition-all select-none
        ${isDragging ? 'opacity-40' : ''}`}
    >
      <div
        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
        style={{ backgroundColor: block.color + '20', color: block.color }}
      >
        <span className="material-symbols-outlined text-[14px]">{block.icon}</span>
      </div>
      <span className="text-xs font-semibold text-text-main">{block.label}</span>
      <span className="material-symbols-outlined text-text-muted text-[14px] ml-auto opacity-0 group-hover:opacity-100">
        drag_indicator
      </span>
    </div>
  )
}

export default function BlockPalette() {
  return (
    <div className="px-3 pb-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted px-1 pt-2 pb-1">
        Bloques Especiales
      </p>
      {BLOCKS.map(block => (
        <DraggableBlock key={block.type} block={block} />
      ))}
    </div>
  )
}
