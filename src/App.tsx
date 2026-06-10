import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import type { RecordModel } from 'pocketbase'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import Login from '@/pages/Login'

function App() {
  const [session, setSession] = useState<RecordModel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Aplicar tema guardado con seguridad para iframes (Cross-Origin localStorage access can throw)
    try {
      const savedTheme = localStorage.getItem('cw_theme')
      if (savedTheme) {
        const themeColors = JSON.parse(savedTheme)
        const root = document.documentElement
        Object.entries(themeColors).forEach(([key, val]) => {
          root.style.setProperty(`--color-primary-${key}`, val as string)
        })
      }
    } catch (e) {
      console.warn('No se pudo acceder a localStorage para el tema:', e)
    }

    async function initAuth() {
      if (pb.authStore.isValid) {
        try {
          await pb.collection('users').authRefresh()
        } catch (err) {
          console.warn('Auth refresh failed, keeping current session:', err)
          // Do NOT clear the authStore here, as it might fail due to iframe/CORS issues
        }
      }
      setSession(pb.authStore.model)
      setLoading(false)
    }

    initAuth()

    return pb.authStore.onChange((_token, model) => {
      setSession(model)
    })
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Cargando...</div>
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="flex bg-zinc-950 text-zinc-100 min-h-screen font-sans">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8 overflow-auto">
          <Outlet context={{ user: session }} />
        </main>
      </div>
    </div>
  )
}

export default App
