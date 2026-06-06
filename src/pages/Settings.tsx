import { useState, useEffect } from 'react'
import { pb } from '@/lib/pocketbase'
import { useOutletContext } from 'react-router-dom'
import type { RecordModel } from 'pocketbase'
import { Save, Users } from 'lucide-react'

export default function Settings() {
  const { user } = useOutletContext<{ user: RecordModel }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profiles, setProfiles] = useState<any[]>([])
  
  useEffect(() => {
    async function fetchProfiles() {
      try {
        if (user?.couple_id) {
          const coupleProfiles = await pb.collection('users').getFullList({
            filter: `couple_id = "${user.couple_id}"`,
            sort: 'name'
          })
          setProfiles(coupleProfiles)
        }
      } catch(err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfiles()
  }, [user.id])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    
    const formData = new FormData(e.currentTarget)
    
    try {
      const updates = profiles.map(p => {
        return pb.collection('users').update(p.id, {
          name: String(formData.get(`name_${p.id}`)),
          split_percentage: Number(formData.get(`split_${p.id}`))
        })
      })

      await Promise.all(updates)
      
      alert('Configuración guardada correctamente.')
    } catch (error: any) {
      alert('Error al guardar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSplitChange = (changedId: string, newValue: number) => {
    if (profiles.length !== 2) return
    const otherProfile = profiles.find(p => p.id !== changedId)
    if (!otherProfile) return

    setProfiles(prev => prev.map(p => {
      if (p.id === changedId) return { ...p, split_percentage: newValue }
      if (p.id === otherProfile.id) return { ...p, split_percentage: 100 - newValue }
      return p
    }))
  }

  if (loading) return <div className="text-zinc-500">Cargando configuración...</div>

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Configuración de Pareja</h1>
        <p className="text-zinc-500 mt-1">Ajusta cómo se divide la economía y tus datos personales.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-lg">
        <form onSubmit={handleSave} className="space-y-8">
          
          <section>
            <div className="flex items-center gap-2 mb-6 text-emerald-400">
              <Users size={20} />
              <h2 className="text-xl font-bold text-white">Miembros del Hogar</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {profiles.map((p) => (
                <div key={p.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-zinc-300">
                    {p.id === user.id ? 'Tú (Administrador Local)' : 'Pareja'}
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">Nombre</label>
                    <input 
                      type="text" 
                      name={`name_${p.id}`}
                      defaultValue={p.name || ''}
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">
                      Aportación Económica ({p.split_percentage}%)
                    </label>
                    <input 
                      type="range" 
                      name={`split_${p.id}`}
                      min="0"
                      max="100"
                      value={p.split_percentage}
                      onChange={(e) => handleSplitChange(p.id, Number(e.target.value))}
                      className="w-full mt-2 accent-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>
            {profiles.length < 2 && (
              <p className="text-amber-500 text-sm mt-4">Atención: No se ha detectado a tu pareja en la base de datos.</p>
            )}
          </section>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit"
              disabled={saving || profiles.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Guardando...' : 'Guardar Cambios de la Casa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
