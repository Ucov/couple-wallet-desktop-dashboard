import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Wallet, Database, Settings, LogOut, ShoppingCart, CalendarDays, Repeat } from 'lucide-react'
import { pb } from '@/lib/pocketbase'

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const handleLogout = () => {
    pb.authStore.clear()
    navigate('/')
  }

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Resumen Financiero' },
    { to: '/expenses', icon: Wallet, label: 'Base de Gastos' },
    { to: '/subscriptions', icon: Repeat, label: 'Suscripciones' },
    { to: '/shopping', icon: ShoppingCart, label: 'Lista de la Compra' },
    { to: '/chores', icon: CalendarDays, label: 'Calendario y Tareas' },
    { to: '/backup', icon: Database, label: 'Respaldos y Exportación' },
    { to: '/settings', icon: Settings, label: 'Configuración Pareja' },
  ]

  return (
    <aside className="w-64 h-screen bg-zinc-950/40 backdrop-blur-2xl border-r border-white/5 flex flex-col fixed left-0 top-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      <div className="p-6 border-b border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl -ml-16 -mt-16 pointer-events-none"></div>
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2 relative z-10">
          <Wallet className="text-primary-500 drop-shadow-[0_0_8px_rgba(var(--color-primary-500),0.5)]" />
          CoupleWallet
        </h1>
        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold relative z-10">Centro de Mando</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = location.pathname === link.to || (link.to === '/expenses' && location.pathname === '/datagrid') // Compatibility for old datagrid route
          
          return (
            <Link 
              key={link.to} 
              to={link.to === '/expenses' ? '/datagrid' : link.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden ${
                isActive 
                  ? 'bg-primary-950/30 text-white font-medium border border-primary-500/20 shadow-[0_0_15px_rgba(var(--color-primary-500),0.1)]' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
              }`}
            >
              {isActive && <div className="absolute left-0 top-0 w-1 h-full bg-primary-500 rounded-r-full shadow-[0_0_10px_rgba(var(--color-primary-500),1)]"></div>}
              <Icon size={20} className={`relative z-10 transition-colors ${isActive ? 'text-primary-400 drop-shadow-[0_0_5px_rgba(var(--color-primary-400),0.5)]' : 'group-hover:text-zinc-300'}`} />
              <span className="relative z-10">{link.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/5 mt-auto">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-zinc-400 hover:text-red-400 hover:bg-red-950/30 hover:border-red-500/20 rounded-xl transition-all border border-transparent"
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
