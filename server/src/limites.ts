// ============================================================
// Limites de tamanho dos arquivos que entram no sistema.
//
// Mora num módulo próprio, e não em services/armazenamento.ts, porque
// erros.ts precisa do mesmo número para dizer ao perito qual é o teto — e
// armazenamento.ts já importa ErroHttp de erros.ts. Um importando o outro
// fecharia o ciclo.
//
// Gêmeo no front: src/lib/limitesUpload.ts (o front não pode importar de
// server/src). A paridade dos dois é travada em limites.test.ts.
// ============================================================

/**
 * Teto de QUALQUER imagem que entre no sistema — foto da vistoria ou logo
 * do perito.
 *
 * É número fixo, e não variável de ambiente, de propósito: o navegador
 * também confere o tamanho ANTES de enviar, para o perito ver o aviso na
 * hora em vez de esperar a subida inteira e receber um 413 no fim — e o
 * navegador não lê o .env da API. Se fosse configurável, as duas pontas
 * divergiriam no primeiro deploy.
 *
 * O anexo em PDF não entra aqui: não é imagem, e continua no teto do
 * ambiente (UPLOAD_MAX_MB × 4) — processo digitalizado passa longe de 3 MB.
 */
export const LIMITE_IMAGEM_MB = 3

/** O mesmo teto em bytes, que é como o multer o recebe. */
export const LIMITE_IMAGEM_BYTES = LIMITE_IMAGEM_MB * 1024 * 1024

/**
 * O número que se passa ao multer — o primeiro tamanho RECUSADO, não o
 * último aceito.
 *
 * Quem conta os bytes é o busboy, e ele dispara `limit` quando o acumulado
 * FICA IGUAL ao teto (`if (fileSize === fileSizeLimit)`), não quando o
 * ultrapassa. Passando `LIMITE_IMAGEM_BYTES` cru, o arquivo de exatamente
 * 3 MB passava no navegador — que recusa com `>` — e voltava 413 do
 * servidor: aceito na tela, rejeitado na subida. O `+ 1` alinha as duas
 * pontas em "3 MB inclusive", que é o que a mensagem de erro promete.
 */
export const LIMITE_MULTER_BYTES = LIMITE_IMAGEM_BYTES + 1

/**
 * Quantas fotos o perito manda de uma vez.
 *
 * Estava escrito à mão no multer, na rota e na mensagem de erro. A tela
 * anuncia o número, então ele precisa ser um só — e o navegador precisa
 * conferi-lo antes de enviar, ou o perito monta um lote de cinquenta e
 * descobre o limite depois da subida inteira.
 */
export const LIMITE_FOTOS_POR_ENVIO = 30
