// Mensagens de erro em PT-BR (specs 0009/0010).
// Mesmo padrão de src/lib/general-reports/errors.ts.

export const ERR_MEETING_NOT_FOUND = "Reunião não encontrada";
export const ERR_TEMPLATE_NOT_FOUND = "Modelo de ata não encontrado";
export const ERR_TEMPLATE_NAME_REQUIRED = "Nome do template é obrigatório";
export const ERR_MEETING_DRAFT =
	"Reunião em rascunho: prévia permitida, versão oficial exige reunião iniciada";
export const ERR_MINUTE_NOT_FOUND = "Nenhuma ata gerada para esta reunião";
export const ERR_VERSION_NOT_FOUND = "Versão da ata não encontrada";
export const ERR_NO_CURRENT_VERSION =
	"Não existe versão atual da ata para aprovar";
export const ERR_MINUTE_ALREADY_APPROVED = "Ata já aprovada";
export const ERR_PDF_NOT_AVAILABLE = "PDF não disponível para esta versão";
export const ERR_MINUTE_NOT_EDITABLE =
	"Reunião finalizada: reabra para editar a ata";

export class MeetingNotFoundError extends Error {}
export class MinuteTemplateNotFoundError extends Error {}
export class MeetingDraftError extends Error {}
export class MinuteNotFoundError extends Error {}
export class MinuteVersionNotFoundError extends Error {}
export class NoCurrentVersionError extends Error {}
export class MinuteAlreadyApprovedError extends Error {}
export class PdfNotAvailableError extends Error {}
export class MinuteNotEditableError extends Error {}
