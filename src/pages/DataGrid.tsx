import { useEffect, useState, useRef } from 'react'
import { pb } from '@/lib/pocketbase'
import { useOutletContext } from 'react-router-dom'
import type { RecordModel } from 'pocketbase'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Trash2, Edit, Paperclip, FileText, Sparkles, Loader2, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { extractReceiptItems, type ReceiptItem } from '@/lib/aiService'

export default function DataGrid() {
  const { user } = useOutletContext<{ user: RecordModel }>()
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const [categories, setCategories] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [editingExp, setEditingExp] = useState<any | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isAdvancedSplit, setIsAdvancedSplit] = useState(false)
  const [totalAmount, setTotalAmount] = useState<number | ''>('')
  const [myPersonal, setMyPersonal] = useState<number | ''>('')
  const [partnerPersonal, setPartnerPersonal] = useState<number | ''>('')
  const [isSyncing, setIsSyncing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const categorySelectRef = useRef<HTMLSelectElement>(null)

  interface ScannedItem extends ReceiptItem { assignment: 'comun' | 'mio' | 'pareja' | 'ignorar' }
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    if (scannedItems.length === 0) return;
    let t = 0; let m = 0; let p = 0;
    scannedItems.forEach(i => {
      if (i.assignment === 'comun') t += i.price;
      if (i.assignment === 'mio') { t += i.price; m += i.price; }
      if (i.assignment === 'pareja') { t += i.price; p += i.price; }
    });
    setTotalAmount(t);
    setMyPersonal(m);
    setPartnerPersonal(p);
  }, [scannedItems]);

  const fetchExpenses = async () => {
    try {
      if (user?.couple_id) {
        const data = await pb.collection('expenses').getFullList({
          filter: `couple_id = "${user.couple_id}"`,
          sort: '-date',
          expand: 'category_id,paid_by'
        })
        setExpenses(data)
        
        const cats = await pb.collection('categories').getFullList({ sort: 'name' })
        setCategories(cats)

        try {
          const rls = await pb.collection('rules').getFullList({
            filter: `couple_id = "${user.couple_id}"`
          })
          setRules(rls)
        } catch(e) {}
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [user.couple_id])

  const filteredExpenses = expenses.filter(exp => 
    (exp.concept || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await fetch('http://localhost:3001/api/sync', { method: 'POST' })
      await fetchExpenses()
    } catch (err) {
      console.error('Error syncing:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este gasto? Esta acción no se puede deshacer.')) return
    
    setDeletingId(id)
    try {
      await pb.collection('expenses').delete(id)
      setExpenses(prev => prev.filter(e => e.id !== id))
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingExp && !isAdding) return
    
    const formData = new FormData(e.currentTarget)
    const amount = formData.get('amount')
    const concept = formData.get('concept')
    const category_id = formData.get('category_id')
    const file = fileInputRef.current?.files?.[0]

    const updateData = new FormData()
    updateData.append('amount', String(amount))
    updateData.append('concept', String(concept))
    updateData.append('category_id', String(category_id))
    
    if (file) {
      updateData.append('receipt', file)
    }

    try {
      if (isAdding) {
        if (!user?.couple_id) return;
        
        if (isAdvancedSplit) {
          const t = Number(totalAmount) || 0;
          const m = Number(myPersonal) || 0;
          const p = Number(partnerPersonal) || 0;
          const c = t - m - p;
          
          if (c < 0) { alert('El importe común no puede ser negativo'); return; }
          
          const newRecords = [];
          if (c > 0) {
            const commonData = new FormData();
            commonData.append('amount', String(c));
            commonData.append('concept', `${concept} (Común)`);
            commonData.append('category_id', String(category_id));
            commonData.append('couple_id', user.couple_id);
            commonData.append('paid_by', user.id);
            commonData.append('date', new Date().toISOString());
            commonData.append('status', 'PENDING_BANK');
            commonData.append('source', 'MANUAL');
            if (file) commonData.append('receipt', file);
            const rec = await pb.collection('expenses').create(commonData);
            newRecords.push(rec);
          }
          
          if (p > 0) {
            const partnerData = new FormData();
            partnerData.append('amount', String(p));
            partnerData.append('concept', `${concept} (Capricho Pareja)`);
            partnerData.append('category_id', String(category_id));
            partnerData.append('couple_id', user.couple_id);
            partnerData.append('paid_by', user.id);
            partnerData.append('is_refundable', 'true');
            partnerData.append('date', new Date().toISOString());
            partnerData.append('status', 'PENDING_BANK');
            partnerData.append('source', 'MANUAL');
            const rec2 = await pb.collection('expenses').create(partnerData);
            newRecords.push(rec2);
          }

          const cat = categories.find(cat => cat.id === String(category_id))
          const addedExps = newRecords.map(r => ({ ...r, expand: { category_id: cat, paid_by: user } }))
          setExpenses([...addedExps, ...expenses])
        } else {
          updateData.append('couple_id', user.couple_id)
          updateData.append('paid_by', user.id)
          updateData.append('date', new Date().toISOString())
          updateData.append('status', 'PENDING_BANK')
          updateData.append('source', 'MANUAL')
          const newRecord = await pb.collection('expenses').create(updateData)
          const cat = categories.find(c => c.id === String(category_id))
          const newExp = { ...newRecord, expand: { category_id: cat, paid_by: user } }
          setExpenses([newExp, ...expenses])
        }
        
        setIsAdding(false)
        setIsAdvancedSplit(false)
        setTotalAmount('')
        setMyPersonal('')
        setPartnerPersonal('')
      } else {
        if (file && editingExp.status === 'MISSING_RECEIPT') {
          updateData.append('status', 'VERIFIED')
        }
        const updatedRecord = await pb.collection('expenses').update(editingExp.id, updateData)
        setExpenses(prev => prev.map(exp => {
          if (exp.id === editingExp.id) {
            const cat = categories.find(c => c.id === category_id)
            return { ...updatedRecord, expand: { ...exp.expand, category_id: cat } }
          }
          return exp
        }))
        setEditingExp(null)
      }
    } catch (error: any) {
      alert('Error al guardar: ' + error.message)
    }
  }

  const handleConceptChange = (val: string) => {
    if (!categorySelectRef.current) return;
    const lowerVal = val.toLowerCase();
    for (const rule of rules) {
      if (lowerVal.includes(rule.keyword.toLowerCase())) {
        categorySelectRef.current.value = rule.category_id;
        break;
      }
    }
  }

  const getFileUrl = (record: any) => {
    if (!record || !record.receipt) return null
    return pb.files.getURL(record, record.receipt)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    try {
      setIsScanning(true);
      const result = await extractReceiptItems(file, categories.map(c => ({ id: c.id, name: c.name })));
      setScannedItems(result.items.map(i => ({...i, assignment: 'comun'})));
      setIsAdvancedSplit(true);
      
      // Auto-fill concept and category
      setEditingExp((prev: any) => ({
        ...(prev || {}),
        concept: result.merchant || prev?.concept || '',
        category_id: result.categoryId || prev?.category_id || categories[0]?.id
      }));

      // Focus concept input visually by triggering the change so the UI updates
      if (categorySelectRef.current && result.categoryId) {
        categorySelectRef.current.value = result.categoryId;
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsScanning(false);
    }
  }

  if (loading) return <div className="text-zinc-500">Cargando base de datos...</div>

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Base de Gastos y Documentos</h1>
          <p className="text-zinc-500 mt-1">Control total sobre tu historial financiero y tickets.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por concepto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2"
            >
              <RefreshCw size={18} className={isSyncing ? 'animate-spin text-primary-400' : ''} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2"
            >
              Añadir Gasto
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-lg flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-950/50 sticky top-0 backdrop-blur-md z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Concepto</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Categoría</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 text-center">Ticket</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 text-right">Importe</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 text-center">Pagador</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredExpenses.map((exp) => {
                const cat = exp.expand?.category_id
                const isMe = exp.paid_by === user.id
                const fileUrl = getFileUrl(exp)
                
                return (
                  <tr key={exp.id} className="hover:bg-zinc-800/20 transition-colors group">
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {format(parseISO(exp.date), "dd MMM, yyyy", { locale: es })}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-200 font-medium">
                      <div className="flex items-center gap-2">
                        {exp.concept || 'Sin descripción'}
                        {exp.status === 'PENDING_BANK' && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full" title="Pendiente de conciliar con el banco">
                            <Clock size={10} /> Manual
                          </span>
                        )}
                        {exp.status === 'MISSING_RECEIPT' && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-red-950/50 text-red-400 px-2 py-0.5 rounded-full border border-red-900/50" title="Gasto del banco. ¡Sube el ticket!">
                            <AlertTriangle size={10} /> Falta Ticket
                          </span>
                        )}
                        {exp.status === 'VERIFIED' && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-primary-950/30 text-primary-400 px-2 py-0.5 rounded-full border border-primary-900/30" title="Verificado por banco y ticket adjunto">
                            <CheckCircle size={10} /> Verificado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {cat ? (
                        <span 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                          style={{ backgroundColor: `${cat.color}15`, color: cat.color, borderColor: `${cat.color}30` }}
                        >
                          {cat.name}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">Sin categoría</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {fileUrl ? (
                        <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-1.5 rounded-full bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-colors" title="Ver Documento">
                          <FileText size={16} />
                        </a>
                      ) : (
                        <span className="text-zinc-600"><FileText size={16} /></span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-bold text-right">
                      €{Number(exp.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider ${isMe ? 'bg-primary-500/10 text-primary-400' : 'bg-purple-500/10 text-purple-400'}`}>
                        {exp.expand?.paid_by?.name || (isMe ? 'Tú' : 'Pareja')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingExp(exp)}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(exp.id)}
                        disabled={deletingId === exp.id}
                        className="p-2 bg-red-950 hover:bg-red-900 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredExpenses.length === 0 && (
            <div className="p-12 text-center text-zinc-500">
              No se encontraron gastos con esos filtros.
            </div>
          )}
        </div>
      </div>

      {(editingExp || isAdding) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-white mb-6">
              {isAdding ? 'Añadir Nuevo Gasto' : 'Editar Gasto y Ticket'}
            </h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Concepto</label>
                <input 
                  type="text" 
                  name="concept"
                  defaultValue={editingExp?.concept || ''}
                  onChange={(e) => handleConceptChange(e.target.value)}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
              
              {isAdding && (
                <div className="flex items-center justify-between py-2 border-b border-zinc-800/50">
                  <span className="text-sm text-zinc-400">Modo Split Inteligente</span>
                  <button 
                    type="button"
                    onClick={() => setIsAdvancedSplit(!isAdvancedSplit)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${isAdvancedSplit ? 'bg-primary-500' : 'bg-zinc-800'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isAdvancedSplit ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              )}

              {!isAdvancedSplit ? (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Importe (€)</label>
                  <input 
                    type="number" 
                    name="amount"
                    step="0.01"
                    defaultValue={editingExp?.amount || ''}
                    required={!isAdvancedSplit}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
              ) : (
                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Total del Ticket (€)</label>
                    <input 
                      type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value ? Number(e.target.value) : '')} required
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-primary-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Caprichos Míos (€)</label>
                      <input 
                        type="number" step="0.01" value={myPersonal} onChange={e => setMyPersonal(e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-300 focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Caprichos Pareja (€)</label>
                      <input 
                        type="number" step="0.01" value={partnerPersonal} onChange={e => setPartnerPersonal(e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-300 focus:border-orange-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Gasto Común Resultante:</span>
                    <span className={`font-mono font-bold ${((Number(totalAmount)||0) - (Number(myPersonal)||0) - (Number(partnerPersonal)||0)) < 0 ? 'text-red-500' : 'text-primary-400'}`}>
                      {((Number(totalAmount)||0) - (Number(myPersonal)||0) - (Number(partnerPersonal)||0)).toFixed(2)}€
                    </span>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría</label>
                <select 
                  name="category_id"
                  ref={categorySelectRef}
                  defaultValue={editingExp?.expand?.category_id?.id || ''}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-zinc-800 mt-4">
                <label className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                  <Paperclip size={16} /> Adjuntar y Leer Ticket
                </label>
                {getFileUrl(editingExp) && (
                  <div className="mb-2 text-xs text-primary-400">
                    Este gasto ya tiene un documento adjunto. Subir uno nuevo lo reemplazará.
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="w-full text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-primary-400 hover:file:bg-zinc-700 transition-colors cursor-pointer"
                />
                {isScanning && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-primary-400 font-bold animate-pulse">
                    <Loader2 size={14} className="animate-spin" /> IA escaneando productos...
                  </div>
                )}
                {scannedItems.length > 0 && (
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2 mt-3">
                    <h3 className="text-xs font-bold text-primary-400 flex items-center gap-1"><Sparkles size={14}/> Checklist Inteligente</h3>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {scannedItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2 bg-zinc-900 rounded-lg">
                           <span className="text-zinc-300 w-[45%] truncate" title={item.name}>{item.name}</span>
                           <span className="text-zinc-400 font-mono w-[15%] text-right">{item.price.toFixed(2)}€</span>
                           <select 
                             className="bg-zinc-800 text-white rounded p-1 border border-zinc-700 focus:border-primary-500"
                             value={item.assignment}
                             onChange={(e) => {
                               const newItems = [...scannedItems];
                               newItems[idx].assignment = e.target.value as any;
                               setScannedItems(newItems);
                             }}
                           >
                             <option value="comun">👫 Común</option>
                             <option value="mio">👤 Mío</option>
                             <option value="pareja">👤 Pareja</option>
                             <option value="ignorar">❌ Ignorar</option>
                           </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => { setEditingExp(null); setIsAdding(false); setScannedItems([]); }}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-xl font-medium transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
