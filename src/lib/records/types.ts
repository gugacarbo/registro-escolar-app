export type StudentRecordRowJson = {
	id: string;
	studentId: string;
	meetingId: string | null;
	classId: string | null;
	componentId: string | null;
	originId: string | null;
	texto: string;
	categoriaId: string | null;
	includeInMinutes: boolean;
	createdAt: string;
	updatedAt: string;
};

export type MeetingStudentRecord = {
	id: string;
	studentId: string;
	meetingId: string | null;
	classId: string | null;
	componentId: string | null;
	originId: string | null;
	texto: string;
	categoriaId: string | null;
	/** Registro vinculado à reunião ou registro independente aplicável. */
	scope: "vinculado" | "contexto";
	/**
	 * Inclusão na ata desta reunião. Para registros vinculados é o próprio
	 * includeInMinutes; para independentes é a decisão per-reunião
	 * (record_meeting_inclusions), padrão incluir.
	 */
	includeInMinutes: boolean;
	createdAt: string;
	updatedAt: string;
};

export type RecordInclusionRowJson = {
	id: string;
	studentRecordId: string;
	meetingId: string;
	include: boolean;
	createdAt: string;
	updatedAt: string;
};
