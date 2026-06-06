import { useState, useEffect } from 'react'
import { pb } from '@/lib/pocketbase'
import { useOutletContext } from 'react-router-dom'
import type { RecordModel } from 'pocketbase'
import { Calendar, Trash2, Plus, Clock } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Chores() {
  const { user } = useOutletContext<{ user: RecordModel }>()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    fetchEvents()
  }, [user.id])

  async function fetchEvents() {
    setLoading(true)
    try {
      if (user?.couple_id) {
        const data = await pb.collection('calendar_events').getFullList({
          filter: `couple_id = "${user.couple_id}"`,
          sort: 'date'
        })
        setEvents(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('calendar_events').delete(id)
      setEvents(events.filter(e => e.id !== id))
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date || !user?.couple_id) return

    try {
      const data = await pb.collection('calendar_events').create({
        title,
        date: new Date(date).toISOString(),
        couple_id: user.couple_id,
        created_by: user.id
      })

      setEvents([...events, data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
      setTitle('')
      setDate('')
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  if (loading) return <div className="text-zinc-500">Cargando eventos...</div>

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Calendario y Tareas</h1>
        <p className="text-zinc-500 mt-1">Organiza eventos, citas o limpieza de la casa con fecha programada.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-lg">
        <form onSubmit={handleAdd} className="flex gap-4 mb-8">
          <input 
            type="text" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="¿Qué hay que hacer? (Ej. Limpiar baños, Cita médico...)"
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <input 
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button 
            type="submit"
            disabled={!title.trim() || !date}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Agendar
          </button>
        </form>

        <div className="space-y-6">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={16} /> Próximos Eventos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.length === 0 && <p className="text-zinc-600 text-sm col-span-2">No hay eventos programados.</p>}
            {events.map(ev => {
              const eventDate = parseISO(ev.date)
              const isPast = eventDate < new Date(new Date().setHours(0,0,0,0))
              
              return (
                <div key={ev.id} className={`p-5 border rounded-2xl flex flex-col justify-between group transition-colors ${
                  isPast 
                    ? 'bg-zinc-950/50 border-zinc-800/50 opacity-60' 
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}>
                  <div>
                    <h3 className={`font-bold ${isPast ? 'text-zinc-500 line-through' : 'text-white'}`}>{ev.title}</h3>
                    <div className="flex items-center gap-2 mt-2 text-zinc-400 text-sm">
                      <Clock size={14} />
                      <span>{format(eventDate, "EEEE, d 'de' MMMM", { locale: es })}</span>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button 
                      onClick={() => handleDelete(ev.id)}
                      className="p-2 opacity-0 group-hover:opacity-100 bg-red-950/30 hover:bg-red-900 text-red-400 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
