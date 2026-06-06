import { useState } from 'react'
import { pb } from '@/lib/pocketbase'
import { useOutletContext } from 'react-router-dom'
import type { RecordModel } from 'pocketbase'
import { Download, ShieldAlert, CheckCircle2 } from 'lucide-react'

export default function Backup() {
  const { user } = useOutletContext<{ user: RecordModel }>()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleExport = async () => {
    setLoading(true)
    setStatus('idle')
    setErrorMsg('')
    
    try {
      if (!user?.couple_id) throw new Error('No se pudo verificar tu pareja.')

      const couple_id = user.couple_id

      // 2. Fetch all relevant data for the couple
      const [expensesRes, calendarRes, shoppingRes, profileRes] = await Promise.all([
        pb.collection('expenses').getFullList({ filter: `couple_id = "${couple_id}"` }),
        pb.collection('calendar_events').getFullList({ filter: `couple_id = "${couple_id}"` }),
        pb.collection('shopping_items').getFullList({ filter: `couple_id = "${couple_id}"` }),
        pb.collection('users').getFullList({ filter: `couple_id = "${couple_id}"` })
      ])

      const backupData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        couple_id,
        data: {
          profiles: profileRes || [],
          expenses: expensesRes || [],
          calendar_events: calendarRes || [],
          shopping_items: shoppingRes || []
        }
      }

      // 3. Trigger download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2))
      const downloadAnchorNode = document.createElement('a')
      downloadAnchorNode.setAttribute("href", dataStr)
      downloadAnchorNode.setAttribute("download", `couplewallet_backup_${new Date().getTime()}.json`)
      document.body.appendChild(downloadAnchorNode)
      downloadAnchorNode.click()
      downloadAnchorNode.remove()
      
      setStatus('success')
    } catch (error: any) {
      setStatus('error')
      setErrorMsg(error.message || 'Error desconocido al exportar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Copias de Seguridad</h1>
        <p className="text-zinc-500 mt-1">Exporta tu historial completo para no perder nada nunca.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-lg">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Exportar a JSON</h2>
            <p className="text-zinc-400 text-sm mt-1">
              Descarga un archivo con todos tus gastos, tareas del hogar, listas de la compra y configuraciones. Este archivo es tuyo y puedes guardarlo donde quieras.
            </p>
          </div>
        </div>

        {status === 'success' && (
          <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4 flex items-center gap-3 mb-6 text-emerald-400">
            <CheckCircle2 size={20} />
            <p className="font-medium text-sm">Copia de seguridad descargada con éxito.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 flex items-center gap-3 mb-6 text-red-400">
            <ShieldAlert size={20} />
            <p className="font-medium text-sm">Error: {errorMsg}</p>
          </div>
        )}

        <button 
          onClick={handleExport}
          disabled={loading}
          className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? 'Preparando exportación...' : 'Descargar Archivo .json'}
        </button>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 opacity-50">
        <h2 className="text-xl font-bold text-zinc-600 mb-2">Restaurar Copia de Seguridad</h2>
        <p className="text-zinc-600 text-sm mb-4">Esta funcionalidad (importar datos) está bloqueada en la fase de Pruebas de Concepto.</p>
        <button disabled className="bg-zinc-900 text-zinc-700 font-bold py-3 px-6 rounded-xl cursor-not-allowed">
          Importar Archivo
        </button>
      </div>
    </div>
  )
}
