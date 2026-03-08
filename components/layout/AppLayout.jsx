'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/horarios', label: 'Horarios', icon: 'calendar_month' },
  { href: '/profesores', label: 'Directorio', icon: 'person_search' },
  { href: '/reportes', label: 'Reportes', icon: 'bar_chart' },
  { href: '/configuracion', label: 'Configuración', icon: 'settings' },
]

export default function AppLayout({ children }) {
  const pathname = usePathname()

  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* Top Header */}
      <header className="bg-primary text-white shadow-md border-b-4 border-secondary sticky top-0 z-50">
        <div className="px-6 h-16 flex items-center justify-between">
          {/* Branding */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div aria-hidden="true" className="w-8 h-8 bg-secondary rounded flex items-center justify-center text-primary font-serif font-bold text-xl">
                L
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-lg leading-tight tracking-wide">
                  COLEGIO LAMATEPEC
                </span>
                <span className="text-[10px] uppercase tracking-widest text-gray-300 font-medium">
                  Sistema de Gestión Académica
                </span>
              </div>
            </div>
          </div>

          {/* Center Nav */}
          <nav aria-label="Navegación principal" className="hidden md:flex gap-8">
            {navLinks.map(link => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors pb-1 ${
                    isActive
                      ? 'text-secondary border-b-2 border-secondary font-bold'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Right: User */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="block font-bold text-white text-sm">Director Académico</span>
              <span className="block text-xs text-secondary">Admin</span>
            </div>
            <div aria-hidden="true" className="w-9 h-9 bg-secondary rounded-full flex items-center justify-center text-primary font-serif font-bold">
              DA
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main id="main-content" className="flex-1 w-full">
        {children}
      </main>
    </div>
  )
}
