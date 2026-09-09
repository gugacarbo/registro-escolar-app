// Mensagens de erro em PT-BR (spec 0005).
// Decisão: as classes de erro vivem aqui (e não no repository.ts)
// para servirem de única fonte às rotas de API e aos casos de uso
// dos próximos passos da spec.

export const ERR_UNAUTHENTICATED = "Não autenticado";
export const ERR_MEETING_NOT_FOUND = "Reunião não encontrada";
export const ERR_MEETING_WITHOUT_CLASSES =
	"Reunião sem turmas: selecione ao menos uma turma antes de iniciar";
export const ERR_INVALID_TRANSITION = "Transição inválida para o estado atual";
export const ERR_MEETING_FINISHED =
	"Reunião finalizada: reabra para editar registros vinculados";
export const ERR_LINKED_ENTITY_NOT_FOUND =
	"Turma/Servidor/Papel não encontrado";

export class MeetingNotFoundError extends Error {}
export class MeetingNotEditableError extends Error {}
export class MeetingWithoutClassesError extends Error {}
export class InvalidTransitionError extends Error {}
