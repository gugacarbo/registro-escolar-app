// Mensagens de erro em PT-BR (spec 0005).
// Decisão: as classes de erro vivem aqui (e não no repository.ts)
// para servirem de única fonte às rotas de API e aos casos de uso
// dos próximos passos da spec.

export const ERR_UNAUTHENTICATED = "Não autenticado";
export const ERR_MEETING_NOT_FOUND = "Reunião não encontrada";
export const ERR_INVALID_TRANSITION = "Transição inválida para o estado atual";
export const ERR_MEETING_CLOSED =
	"Reunião encerrada: reabra para editar dados, turmas e registros";
export const ERR_MEETING_CLASS_IN_USE =
	"Turma com acompanhamento registrado: não é possível desvincular";
export const ERR_MEETING_CLASS_ALREADY_LINKED = "Turma já vinculada à reunião";
export const ERR_LINKED_ENTITY_NOT_FOUND =
	"Turma/Servidor/Cargo não encontrado";

export class MeetingNotFoundError extends Error {}
export class MeetingNotEditableError extends Error {}
export class MeetingClassInUseError extends Error {}
export class MeetingClassAlreadyLinkedError extends Error {}
export class InvalidTransitionError extends Error {}
