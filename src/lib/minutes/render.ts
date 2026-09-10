import type { Meeting } from "#/lib/meetings/schema";

import type { MinuteTemplate } from "./schema";
import type { MinuteVersionRow } from "./types";

export type MDBMeeting = Meeting;

/** Linha de texto de ata pronta para prévia (JSON) e PDF. */
export type MinuteLine = { text: string; level: 1 | 2 | 3 };

export type RenderedMinute = {
	title: string;
	lines: MinuteLine[];
};

type ParticipantLike = { staffName: string; roleName: string };
type ClassLike = { className: string };
type RecordLike = {
	className: string | null;
	studentName: string;
	texto: string;
};
type ReportLike = { texto: string };

export type RenderInput = {
	meeting: MDBMeeting;
	template: MinuteTemplate | null;
	classes: ClassLike[];
	participants: ParticipantLike[];
	records: RecordLike[];
	generalReports: ReportLike[];
};

export function renderMinute(input: RenderInput): RenderedMinute {
	const t = input.template;
	const lines: MinuteLine[] = [];
	const push = (text: string, level: MinuteLine["level"] = 3) => {
		if (text.trim() !== "") {
			lines.push({ text, level });
		}
	};

	push(t?.headerText ?? "", 1);
	push(`Ata — ${input.meeting.title}`, 1);

	if (!t || t.showMeeting) {
		const held = input.meeting.heldAt
			? new Date(input.meeting.heldAt).toLocaleDateString("pt-BR")
			: "data não informada";
		push(`Data da reunião: ${held}`, 2);
	}

	if ((!t || t.showClasses) && input.classes.length > 0) {
		push("Turmas", 2);
		for (const c of input.classes) {
			push(c.className);
		}
	}

	if ((!t || t.showParticipants) && input.participants.length > 0) {
		push("Participantes", 2);
		for (const p of input.participants) {
			push(`${p.staffName} — ${p.roleName}`);
		}
	}

	// Borda 5 (spec 0009): agrupar registros por turma e por estudante.
	if ((!t || t.showRecords) && input.records.length > 0) {
		push("Registros por estudante", 2);
		const byClass = new Map<string, RecordLike[]>();
		for (const r of input.records) {
			const key = r.className ?? "Sem turma";
			const bucket = byClass.get(key);
			if (bucket) {
				bucket.push(r);
			} else {
				byClass.set(key, [r]);
			}
		}
		for (const [className, records] of byClass) {
			push(className, 3);
			for (const r of records) {
				push(`${r.studentName}: ${r.texto}`);
			}
		}
	}

	// Borda 1 (spec 0009): sem registros, ata mínima com cabeçalho e relatos.
	if ((!t || t.showGeneralReports) && input.generalReports.length > 0) {
		push("Relatos gerais", 2);
		for (const g of input.generalReports) {
			push(g.texto);
		}
	}

	if (!t || t.showSignatures) {
		push("Assinaturas", 2);
		for (const p of input.participants) {
			push("_____________________________");
			push(p.staffName);
		}
	}

	push(t?.footerText ?? "", 1);

	return { title: `Ata — ${input.meeting.title}`, lines };
}

export function renderedToPlainText(rendered: RenderedMinute): string {
	return rendered.lines
		.map((line) => (line.level === 1 ? line.text.toUpperCase() : line.text))
		.join("\n");
}

export function serializeVersionRow(row: MinuteVersionRow) {
	return {
		id: row.id,
		minuteId: row.minuteId,
		version: row.version,
		isCurrent: row.isCurrent,
		notes: row.notes,
		createdAt: row.createdAt.toISOString(),
		hasPdf: Buffer.isBuffer(row.pdf) ? row.pdf.length > 0 : row.pdf != null,
	};
}
