export type HistoryEventType =
	| "matricula"
	| "encerramento_matricula"
	| "reuniao"
	| "registro"
	| "relato_geral"
	| "status_reuniao";

export type HistoryEvent = {
	id: string;
	tipo: HistoryEventType;
	/** ISO timestamp do evento (ordenação cronológica crescente). */
	data: string;
	studentId: string | null;
	studentName: string | null;
	turmaId: string | null;
	turmaNome: string | null;
	reuniaoId: string | null;
	reuniaoTitulo: string | null;
	reuniaoStatus: string | null;
	texto: string | null;
	categoriaId: string | null;
	componenteId: string | null;
	includeInMinutes: boolean | null;
	/** Registro interno (includeInMinutes=false): entra no histórico, sai da ata. */
	interno: boolean;
	metadata: Record<string, string | null>;
};

export type StudentHistoryResult = {
	estudante: {
		id: string;
		name: string;
		document: string | null;
		registrationNumber: string | null;
	};
	eventos: HistoryEvent[];
};

export type ClassHistoryStudent = {
	studentId: string;
	name: string;
	status: string;
	startDate: string;
	endDate: string | null;
};

export type ClassHistoryMeeting = {
	id: string;
	title: string;
	status: string;
	heldAt: string | null;
};

export type ClassHistoryResult = {
	turma: {
		id: string;
		name: string;
		academicPeriod: string;
		course: string | null;
		grade: string | null;
		shift: string | null;
	};
	estudantes: ClassHistoryStudent[];
	reunioes: ClassHistoryMeeting[];
	eventos: HistoryEvent[];
};
