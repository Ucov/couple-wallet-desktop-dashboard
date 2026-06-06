import { Bell } from 'lucide-react'

export default function Header() {
  return (
    <header className="h-20 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-8 sticky top-0 z-10 w-full">
      <div>
        <h2 className="text-xl font-bold text-white">Hola, Usuario</h2>
        <p className="text-sm text-zinc-400">Aquí tienes el resumen financiero de tu hogar.</p>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-emerald-400 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full"></span>
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-purple-500 border-2 border-zinc-950 shadow-md"></div>
      </div>
    </header>
  )
}
