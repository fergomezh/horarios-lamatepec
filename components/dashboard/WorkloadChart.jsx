'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-primary text-white px-3 py-2 rounded shadow-floating text-xs">
        <p className="font-bold">{label}</p>
        <p>{payload[0].value} horas asignadas</p>
        {payload[1] && <p className="text-white/60">{payload[1].value} disponibles</p>}
      </div>
    )
  }
  return null
}

export default function WorkloadChart({ teachers }) {
  const data = teachers
    .filter(t => t.max_hours > 0)
    .map(t => ({
      name: t.name.split(' ').slice(-1)[0], // last name
      fullName: t.name,
      asignadas: t.assigned_hours || 0,
      disponibles: Math.max(0, t.max_hours - (t.assigned_hours || 0)),
      max: t.max_hours,
      pct: Math.round(((t.assigned_hours || 0) / t.max_hours) * 100),
    }))
    .sort((a, b) => b.asignadas - a.asignadas)

  return (
    <div className="bg-primary/20 border border-primary-dark rounded p-6 shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-serif font-bold text-white">Carga Horaria Docente</h3>
          <p className="text-xs text-white/50 mt-1">Horas asignadas vs disponibles por profesor</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-secondary rounded-sm inline-block" />
            <span className="text-white/70">Asignadas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-white/20 rounded-sm inline-block" />
            <span className="text-white/40">Disponibles</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff10" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#ffffff60' }} />
          <YAxis
            type="category"
            dataKey="fullName"
            tick={{ fontSize: 11, fill: '#ffffff60' }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="asignadas" stackId="a" fill="#1B2A4E" radius={[0, 0, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.pct >= 100 ? '#B91C1C' : entry.pct >= 80 ? '#C5A065' : '#1B2A4E'}
              />
            ))}
          </Bar>
          <Bar dataKey="disponibles" stackId="a" fill="#ffffff20" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
