import type {
  DocumentoGerado,
  Empresa,
  Foto,
  Participante,
  Pericia,
  Quesito,
  Reclamada,
  TextoBiblioteca,
  Usuario,
} from '@prisma/client'
import { env } from './env.js'

// ============================================================
// Tradução Prisma → formato consumido pelo frontend
// (src/types/index.ts). Regras:
//   · datas do sistema saem como "YYYY-MM-DD", como o mock fazia;
//   · senhaHash nunca sai;
//   · Foto.arquivo vira URL pública.
// ============================================================

const dia = (d: Date): string => d.toISOString().slice(0, 10)

export const urlDaFoto = (arquivo: string): string =>
  `${env.API_PUBLIC_URL.replace(/\/$/, '')}/uploads/${arquivo}`

export function usuarioParaApi(u: Usuario) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil,
    registroProfissional: u.registroProfissional ?? undefined,
    titulo: u.titulo ?? undefined,
    telefone: u.telefone ?? undefined,
    ativo: u.ativo,
    ultimoAcesso: u.ultimoAcesso?.toISOString(),
  }
}

export function empresaParaApi(e: Empresa) {
  return {
    id: e.id,
    razaoSocial: e.razaoSocial,
    nomeFantasia: e.nomeFantasia ?? undefined,
    cnpj: e.cnpj,
    cnae: e.cnae ?? undefined,
    grauRisco: e.grauRisco ?? undefined,
    endereco: e.endereco,
    numero: e.numero ?? undefined,
    complemento: e.complemento ?? undefined,
    bairro: e.bairro ?? undefined,
    cidade: e.cidade,
    uf: e.uf,
    cep: e.cep ?? undefined,
    contatoNome: e.contatoNome ?? undefined,
    contatoEmail: e.contatoEmail ?? undefined,
    contatoTelefone: e.contatoTelefone ?? undefined,
    ramoAtividade: e.ramoAtividade ?? undefined,
    criadoEm: dia(e.criadoEm),
  }
}

export type PericiaCompleta = Pericia & {
  reclamadas: Reclamada[]
  participantes: Participante[]
  fotos: Foto[]
}

export function periciaParaApi(p: PericiaCompleta) {
  return {
    id: p.id,
    numeroProcesso: p.numeroProcesso,
    vara: p.vara,
    comarca: p.comarca,
    reclamante: p.reclamante,
    cpfReclamante: p.cpfReclamante ?? '',
    funcaoReclamante: p.funcaoReclamante ?? '',
    dataAjuizamento: p.dataAjuizamento ?? '',
    admissao: p.admissao ?? '',
    demissao: p.demissao ?? '',
    dataVistoria: p.dataVistoria ?? '',
    horaVistoria: p.horaVistoria ?? '',
    horaFimVistoria: p.horaFimVistoria ?? '',
    cepVistoria: p.cepVistoria ?? '',
    localVistoria: p.localVistoria ?? '',
    numeroVistoria: p.numeroVistoria ?? '',
    setorVistoriado: p.setorVistoriado ?? '',
    modalidade: p.modalidade,
    status: p.status,
    responsavelId: p.responsavelId,
    criadoEm: dia(p.criadoEm),
    atualizadoEm: dia(p.atualizadoEm),
    reclamadas: p.reclamadas.map((r) => ({
      id: r.id,
      empresaId: r.empresaId,
      principal: r.principal,
    })),
    participantes: p.participantes.map((pt) => ({
      id: pt.id,
      nome: pt.nome,
      empresaId: pt.empresaId ?? undefined,
      papel: pt.papel,
      registro: pt.registro ?? undefined,
      contato: pt.contato ?? undefined,
    })),
    fotos: [...p.fotos]
      .sort((a, b) => a.ordem - b.ordem)
      .map((f) => ({
        id: f.id,
        secao: f.secao,
        url: urlDaFoto(f.arquivo),
        legenda: f.legenda,
        ordem: f.ordem,
      })),
    tecnico: p.tecnico,
  }
}

export function textoParaApi(t: TextoBiblioteca) {
  return {
    id: t.id,
    titulo: t.titulo,
    referencia: t.referencia ?? undefined,
    secao: t.secao,
    tiposDocumento: t.tiposDocumento,
    tags: t.tags,
    conteudo: t.conteudo,
    favorito: t.favorito,
    usos: t.usos,
    criadoEm: dia(t.criadoEm),
  }
}

export function quesitoParaApi(q: Quesito) {
  return {
    id: q.id,
    codigo: q.codigo,
    tema: q.tema,
    origem: q.origem,
    pergunta: q.pergunta,
    respostaPadrao: q.respostaPadrao ?? '',
    favorito: q.favorito,
    usos: q.usos,
    personalizado: q.personalizado,
  }
}

export function documentoParaApi(d: DocumentoGerado) {
  return {
    id: d.id,
    tipo: d.tipo,
    titulo: d.titulo,
    periciaId: d.periciaId ?? '',
    numeroProcesso: d.numeroProcesso,
    reclamante: d.reclamante,
    empresaPrincipal: d.empresaPrincipal,
    status: d.status,
    anexoExternoNome: d.anexoExternoNome ?? undefined,
    enviadoPara: d.enviadoPara ?? undefined,
    conteudo: d.conteudo ?? undefined,
    criadoEm: dia(d.criadoEm),
    atualizadoEm: dia(d.atualizadoEm),
  }
}
