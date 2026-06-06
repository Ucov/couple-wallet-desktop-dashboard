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
    <aside className="w-64 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Wallet className="text-emerald-500" />
          CoupleWallet
        </h1>
        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold">Centro de Mando</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = location.pathname === link.to || (link.to === '/expenses' && location.pathname === '/datagrid') // Compatibility for old datagrid route
          
          return (
            <Link 
              key={link.to} 
              to={link.to === '/expenses' ? '/datagrid' : link.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-zinc-800 text-white font-medium shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-emerald-400' : ''} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
