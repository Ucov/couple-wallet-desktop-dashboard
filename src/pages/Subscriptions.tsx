import { useState, useEffect } from 'react'
import { pb } from '@/lib/pocketbase'
import { useOutletContext } from 'react-router-dom'
import type { RecordModel } from 'pocketbase'
import { Repeat, Plus, Zap, Play, Pause } from 'lucide-react'

export default function Subscriptions() {
  const { user } = useOutletContext<{ user: RecordModel }>()
  const [subscriptions, setSubscriptions] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<RecordModel[]>([])

  const [form, setForm] = useState({
    name: '',
    amount: '',
    status: 'active',
    billing_cycle: 'monthly',
    category_id: ''
  })

  useEffect(() => {
    fetchData()
  }, [user.id])

  async function fetchData() {
    setLoading(true)
    try {
      if (user?.couple_id) {
        const subs = await pb.collection('subscriptions').getFullList({
          filter: `couple_id = "${user.couple_id}"`,
          sort: '-created',
          expand: 'category_id'
        })
        setSubscriptions(subs)
        
        const cats = await pb.collection('categories').getFullList()
        setCategories(cats)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.amount || !form.category_id || !user?.couple_id) return

    try {
      const data = await pb.collection('subscriptions').create({
        ...form,
        amount: Number(form.amount),
        couple_id: user.couple_id,
        paid_by: user.id
      })
      
      const expandedData = await pb.collection('subscriptions').getOne(data.id, { expand: 'category_id' })
      setSubscriptions([expandedData, ...subscriptions])
      
      setForm({
        name: '',
        amount: '',
        status: 'active',
        billing_cycle: 'monthly',
        category_id: form.category_id
      })
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const toggleStatus = async (sub: RecordModel) => {
    try {
      const newStatus = sub.status === 'active' ? 'paused' : 'active'
      await pb.collection('subscriptions').update(sub.id, {
        status: newStatus
      })
      setSubscriptions(subscriptions.map(s => s.id === sub.id ? { ...s, status: newStatus } : s))
    } catch(err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar suscripción?')) return
    try {
      await pb.collection('subscriptions').delete(id)
      setSubscriptions(subscriptions.filter(s => s.id !== id))
    } catch(err) {
      console.error(err)
    }
  }

  if (loading) return <div className="text-zinc-500">Cargando suscripciones...</div>

  const totalMonthly = subscriptions
    .filter(s => s.status === 'active')
    .reduce((acc, curr) => acc + curr.amount * (curr.billing_cycle === 'yearly' ? 1/12 : 1), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Radar de Suscripciones</h1>
          <p className="text-zinc-500 mt-1">Detecta y controla los pagos recurrentes del hogar.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Costo Mensual Activo</p>
          <p className="text-4xl font-black text-emerald-400">{totalMonthly.toFixed(2)} €</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-lg h-fit">
          <div className="flex items-center gap-2 text-emerald-400 mb-4">
            <Zap size={20} />
            <h2 className="text-xl font-bold text-white">Nueva Suscripción</h2>
          </div>
          
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">Servicio</label>
              <input 
                type="text" 
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Ej. Netflix"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">Ciclo</label>
                <select 
                  value={form.billing_cycle}
                  onChange={e => setForm({...form, billing_cycle: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="monthly">Mensual</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">Categoría</label>
              <select 
                value={form.category_id}
                onChange={e => setForm({...form, category_id: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="">Selecciona...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button 
              type="submit"
              disabled={!form.name || !form.amount || !form.category_id}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 mt-4"
            >
              <Plus size={18} /> Añadir
            </button>
          </form>
        </div>

        <div className="col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Repeat size={16} /> Suscripciones Activas y Pausadas
          </h2>
          
          <div className="grid gap-4">
            {subscriptions.length === 0 && (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                No hay suscripciones registradas.
              </div>
            )}
            {subscriptions.map(sub => (
              <div key={sub.id} className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${
                sub.status === 'active' 
                  ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' 
                  : 'bg-zinc-950/50 border-zinc-900 opacity-75'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${sub.status === 'active' ? 'bg-emerald-950/50 text-emerald-400' : 'bg-zinc-900 text-zinc-600'}`}>
                    {sub.status === 'active' ? <Play size={24} /> : <Pause size={24} />}
                  </div>
                  <div>
                    <h3 className={`font-bold text-xl ${sub.status === 'active' ? 'text-white' : 'text-zinc-600 line-through'}`}>{sub.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">
                        {sub.expand?.category_id?.name}
                      </span>
                      <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
                        {sub.billing_cycle === 'monthly' ? 'Mensual' : 'Anual'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`text-2xl font-black ${sub.status === 'active' ? 'text-white' : 'text-zinc-600'}`}>
                      {sub.amount.toFixed(2)} €
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2 border-l border-zinc-800 pl-6">
                    <button 
                      onClick={() => toggleStatus(sub)}
                      className="text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                    >
                      {sub.status === 'active' ? 'Pausar' : 'Activar'}
                    </button>
                    <button 
                      onClick={() => handleDelete(sub.id)}
                      className="text-xs font-bold text-red-500/70 hover:text-red-400 transition-colors"
                    >
                      Eliminar
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
