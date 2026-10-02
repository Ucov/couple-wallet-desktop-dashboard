import { useState, useEffect } from 'react'
import { pb } from '@/lib/pocketbase'
import { useOutletContext } from 'react-router-dom'
import type { RecordModel } from 'pocketbase'
import { Repeat, Plus, Zap, Pause, Play, Trash2 } from 'lucide-react'

export default function Subscriptions() {
  const { user } = useOutletContext<{ user: RecordModel }>()
  const [subscriptions, setSubscriptions] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [categories, setCategories] = useState<RecordModel[]>([])

  const [form, setForm] = useState({
    concept: '',
    amount: '',
    category_id: '',
    day_of_month: 1
  })

  useEffect(() => {
    fetchData()
  }, [user.id])

  async function fetchData() {
    setLoading(true)
    try {
      if (user?.couple_id) {
        const subs = await pb.collection('recurring_expenses').getFullList({
          filter: couple_id = "",
          expand: 'category_id',
          requestKey: null
        })
        setSubscriptions(subs)
        
        const cats = await pb.collection('categories').getFullList({
          sort: 'name',
          requestKey: null
        })
        setCategories(cats)
      }
    } catch (err: any) {
      const details = err.response ? JSON.stringify(err.response, null, 2) : err.message
      console.error("Error fetching subscriptions:", details)
      setErrorMsg(details)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.concept || !form.amount || !form.category_id || !user?.couple_id) return

    try {
      const data = await pb.collection('recurring_expenses').create({
        couple_id: user.couple_id,
        concept: form.concept,
        amount: parseFloat(form.amount),
        category_id: form.category_id,
        day_of_month: Number(form.day_of_month),
        paid_by: user.id,
        is_paused: false
      })
      
      const expandedData = await pb.collection('recurring_expenses').getOne(data.id, { expand: 'category_id' })
      setSubscriptions([...subscriptions, expandedData])
      setForm({ concept: '', amount: '', category_id: '', day_of_month: 1 })
    } catch(err) {
      console.error(err)
    }
  }

  const toggleStatus = async (sub: RecordModel) => {
    try {
      const newStatus = !sub.is_paused
      await pb.collection('recurring_expenses').update(sub.id, {
        is_paused: newStatus
      })
      setSubscriptions(subscriptions.map(s => s.id === sub.id ? { ...s, is_paused: newStatus } : s))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar gasto recurrente?')) return
    try {
      await pb.collection('recurring_expenses').delete(id)
      setSubscriptions(subscriptions.filter(s => s.id !== id))
    } catch(err) {
      console.error(err)
    }
  }

  if (loading) return <div className="text-zinc-500">Cargando gastos recurrentes...</div>
  if (errorMsg) return (
    <div className="p-6 bg-red-950/30 border border-red-500/50 rounded-2xl text-red-400">
      <h3 className="font-bold mb-2">Error de Base de Datos:</h3>
      <pre className="text-xs overflow-auto whitespace-pre-wrap">{errorMsg}</pre>
    </div>
  )

  const totalMonthly = subscriptions
    .filter(s => !s.is_paused)
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Gastos Fijos</h1>
          <p className="text-zinc-500 mt-1">Detecta y controla los pagos recurrentes del hogar.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Costo Mensual Activo</p>
          <p className="text-4xl font-black text-primary-400">{totalMonthly.toFixed(2)} €</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-lg h-fit">
          <div className="flex items-center gap-2 text-primary-400 mb-4">
            <Zap size={20} />
            <h2 className="text-xl font-bold text-white">Nuevo Gasto Fijo</h2>
          </div>
          
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">Servicio / Gasto</label>
              <input 
                type="text" 
                value={form.concept}
                onChange={e => setForm({...form, concept: e.target.value})}
                placeholder="Ej. Netflix o Alquiler"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">Importe</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})}
                  placeholder="0.00"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">Día del Mes</label>
                <input 
                  type="number" 
                  min="1" max="31"
                  value={form.day_of_month}
                  onChange={e => setForm({...form, day_of_month: Number(e.target.value)})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">Categoría</label>
              <select 
                value={form.category_id}
                onChange={e => setForm({...form, category_id: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
              >
                <option value="">Selecciona...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button 
              type="submit"
              disabled={!form.concept || !form.amount || !form.category_id}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 mt-4"
            >
              <Plus size={18} /> Añadir
            </button>
          </form>
        </div>

        <div className="col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Repeat size={16} /> Listado de Gastos
          </h2>
          
          <div className="grid gap-4">
            {subscriptions.length === 0 && (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                No hay gastos recurrentes registrados.
              </div>
            )}
            {subscriptions.map(sub => (
              <div key={sub.id} className={lex items-center justify-between p-6 rounded-2xl border transition-all }>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleStatus(sub)}
                    className={p-4 rounded-2xl cursor-pointer hover:scale-105 transition-all active:scale-95 }
                    title={!sub.is_paused ? 'Pausar gasto' : 'Reanudar gasto'}
                  >
                    {!sub.is_paused ? <Pause size={24} /> : <Play size={24} />}
                  </button>
                  <div>
                    <h3 className={ont-bold text-xl }>{sub.concept}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">
                        {sub.expand?.category_id?.name || 'Sin categoría'}
                      </span>
                      <span className="text-xs text-zinc-500 font-semibold">
                        Día {sub.day_of_month}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={	ext-2xl font-black }>
                      {Number(sub.amount).toFixed(2)} €
                    </p>
                  </div>
                  <div className="flex flex-col justify-center border-l border-zinc-800 pl-6">
                    <button 
                      onClick={() => handleDelete(sub.id)}
                      className="text-xs font-bold text-red-500/70 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
