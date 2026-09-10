import { z } from "zod";

// Query params compartilhados por /api/students/:id/history e
// /api/classes/:id/history (specs 0011/0012). Todos opcionais.
export const historyQuerySchema = z
	.object({
		turmaId: z.string().min(1).optional(),
		periodo: z.string().min(1).optional(),
		reuniaoId: z.string().min(1).optional(),
		categoriaId: z.string().min(1).optional(),
		componenteId: z.string().min(1).optional(),
		estudanteId: z.string().min(1).optional(),
		q: z.string().trim().min(1).optional(),
	})
	.strict();

export type HistoryQuery = z.infer<typeof historyQuerySchema>;

export function parseHistoryQuery(url: URL): HistoryQuery {
	const raw: Record<string, string> = {};
	for (const key of [...url.searchParams.keys()]) {
		if (
			![
				"turmaId",
				"periodo",
				"reuniaoId",
				"categoriaId",
				"componenteId",
				"estudanteId",
				"q",
			].includes(key)
		) {
			throw new Error("Parâmetro desconhecido");
		}
		const value = url.searchParams.get(key);
		if (value !== null && value.trim() !== "") {
			raw[key] = value;
		}
	}
	return historyQuerySchema.parse(raw);
}
