/**
 * Resolve a identidade usada na capa, no fecho e na assinatura do documento.
 *
 * `criadoPorId` continua sendo a trilha de auditoria. Em documentos vinculados
 * a uma perícia, a identidade técnica pertence ao responsável atual dela.
 */
export function idDoSignatario(
  documento: { criadoPorId: string },
  pericia: { responsavelId: string } | null,
): string {
  return pericia?.responsavelId ?? documento.criadoPorId
}
