import { useState, useRef } from 'react'
import { pb } from '@/lib/pocketbase'
import { useOutletContext } from 'react-router-dom'
import type { RecordModel } from 'pocketbase'
import { Download, ShieldAlert, CheckCircle2, Upload, AlertTriangle } from 'lucide-react'

export default function Backup() {
  const { user } = useOutletContext<{ user: RecordModel }>()
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'import_success'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setLoading(true)
    setLoadingText('Preparando exportación...')
    setStatus('idle')
    setErrorMsg('')
    
    try {
      if (!user?.couple_id) throw new Error('No se pudo verificar tu pareja.')

      const couple_id = user.couple_id

      // 2. Fetch all relevant data for the couple
      const [expensesRes, calendarRes, shoppingRes, profileRes, budgetsRes] = await Promise.all([
        pb.collection('expenses').getFullList({ filter: `couple_id = "${couple_id}"` }),
        pb.collection('calendar_events').getFullList({ filter: `couple_id = "${couple_id}"` }),
        pb.collection('shopping_items').getFullList({ filter: `couple_id = "${couple_id}"` }),
        pb.collection('users').getFullList({ filter: `couple_id = "${couple_id}"` }),
        pb.collection('budgets').getFullList({ filter: `couple_id = "${couple_id}"` })
      ])

      const backupData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        couple_id,
        data: {
          profiles: profileRes || [],
          expenses: expensesRes || [],
          calendar_events: calendarRes || [],
          shopping_items: shoppingRes || [],
          budgets: budgetsRes || []
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
      setLoadingText('')
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!window.confirm('⚠️ ATENCIÓN: Esta acción borrará todos los gastos, eventos, tareas y presupuestos actuales de tu hogar y los sustituirá por los de la copia de seguridad. ¿Estás absolutamente seguro de continuar?')) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setLoading(true)
    setStatus('idle')
    setErrorMsg('')

    try {
      if (!user?.couple_id) throw new Error('No se pudo verificar tu pareja.')
      
      setLoadingText('Leyendo archivo...')
      const text = await file.text()
      const backupData = JSON.parse(text)

      if (!backupData.version || !backupData.data) {
        throw new Error('El archivo no tiene el formato de copia de seguridad válido de Couple Wallet.')
      }

      const { expenses = [], calendar_events = [], shopping_items = [], budgets = [] } = backupData.data
      const currentCoupleId = user.couple_id

      setLoadingText('Borrando datos actuales...')
      // 1. Delete existing records for this couple
      const collections = ['expenses', 'calendar_events', 'shopping_items', 'budgets']
      for (const col of collections) {
        try {
          const existing = await pb.collection(col).getFullList({ filter: `couple_id = "${currentCoupleId}"` })
          for (const item of existing) {
            await pb.collection(col).delete(item.id)
          }
        } catch(err) {
          console.warn(`Error limpiando colección ${col}:`, err)
        }
      }

      setLoadingText('Restaurando copia de seguridad...')
      // 2. Insert new records
      const insertData = async (col: string, items: any[]) => {
        for (const item of items) {
          const data = { ...item, couple_id: currentCoupleId }
          delete data.created
          delete data.updated
          delete data.collectionId
          delete data.collectionName
          delete data.expand
          delete data.id // Allow pocketbase to auto-generate a new ID
          
          await pb.collection(col).create(data, { requestKey: null })
        }
      }

      await insertData('expenses', expenses)
      await insertData('calendar_events', calendar_events)
      await insertData('shopping_items', shopping_items)
      await insertData('budgets', budgets)

      setStatus('import_success')
    } catch (error: any) {
      console.error("IMPORT ERROR:", error, error.data)
      setStatus('error')
      const validationErrors = error.data?.data ? JSON.stringify(error.data.data) : ''
      setErrorMsg((error.message || 'Error desconocido') + ' ' + validationErrors)
    } finally {
      setLoading(false)
      setLoadingText('')
      if (fileInputRef.current) fileInputRef.current.value = ''
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
          {loading && loadingText.includes('export') ? 'Preparando exportación...' : 'Descargar Archivo .json'}
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-lg">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 bg-amber-950/30 border border-amber-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Upload className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Restaurar Copia de Seguridad</h2>
            <p className="text-zinc-400 text-sm mt-1">
              Sube un archivo de copia de seguridad (.json) previo. 
              <span className="text-red-400 font-bold ml-1">¡ATENCIÓN! Esto sobrescribirá todos los datos actuales de tu hogar.</span>
            </p>
          </div>
        </div>

        {status === 'import_success' && (
          <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4 flex items-center gap-3 mb-6 text-emerald-400">
            <CheckCircle2 size={20} />
            <p className="font-medium text-sm">Copia de seguridad restaurada correctamente. Los datos de tu hogar han sido actualizados.</p>
          </div>
        )}

        <input 
          type="file" 
          accept=".json" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
        />
        
        <button 
          onClick={handleImportClick}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && !loadingText.includes('export') ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              {loadingText}
            </span>
          ) : (
            'Importar Archivo .json'
          )}
        </button>
      </div>
    </div>
  )
}
