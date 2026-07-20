export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center p-8 lg:p-16">
      <div className="max-w-5xl w-full space-y-10">
        
        {/* Cabecera del Dashboard */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-700 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-blue-400">
              Elite Barber Shop
            </h1>
            <p className="text-slate-400 mt-1">
              BarberFlow OS • Terminal Operativa
            </p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 px-4 py-2 rounded-md text-blue-400 text-sm font-semibold tracking-widest uppercase">
            Sistema En Línea
          </div>
        </header>
        
        {/* Cuadrícula de Módulos */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Módulo de Citas */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl flex flex-col justify-between h-48">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Citas de Hoy</h2>
              <p className="text-slate-400 text-sm">Próximos clientes programados en el calendario.</p>
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors">
              Gestionar Calendario
            </button>
          </div>

          {/* Módulo de Facturación */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl flex flex-col justify-between h-48">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Caja y Finanzas</h2>
              <p className="text-slate-400 text-sm">Control de pagos y facturas pendientes.</p>
            </div>
            <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg transition-colors">
              Módulo de Cobros
            </button>
          </div>

          {/* Módulo de Equipo */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl flex flex-col justify-between h-48">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Profesionales</h2>
              <p className="text-slate-400 text-sm">Administración del equipo y comisiones.</p>
            </div>
            <button className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded-lg transition-colors">
              Ver Personal
            </button>
          </div>

        </section>
      </div>
    </main>
  );
}
