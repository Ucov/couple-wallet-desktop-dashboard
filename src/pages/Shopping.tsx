import { useState, useEffect } from 'react'
import { pb } from '@/lib/pocketbase'
import { useOutletContext } from 'react-router-dom'
import type { RecordModel } from 'pocketbase'
import { Check, Clock, Trash2, Plus } from 'lucide-react'

export default function Shopping() {
  const { user } = useOutletContext<{ user: RecordModel }>()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')

  useEffect(() => {
    fetchItems()
  }, [user.id])

  async function fetchItems() {
    setLoading(true)
    try {
      if (user?.couple_id) {
        const data = await pb.collection('shopping_items').getFullList({
          filter: `couple_id = "${user.couple_id}"`,
          sort: '-created_at'
        })
        setItems(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (item: any) => {
    const newStatus = item.status === 'pending' ? 'bought' : 'pending'
    try {
      await pb.collection('shopping_items').update(item.id, { status: newStatus })
      setItems(items.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('shopping_items').delete(id)
      setItems(items.filter(i => i.id !== id))
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim() || !user?.couple_id) return

    try {
      const data = await pb.collection('shopping_items').create({
        name: newItemName,
        couple_id: user.couple_id,
        created_by: user.id,
        status: 'pending'
      })

      setItems([data, ...items])
      setNewItemName('')
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  if (loading) return <div className="text-zinc-500">Cargando lista...</div>

  const pendingItems = items.filter(i => i.status === 'pending')
  const boughtItems = items.filter(i => i.status === 'bought')

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Lista de la Compra</h1>
        <p className="text-zinc-500 mt-1">Organiza lo que falta en casa y sincrónizalo con el móvil al instante.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-lg">
        <form onSubmit={handleAdd} className="flex gap-4 mb-8">
          <input 
            type="text" 
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            placeholder="¿Qué hace falta comprar? (Ej. Leche, Papel higiénico...)"
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button 
            type="submit"
            disabled={!newItemName.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Añadir
          </button>
        </form>

        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock size={16} /> Pendientes ({pendingItems.length})
            </h2>
            <div className="space-y-2">
              {pendingItems.length === 0 && <p className="text-zinc-600 text-sm">Todo comprado.</p>}
              {pendingItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl group hover:border-zinc-700 transition-colors">
                  <span className="text-white font-medium">{item.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggle(item)} className="p-2 bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-zinc-400 rounded-lg transition-colors">
                      <Check size={18} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 opacity-0 group-hover:opacity-100 bg-red-950/30 hover:bg-red-900 text-red-400 rounded-lg transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {boughtItems.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Check size={16} /> Comprados
              </h2>
              <div className="space-y-2 opacity-60">
                {boughtItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl group">
                    <span className="text-zinc-400 line-through">{item.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleToggle(item)} className="p-2 bg-emerald-900/30 text-emerald-500 rounded-lg transition-colors">
                        <Check size={18} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-950/30 hover:bg-red-900 text-red-400 rounded-lg transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
