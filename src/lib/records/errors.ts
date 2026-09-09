// Mensagens de erro em PT-BR (spec 0007).
// Classes de erro ficam aqui para servirem de única fonte às rotas de API
// (mesmo padrão de src/lib/meetings/errors.ts).

export const ERR_STUDENT_NOT_FOUND = "Aluno não encontrado";
export const ERR_RECORD_TEXT_REQUIRED = "Texto é obrigatório";
export const ERR_RECORD_NOT_FOUND = "Registro não encontrado";
export const ERR_RECORD_NOT_LINKED_TO_MEETING =
	"Registro não está vinculado a esta reunião";
export const ERR_MEETING_NOT_IN_PROGRESS =
	"Reunião finalizada: reabra para criar/editar registros vinculados";
export const ERR_STUDENT_NOT_IN_MEETING =
	"Aluno não pertence às turmas desta reunião";
export const ERR_INVALID_ORIGIN =
	"A origem deve ser um participante desta reunião (CA-005)";

export class RecordValidationError extends Error {}
export class RecordNotFoundError extends Error {}
export class RecordNotLinkedToMeetingError extends Error {}
export class MeetingNotInProgressError extends Error {}
export class StudentNotInMeetingError extends Error {}
export class InvalidOriginError extends Error {}

export const ERR_MEETING_NOT_FOUND = "Reunião não encontrada";
