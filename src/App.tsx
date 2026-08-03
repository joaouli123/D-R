import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useApp } from '@/store/AppStore'
import { PageLoader } from '@/components/ui'

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

export default function App() {
  const { usuario, carregando } = useApp()

  if (carregando) return <PageLoader />
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
