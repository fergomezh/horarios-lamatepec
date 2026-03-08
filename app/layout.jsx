import './globals.css'

export const metadata = {
  title: 'Colegio Lamatepec - Sistema de Gestión Académica',
  description: 'Sistema de gestión y creación de horarios escolares del Colegio Lamatepec',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" style={{ colorScheme: 'light' }}>
      <head>
        <meta name="theme-color" content="#1E2A3B" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
