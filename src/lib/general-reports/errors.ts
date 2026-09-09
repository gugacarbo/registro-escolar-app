// Mensagens de erro em PT-BR (spec 0008).
// Classes de erro ficam aqui para servirem de única fonte às rotas de API
// (mesmo padrão de src/lib/meetings/errors.ts e src/lib/records/errors.ts).

export const ERR_REPORT_NOT_FOUND = "Relato geral não encontrado";
export const ERR_REPORT_TEXT_REQUIRED = "Texto é obrigatório";
export const ERR_REPORT_NOT_IN_PROGRESS =
	"Reunião finalizada: reabra para criar/editar relatos gerais";
export const ERR_INVALID_ORIGIN =
	"A origem deve ser um participante desta reunião (CA-005)";

export class ReportValidationError extends Error {}
export class ReportNotFoundError extends Error {}
export class MeetingNotInProgressError extends Error {}
export class InvalidOriginError extends Error {}
