'use client'

export default function SectionSelector({ sections = [], selectedGrade, selectedSection, onSelect }) {
  // Derive grades and sections dynamically
  const grades = [...new Set(sections.map(s => s.grade))].sort((a, b) => a - b)

  if (grades.length === 0) return null

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {grades.map(grade => {
        const gradeSections = sections
          .filter(s => s.grade === grade)
          .sort((a, b) => a.section.localeCompare(b.section))

        return (
          <div key={grade} className="flex items-center gap-1">
            {gradeSections.map(s => {
              const isActive = selectedGrade === grade && selectedSection === s.section
              return (
                <button
                  key={s.id}
                  onClick={() => onSelect(grade, s.section)}
                  aria-pressed={isActive}
                  aria-label={`Sección ${grade}° ${s.section}`}
                  className={`px-3 py-1 text-sm font-bold rounded border transition-all ${
                    isActive
                      ? 'bg-white text-primary border-white shadow-card'
                      : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {grade}{s.section}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
