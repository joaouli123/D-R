import { Navigate, Route, Routes } from 'react-router-dom'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useApp } from '@/store/AppStore'
import { Button, PageLoader } from '@/components/ui'
import { Logo } from '@/components/Logo'

import Login from '@/pages/Login'
import Inicio from '@/pages/Inicio'
import Pericias from '@/pages/Pericias'
import PericiaEditor from '@/pages/PericiaEditor'
import Documentos from '@/pages/Documentos'
import Clientes from '@/pages/Clientes'
import Processos from '@/pages/Processos'
import Calendario from '@/pages/Calendario'
import Biblioteca from '@/pages/Biblioteca'
import Calculadoras from '@/pages/Calculadoras'
import Modelos from '@/pages/Modelos'
import Relatorios from '@/pages/Relatorios'
import Configuracoes from '@/pages/Configuracoes'
import Ajuda from '@/pages/Ajuda'
import Quesitos from '@/pages/Quesitos'
import Manifestacao from '@/pages/Manifestacao'
import Esclarecimento from '@/pages/Esclarecimento'

/**
 * A API não respondeu. Sem isto a tela ficaria travada em
 * "carregando" para sempre quando o backend estivesse fora.
 */
function FalhaAoCarregar({ erro, tentarDeNovo }: { erro: string; tentarDeNovo: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 text-center">
      <Logo size="lg" />
      <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle size={22} />
      </div>
      <h1 className="mt-4 text-xl font-bold text-ink-900">Não foi possível carregar os dados</h1>
      <p className="mt-2 max-w-md text-sm text-ink-500">{erro}</p>
      <Button className="mt-6" icon={<RotateCcw size={16} />} onClick={tentarDeNovo}>
        Tentar novamente
      </Button>
    </div>
  )
}

export default function App() {
  const { usuario, carregando, erroCarregamento, recarregar } = useApp()

  if (carregando) return <PageLoader />
  if (erroCarregamento) return <FalhaAoCarregar erro={erroCarregamento} tentarDeNovo={recarregar} />
  if (!usuario) return <Login />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Inicio />} />

        {/* Módulos C/D/E — Perícias */}
        <Route path="/pericias" element={<Pericias />} />
        <Route path="/pericias/nova" element={<PericiaEditor />} />
        <Route path="/pericias/:id" element={<PericiaEditor />} />

        {/* Módulos G/H/I/J — Documentos */}
        <Route path="/documentos" element={<Documentos />} />

        {/* Módulo K — Quesitos (item 17) */}
        <Route path="/quesitos" element={<Quesitos />} />
        <Route path="/quesitos/:periciaId" element={<Quesitos />} />

        {/* Módulo L — Manifestação / Impugnação (item 18) */}
        <Route path="/manifestacao" element={<Manifestacao />} />
        <Route path="/manifestacao/:posicionamento" element={<Manifestacao />} />

        {/* Esclarecimentos Técnicos */}
        <Route path="/esclarecimentos" element={<Esclarecimento />} />

        {/* Módulo B e apoio */}
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/processos" element={<Processos />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/biblioteca" element={<Biblioteca />} />
        <Route path="/calculadoras" element={<Calculadoras />} />
        <Route path="/modelos" element={<Modelos />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/ajuda" element={<Ajuda />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
