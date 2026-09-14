import { parse } from "papaparse";
import * as XLSX from "xlsx";

export type ParsedImportRow = {
	index: number;
	name: string;
	reference?: string;
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
	referencia: "reference",
	reference: "reference",
	documento: "document",
	matricula: "registrationNumber",
	email: "email",
	telefone: "phone",
	data_nascimento: "birthDate",
	observacoes: "notes",
};

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".ods"];

export function isAcceptedImportExtension(filename: string) {
	const lower = filename.toLowerCase();
	return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function acceptedImportExtensionsLabel() {
	return "CSV ou planilha (.csv, .xlsx, .xls, .ods)";
}

function normalizeColumnName(input: string) {
	return input
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/\s+/g, "_")
		.replace(/[^a-z0-9_]/g, "");
}

function detectDelimiter(headerLine: string) {
	const candidates = [";", ",", "\t", "|"];
	let best = ",";
	let bestCount = 0;
	for (const candidate of candidates) {
		const count = headerLine.split(candidate).length - 1;
		if (count > bestCount) {
			best = candidate;
			bestCount = count;
		}
	}
	return best;
}

function mapRecordToRow(
	raw: Record<string, string | number | null | undefined>,
	index: number,
): ParsedImportRow {
	const get = (column: string) => {
		const value = raw[column];
		if (value === null || value === undefined) return undefined;
		const text = String(value).trim();
		return text || undefined;
	};

	const row: ParsedImportRow = {
		index,
		name: get("nome") ?? "",
		errors: [],
	};

	for (const [column, field] of Object.entries(COLUMN_ALIASES)) {
		if (column === "nome") continue;
		const value = get(column);
		if (value) {
			(row as unknown as Record<string, string | undefined>)[field] = value;
		}
	}

	if (!row.name) {
		row.errors.push("Nome é obrigatório");
	}

	return row;
}

function buildRowsFromRecords(
	records: Array<Record<string, string | number | null | undefined>>,
): { rows: ParsedImportRow[]; errors: string[] } {
	const rows = records.map((raw, idx) => mapRecordToRow(raw, idx + 2));
	const invalidCount = rows.filter((row) => row.errors.length > 0).length;
	const errors =
		invalidCount > 0
			? [`${invalidCount} linha(s) com dados ausentes ou inválidos`]
			: [];
	return { rows, errors };
}

function parseCsv(text: string): {
	rows: ParsedImportRow[];
	errors: string[];
	fatal: boolean;
} {
	const lines = text.split(/\r?\n/);
	const headerLine = lines.find((line) => line.trim().length > 0) ?? "";
	const parsed = parse<Record<string, string>>(text, {
		header: true,
		skipEmptyLines: false,
		transformHeader: normalizeColumnName,
		delimiter: detectDelimiter(headerLine),
	});

	const headers = parsed.meta.fields ?? [];
	const missingRequired = REQUIRED_COLUMNS.filter(
		(col) => !headers.includes(col),
	);
	if (missingRequired.length > 0) {
		return {
			rows: [],
			errors: [`Colunas obrigatórias ausentes: ${missingRequired.join(", ")}`],
			fatal: true,
		};
	}

	const { rows } = buildRowsFromRecords(parsed.data);
	const rowErrors = parsed.errors
		.filter((e): e is typeof e & { row: number } => typeof e.row === "number")
		.map((e) => `Linha ${e.row + 1}: ${e.message}`);
	return { rows, errors: rowErrors, fatal: false };
}

function excelSerialToIso(serial: number) {
	const millis = Math.round((serial - 25569) * 86400 * 1000);
	const date = new Date(millis);
	return Number.isNaN(date.getTime())
		? String(serial)
		: date.toISOString().slice(0, 10);
}

function parseSpreadsheet(buffer: ArrayBuffer): {
	rows: ParsedImportRow[];
	errors: string[];
	fatal: boolean;
} {
	let workbook: XLSX.WorkBook;
	try {
		workbook = XLSX.read(buffer, { type: "array", cellDates: true });
	} catch {
		return {
			rows: [],
			errors: ["Não foi possível ler a planilha. Verifique o arquivo."],
			fatal: true,
		};
	}
	const sheetName = workbook.SheetNames[0];
	if (!sheetName) {
		return {
			rows: [],
			errors: ["Planilha sem abas. Adicione os dados na primeira aba."],
			fatal: true,
		};
	}
	const sheet = workbook.Sheets[sheetName];
	const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
		defval: "",
		raw: true,
	});
	if (rawRows.length === 0) {
		return {
			rows: [],
			errors: ["Colunas obrigatórias ausentes: nome"],
			fatal: true,
		};
	}

	const records = rawRows.map((raw) => {
		const normalized: Record<string, string | number | null | undefined> = {};
		for (const [key, value] of Object.entries(raw)) {
			const column = normalizeColumnName(key);
			if (value instanceof Date) {
				normalized[column] = Number.isNaN(value.getTime())
					? ""
					: value.toISOString().slice(0, 10);
			} else if (typeof value === "number" && column === "data_nascimento") {
				normalized[column] = excelSerialToIso(value);
			} else if (typeof value === "number" || typeof value === "string") {
				normalized[column] = value;
			} else {
				normalized[column] = "";
			}
		}
		return normalized;
	});

	const headers = Object.keys(records[0]);
	const missingRequired = REQUIRED_COLUMNS.filter(
		(col) => !headers.includes(col),
	);
	if (missingRequired.length > 0) {
		return {
			rows: [],
			errors: [`Colunas obrigatórias ausentes: ${missingRequired.join(", ")}`],
			fatal: true,
		};
	}

	const { rows, errors } = buildRowsFromRecords(records);
	return { rows, errors, fatal: false };
}

export async function parseStudentImportFile(file: File): Promise<{
	rows: ParsedImportRow[];
	errors: string[];
	fatal: boolean;
}> {
	const errors: string[] = [];

	if (!isAcceptedImportExtension(file.name)) {
		errors.push(
			`Formato de arquivo inválido. Envie um arquivo ${acceptedImportExtensionsLabel()}.`,
		);
		return { rows: [], errors, fatal: true };
	}

	const lower = file.name.toLowerCase();
	if (lower.endsWith(".csv")) {
		const text = await file.text();
		if (!text.trim()) {
			return {
				rows: [],
				errors: ["Colunas obrigatórias ausentes: nome"],
				fatal: true,
			};
		}
		const { rows, errors: parseErrors, fatal } = parseCsv(text);
		return { rows, errors: parseErrors, fatal };
	}

	const {
		rows,
		errors: parseErrors,
		fatal,
	} = parseSpreadsheet(await file.arrayBuffer());
	return { rows, errors: parseErrors, fatal };
}
