import { useState, useEffect } from 'react'
import { pb } from '@/lib/pocketbase'
import { useOutletContext } from 'react-router-dom'
import type { RecordModel } from 'pocketbase'
import { CheckSquare, Trash2, Plus, Star, Repeat } from 'lucide-react'

export default function Chores() {
  const { user } = useOutletContext<{ user: RecordModel }>()
  const [chores, setChores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [points, setPoints] = useState(1)
  const [isRecurring, setIsRecurring] = useState(false)

  useEffect(() => {
    fetchChores()
  }, [user.id])

  async function fetchChores() {
    setLoading(true)
    try {
      if (user?.couple_id) {
        const data = await pb.collection('chores').getFullList({
          filter: `couple_id = "${user.couple_id}"`,
          sort: '-created'
        })
        setChores(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('chores').delete(id)
      setChores(chores.filter(e => e.id !== id))
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !user?.couple_id) return

    try {
      const data = await pb.collection('chores').create({
        title,
        points: Number(points),
        couple_id: user.couple_id,
        is_recurring: isRecurring
      })

      setChores([data, ...chores])
      setTitle('')
      setPoints(1)
      setIsRecurring(false)
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  if (loading) return <div className="text-zinc-500">Cargando tareas...</div>

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Tareas Domésticas</h1>
        <p className="text-zinc-500 mt-1">Gestiona las tareas del hogar y los puntos asignados.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-lg">
        <form onSubmit={handleAdd} className="flex gap-4 mb-8">
          <input 
            type="text" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Nueva tarea (ej. Limpiar cocina)" 
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
          />
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-4">
             <Star size={16} className="text-yellow-500 mr-2"/>
             <input 
              type="number" 
              value={points}
              onChange={e => setPoints(Number(e.target.value))}
              className="w-16 bg-transparent text-white focus:outline-none"
            />
          </div>
          <button type="submit" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-xl font-bold transition-colors">
            <Plus size={20} /> Añadir
          </button>
        </form>

        <div className="space-y-3">
          {chores.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              No hay tareas registradas. �A�ade una arriba!
            </div>
          )}
          {chores.map((chore) => (
            <div key={chore.id} className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 text-zinc-400 rounded-xl">
                  <CheckSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">{chore.title}</h3>
                  <div className="flex items-center gap-1 text-yellow-500 mt-1">
                    <Star size={12} fill="currentColor" />
                    <span className="text-xs font-bold">{chore.points} ptos</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(chore.id)}
                className="p-3 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
