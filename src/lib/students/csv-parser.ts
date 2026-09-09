import { parse } from "papaparse";

export type ParsedImportRow = {
	index: number;
	name: string;
	document?: string;
	registrationNumber?: string;
	email?: string;
	phone?: string;
	birthDate?: string;
	notes?: string;
	errors: string[];
};

const REQUIRED_COLUMNS = ["nome"];

const COLUMN_ALIASES: Record<
	string,
	keyof Omit<ParsedImportRow, "index" | "errors">
> = {
	nome: "name",
	documento: "document",
	matricula: "registrationNumber",
	email: "email",
	telefone: "phone",
	data_nascimento: "birthDate",
	observacoes: "notes",
};

function normalizeColumnName(input: string) {
	return input
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/\s+/g, "_")
		.replace(/[^a-z0-9_]/g, "");
}

function isValidExtension(filename: string) {
	const lower = filename.toLowerCase();
	return lower.endsWith(".csv");
}

export async function parseStudentImportFile(file: File): Promise<{
	rows: ParsedImportRow[];
	errors: string[];
}> {
	const errors: string[] = [];

	if (!isValidExtension(file.name)) {
		errors.push("Formato de arquivo inválido. Envie um CSV.");
		return { rows: [], errors };
	}

	const text = await file.text();
	const lines = text.split(/\r?\n/);
	const headerLine = lines[0] ?? "";
	const dataLines = lines.slice(1);

	const parsed = parse<Record<string, string>>(
		[headerLine, ...dataLines].join("\n"),
		{
			header: true,
			skipEmptyLines: false,
			transformHeader: normalizeColumnName,
			delimiter: ",",
		},
	);

	if (parsed.errors.length > 0) {
		errors.push(...parsed.errors.slice(0, 5).map((e) => e.message));
	}

	const headers = parsed.meta.fields ?? [];
	const missingRequired = REQUIRED_COLUMNS.filter(
		(col) => !headers.includes(col),
	);
	if (missingRequired.length > 0) {
		errors.push(`Colunas obrigatórias ausentes: ${missingRequired.join(", ")}`);
		return { rows: [], errors };
	}

	const rows: ParsedImportRow[] = parsed.data.map((raw, idx) => {
		const row: ParsedImportRow = {
			index: idx + 2,
			name: raw.nome?.trim() ?? "",
			errors: [],
		};

		for (const [column, field] of Object.entries(COLUMN_ALIASES)) {
			if (column === "nome") continue;
			const value = raw[column]?.trim();
			if (value) {
				(row as unknown as Record<string, string | undefined>)[field] = value;
			}
		}

		if (!row.name) {
			row.errors.push("Nome é obrigatório");
		}

		return row;
	});

	return { rows, errors };
}
