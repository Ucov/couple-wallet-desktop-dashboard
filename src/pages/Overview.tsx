import { useState, useEffect } from 'react'
import { pb } from '@/lib/pocketbase'
import { useOutletContext } from 'react-router-dom'
import type { RecordModel } from 'pocketbase'
import ExpenseAreaChart from '@/components/charts/ExpenseAreaChart'
import CategoryDonutChart from '@/components/charts/CategoryDonutChart'
import { TrendingUp, PieChart, Target, Settings as SettingsIcon, CheckCircle2, Edit3, Trash2 } from 'lucide-react'

export default function Overview() {
  const { user } = useOutletContext<{ user: RecordModel }>()
  const [stats, setStats] = useState({ total: 0, userAPaid: 0, userBPaid: 0, mySplit: 50, partnerSplit: 50, balance: 0 })
  const [profiles, setProfiles] = useState<{id: string, name: string, split: number}[]>([])
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])
  const [donutData, setDonutData] = useState<any[]>([])

  // ERP New States
  const [budgets, setBudgets] = useState<RecordModel[]>([])
  const [categories, setCategories] = useState<RecordModel[]>([])
  const [currentMonthTotals, setCurrentMonthTotals] = useState<Record<string, number>>({})
  
  const [settleUpModalOpen, setSettleUpModalOpen] = useState(false)
  const [settleLoading, setSettleLoading] = useState(false)
  
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [budgetForm, setBudgetForm] = useState({ category_id: '', amount: '' })

  const fetchData = async () => {
    try {
      if (!user.couple_id) {
        setLoading(false)
        return
      }

      const coupleProfiles = await pb.collection('users').getFullList({
        filter: `couple_id = "${user.couple_id}"`,
        requestKey: null
      })
      const formattedProfiles = coupleProfiles.map(p => ({ id: p.id, name: p.name || 'Sin Nombre', split: p.split_percentage }))
      setProfiles(formattedProfiles)

      const mySplit = user.split_percentage || 50
      const partnerSplit = formattedProfiles.find(p => p.id !== user.id)?.split || (100 - mySplit)

      const expenses = await pb.collection('expenses').getFullList({
        filter: `couple_id = "${user.couple_id}"`,
        expand: 'category_id',
        requestKey: null
      })
      
      const cats = await pb.collection('categories').getFullList({ sort: 'name', requestKey: null })
      setCategories(cats)

      let buds: RecordModel[] = []
      try {
        buds = await pb.collection('budgets').getFullList({
          filter: `couple_id = "${user.couple_id}"`,
          expand: 'category_id',
          requestKey: null
        })
      } catch(err) {
        console.warn("Budgets collection might not be accessible yet", err)
      }
      setBudgets(buds)

      // CALCULATE BALANCE
      const userAId = formattedProfiles[0]?.id || user.id
      const userBId = formattedProfiles[1]?.id || 'unknown'

      let expectedUserANormal = 0
      let expectedUserBNormal = 0
      let userAPaidNormal = 0
      let userBPaidNormal = 0
      
      let userARefundable = 0
      let userBRefundable = 0

      let userATransfersSent = 0
      let userBTransfersSent = 0

      const now = new Date()
      const currentTotals: Record<string, number> = {}

      expenses.forEach(e => {
        const amt = Number(e.amount)
        if (e.is_transfer) {
          if (e.paid_by === userAId) userATransfersSent += amt
          else if (e.paid_by === userBId) userBTransfersSent += amt
        } else if (e.is_refundable) {
          if (e.paid_by === userAId) userARefundable += amt
          else if (e.paid_by === userBId) userBRefundable += amt
        } else {
          if (e.paid_by === userAId) userAPaidNormal += amt
          else if (e.paid_by === userBId) userBPaidNormal += amt
          
          expectedUserANormal += amt * (mySplit / 100)
          expectedUserBNormal += amt * (partnerSplit / 100)

          // Budget calculation (current month only)
          const d = new Date(e.date)
          if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
             const catId = e.category_id || e.expand?.category_id?.id
             if (catId) {
               currentTotals[catId] = (currentTotals[catId] || 0) + amt
             }
          }
        }
      })

      setCurrentMonthTotals(currentTotals)

      let userABalance = expectedUserANormal - userAPaidNormal
      userABalance += userBRefundable 
      userABalance -= userARefundable 
      userABalance -= userATransfersSent 
      userABalance += userBTransfersSent 

      const displayBalance = -userABalance
      const totalUnsettledNormal = expectedUserANormal + expectedUserBNormal

      setStats({ 
        total: totalUnsettledNormal, 
        userAPaid: userAPaidNormal, 
        userBPaid: userBPaidNormal, 
        mySplit, 
        partnerSplit,
        balance: displayBalance,
        count: expenses.length
      } as any)

      // CHARTS
      const months: Record<string, { date: string, userA: number, userB: number }> = {}
      expenses.filter(e => !e.is_transfer && !e.is_refundable).forEach(e => {
        const dateObj = new Date(e.date)
        const monthYear = `${dateObj.toLocaleString('es-ES', { month: 'short' })} ${dateObj.getFullYear()}`
        if (!months[monthYear]) months[monthYear] = { date: monthYear, userA: 0, userB: 0 }
        
        if (e.paid_by === userAId) months[monthYear].userA += Number(e.amount)
        else if (e.paid_by === userBId) months[monthYear].userB += Number(e.amount)
      })
      setChartData(Object.values(months).reverse())

      const donutCats: Record<string, number> = {}
      expenses.filter(e => !e.is_transfer && !e.is_refundable).forEach(e => {
        const catName = e.expand?.category_id?.name || 'Otros'
        donutCats[catName] = (donutCats[catName] || 0) + Number(e.amount)
      })
      setDonutData(Object.entries(donutCats).map(([name, value], idx) => ({ 
        name, 
        value,
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][idx % 6]
      })))
      
      setLoading(false)
    } catch (err: any) {
      setStats(prev => ({ ...prev, error: err.message }))
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user.id])

  const handleSettleUp = async () => {
    setSettleLoading(true)
    try {
      const userAId = profiles[0]?.id || user.id
      const userBId = profiles[1]?.id || 'unknown'
      
      // If stats.balance > 0, partner (userB) owes userA. Partner is paying userA.
      // If stats.balance < 0, userA owes partner. userA is paying partner.
      const paidById = stats.balance > 0 ? userBId : userAId
      const amountToSettle = Math.abs(stats.balance)

      await pb.collection('expenses').create({
        concept: 'Liquidación de saldo',
        amount: amountToSettle,
        is_transfer: true,
        date: new Date().toISOString(),
        paid_by: paidById,
        couple_id: user.couple_id
      })

      setSettleUpModalOpen(false)
      await fetchData() // Refresh data to show balance at 0
    } catch (error: any) {
      alert("Error al liquidar: " + error.message)
    } finally {
      setSettleLoading(false)
    }
  }

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!budgetForm.category_id || !budgetForm.amount) return

    try {
      const existing = budgets.find(b => b.category_id === budgetForm.category_id)
      if (existing) {
        await pb.collection('budgets').update(existing.id, {
          amount: Number(budgetForm.amount)
        })
      } else {
        await pb.collection('budgets').create({
          couple_id: user.couple_id,
          category_id: budgetForm.category_id,
          amount: Number(budgetForm.amount)
        })
      }
      setBudgetModalOpen(false)
      setBudgetForm({ category_id: '', amount: '' })
      await fetchData()
    } catch (error: any) {
      alert("Error al guardar presupuesto: " + error.message)
    }
  }

  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm('¿Seguro que quieres eliminar este control de presupuesto?')) return
    try {
      await pb.collection('budgets').delete(id)
      setBudgets(budgets.filter(b => b.id !== id))
    } catch (error: any) {
      alert("Error al eliminar presupuesto: " + error.message)
    }
  }

  if (loading) return <div className="text-zinc-500">Cargando resumen...</div>

  const userA = profiles[0] || { id: user.id, name: 'Tú', split: stats.mySplit || 50 }
  const userB = profiles[1] || { id: 'unknown', name: 'Pareja', split: stats.partnerSplit || 50 }
  const userABalance = stats.balance || 0

  if ((stats as any).error) {
    return <div className="text-red-500 font-bold p-4">Error fetching data: {(stats as any).error}</div>
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="grid grid-cols-3 gap-6">
        {/* WIDGET BALANCE & REPARTO */}
        <div className="col-span-1 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group hover:border-white/10 hover:bg-zinc-900/60 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-opacity group-hover:opacity-75 opacity-50"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary-950/40 text-primary-400 rounded-2xl shadow-inner border border-primary-500/20">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Balance de {userA.name}</p>
                  <p className={`text-3xl font-black tracking-tight ${userABalance >= 0 ? 'text-primary-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.3)]'}`}>
                    {userABalance >= 0 ? '+' : ''}{userABalance.toFixed(2)} €
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {userABalance > 0 ? `${userB.name} le debe a ${userA.name}` : userABalance < 0 ? `${userA.name} le debe a ${userB.name}` : 'Cuentas saldadas'}
                  </p>
                </div>
              </div>
            </div>
            
            {Math.abs(userABalance) > 0.01 && (
               <button 
                  onClick={() => setSettleUpModalOpen(true)}
                  className="mt-4 w-full bg-zinc-800/80 hover:bg-zinc-700/80 text-white font-bold py-3 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 relative z-10 border border-white/5 hover:shadow-lg"
               >
                  <CheckCircle2 size={18} className="text-primary-400" />
                  Saldar Deuda
               </button>
            )}
          </div>

          <div className="relative z-10 mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-950/40 text-purple-400 rounded-xl shadow-inner border border-purple-500/20">
                <PieChart size={18} />
              </div>
              <div className="w-full">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Reparto Global</p>
                  <p className="text-sm font-black text-white tracking-tight">{userA.split}% / {userB.split}%</p>
                </div>
                <div className="w-full bg-zinc-950/80 rounded-full h-1.5 mt-2 overflow-hidden flex border border-white/5">
                  <div className="bg-gradient-to-r from-primary-600 to-primary-400 h-full" style={{ width: `${userA.split}%` }}></div>
                  <div className="bg-gradient-to-r from-purple-600 to-purple-400 h-full" style={{ width: `${userB.split}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PRESUPUESTOS WIDGET */}
        <div className="col-span-2 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group hover:border-white/10 hover:bg-zinc-900/60 transition-all duration-300 flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-opacity group-hover:opacity-75 opacity-50"></div>
          <div className="relative z-10 flex items-center justify-between mb-4">
             <div className="flex items-center gap-2 text-zinc-300 font-bold">
               <Target size={18} className="text-amber-400" /> Control de Presupuestos
             </div>
             <button onClick={() => setBudgetModalOpen(true)} className="p-1.5 bg-zinc-800/80 border border-white/5 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-colors">
               <SettingsIcon size={16} />
             </button>
          </div>
          
          <div className="relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {budgets.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center mt-4">No hay límites establecidos.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {budgets.map(b => {
                  const cat = b.expand?.category_id
                  const spent = currentMonthTotals[b.category_id] || 0
                  const limit = Number(b.amount) || 0
                  const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 100
                  const colorClass = percent < 75 ? 'bg-primary-500' : percent < 95 ? 'bg-amber-500' : 'bg-red-500'
                  
                  const now = new Date()
                  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
                  const currentDay = now.getDate()
                  const projected = (spent / Math.max(currentDay, 1)) * daysInMonth
                  
                  let forecastMsg = ''
                  let forecastClass = ''
                  if (currentDay > 5 || spent >= limit) {
                    if (projected > limit && spent > 0) {
                      forecastMsg = `Peligro: Proyección total de ${projected.toFixed(0)}€ a final de mes`
                      forecastClass = 'text-amber-500 text-[10px] mt-1 font-bold flex items-center gap-1'
                    } else if (spent > 0) {
                      const saved = limit - projected
                      forecastMsg = `Vas genial: Proyección de ahorro de ${saved.toFixed(0)}€ a final de mes`
                      forecastClass = 'text-primary-500 text-[10px] mt-1 flex items-center gap-1'
                    }
                  }

                  return (
                    <div key={b.id} className="bg-zinc-950/40 p-4 rounded-2xl border border-white/5 hover:bg-zinc-900/60 hover:border-white/10 transition-all duration-300 group/item relative overflow-hidden">
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: cat?.color }}></span>
                          <span className="text-zinc-200 font-bold tracking-wide">{cat?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-0.5 bg-zinc-900/80 rounded-lg p-1 border border-white/5">
                             <button 
                               onClick={() => { setBudgetForm({ category_id: b.category_id, amount: (b.amount || 0).toString() }); setBudgetModalOpen(true); }}
                               className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                               title="Editar Presupuesto"
                             >
                               <Edit3 size={14} />
                             </button>
                             <button 
                               onClick={() => handleDeleteBudget(b.id)}
                               className="p-1.5 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                               title="Eliminar Presupuesto"
                             >
                               <Trash2 size={14} />
                             </button>
                          </div>
                          <div className="text-right ml-1">
                             <span className={`font-mono text-sm ${spent > limit ? 'text-red-400 font-black' : 'text-zinc-300 font-bold'}`}>{spent.toFixed(0)}€</span>
                             <span className="text-zinc-500 font-mono text-xs ml-1">/ {limit.toFixed(0)}€</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-zinc-950/80 rounded-full h-1.5 overflow-hidden flex relative z-10 border border-white/5">
                        <div className={`${colorClass} h-full transition-all duration-700 ease-out`} style={{ width: `${percent}%` }}></div>
                      </div>
                      {forecastMsg && (
                        <p className={`${forecastClass} relative z-10`}>
                           {projected > limit ? '⚠️' : '🎯'} {forecastMsg}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col h-[400px] hover:border-white/10 hover:bg-zinc-900/60 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-opacity group-hover:opacity-75 opacity-50"></div>
          <h3 className="text-white font-bold mb-4 relative z-10 tracking-wide">Evolución de Gastos ({userA.name} vs {userB.name})</h3>
          <div className="flex-1 w-full h-full min-h-0 relative z-10">
            {chartData.length > 0 ? <ExpenseAreaChart data={chartData} userA={userA.name} userB={userB.name} /> : <p className="text-zinc-500 text-sm">No hay suficientes datos</p>}
          </div>
        </div>
        <div className="col-span-1 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col h-[400px] hover:border-white/10 hover:bg-zinc-900/60 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-opacity group-hover:opacity-75 opacity-50"></div>
          <h3 className="text-white font-bold mb-4 relative z-10 tracking-wide">Gastos por Categoría</h3>
          <div className="flex-1 w-full h-full min-h-0 relative z-10">
            {donutData.length > 0 ? <CategoryDonutChart data={donutData} /> : <p className="text-zinc-500 text-sm">No hay suficientes datos</p>}
          </div>
        </div>
      </div>

      {/* MODAL SETTLE UP */}
      {settleUpModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-primary-400" /> Liquidar Deuda
            </h2>
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-6">
              <p className="text-zinc-300 leading-relaxed">
                {userABalance > 0 
                  ? `¿Confirmas que ${userB.name} te ha pagado ${Math.abs(userABalance).toFixed(2)}€ por Bizum/Efectivo para saldar las cuentas?`
                  : `¿Confirmas que tú le has pagado ${Math.abs(userABalance).toFixed(2)}€ a ${userB.name} por Bizum/Efectivo para saldar las cuentas?`
                }
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setSettleUpModalOpen(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                disabled={settleLoading}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSettleUp}
                disabled={settleLoading}
                className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {settleLoading ? 'Registrando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRESUPUESTOS */}
      {budgetModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-white mb-6">Configurar Presupuesto</h2>
            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría</label>
                <select 
                  value={budgetForm.category_id}
                  onChange={e => setBudgetForm({...budgetForm, category_id: e.target.value})}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="">Seleccionar categoría...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Límite Mensual (€)</label>
                <input 
                  type="number"
                  step="1"
                  min="1"
                  value={budgetForm.amount}
                  onChange={e => setBudgetForm({...budgetForm, amount: e.target.value})}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="Ej. 300"
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setBudgetModalOpen(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-xl font-bold transition-colors"
                >
                  Guardar Límite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
