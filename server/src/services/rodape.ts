// Texto do rodapé do PDF e do DOCX. Sem dependências, para o DOCX não
// carregar o Puppeteer nem a configuração do ambiente.

/** Rodapé da marca: vale para tudo, menos o laudo (ver textoDoRodape). */
export const RODAPE_DA_MARCA =
  '© DR Perícias Trabalhista — Propriedade intelectual exclusiva e protegida.'

/**
 * O laudo sai só com o nome do profissional no rodapé, sem a plataforma;
 * parecer, quesitos e os demais continuam com a marca.
 */
export function textoDoRodape(tipo: string, perito: { nome: string } | null): string {
  return tipo === 'laudo' ? (perito?.nome.trim() ?? '') : RODAPE_DA_MARCA
}
