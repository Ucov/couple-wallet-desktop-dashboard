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
    setSession(pb.authStore.model)
    setLoading(false)

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
