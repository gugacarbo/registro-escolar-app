import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { parseStudentImportFile } from "./csv-parser";
import { matchImportRows } from "./matching";

describe("parseStudentImportFile", () => {
	it("parses a valid CSV", async () => {
		const file = new File(
			["nome,documento\nJoão Silva,123456\nMaria Souza,789012"],
			"estudantes.csv",
			{
				type: "text/csv",
			},
		);
		const { rows, errors } = await parseStudentImportFile(file);
		expect(errors).toHaveLength(0);
		expect(rows).toHaveLength(2);
		expect(rows[0].name).toBe("João Silva");
		expect(rows[0].document).toBe("123456");
	});

	it("rejects unsupported files", async () => {
		const file = new File(["not csv"], "estudantes.txt", {
			type: "text/plain",
		});
		const { rows, errors, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(true);
		expect(rows).toHaveLength(0);
		expect(errors[0]).toContain("Formato");
	});

	it("parses csv with semicolon delimiter", async () => {
		const file = new File(
			["nome;documento\nJoão Silva;123456"],
			"estudantes.csv",
			{
				type: "text/csv",
			},
		);
		const { rows, errors, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(false);
		expect(errors).toEqual([]);
		expect(rows[0].name).toBe("João Silva");
		expect(rows[0].document).toBe("123456");
	});

	it("parses an xlsx spreadsheet", async () => {
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(
			workbook,
			XLSX.utils.aoa_to_sheet([
				["nome", "documento"],
				["João Silva", "123456"],
			]),
			"Estudantes",
		);
		const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
		const file = new File([buffer as ArrayBuffer], "estudantes.xlsx");
		const { rows, errors, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(false);
		expect(errors).toEqual([]);
		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe("João Silva");
		expect(rows[0].document).toBe("123456");
	});

	it("rejects a spreadsheet without the nome column", async () => {
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(
			workbook,
			XLSX.utils.aoa_to_sheet([["documento"], ["123456"]]),
			"Estudantes",
		);
		const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
		const file = new File([buffer as ArrayBuffer], "estudantes.xlsx");
		const { rows, errors, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(true);
		expect(rows).toHaveLength(0);
		expect(errors[0]).toContain("nome");
	});

	it("flags rows without name", async () => {
		const file = new File(["nome\n,\nJoão Silva"], "estudantes.csv", {
			type: "text/csv",
		});
		const { rows, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(false);
		expect(rows).toHaveLength(2);
		expect(rows[0].errors).toContain("Nome é obrigatório");
		expect(rows[1].name).toBe("João Silva");
		expect(rows[1].errors).toHaveLength(0);
	});

	it("returns recoverable rows with line warnings instead of failing", async () => {
		const file = new File(
			['"nome","documento"\n"João Silva","unclosed'],
			"estudantes.csv",
			{
				type: "text/csv",
			},
		);
		const { rows, errors, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(false);
		expect(rows.length).toBeGreaterThanOrEqual(1);
		expect(rows[0].name).toBe("João Silva");
		expect(errors.length).toBeGreaterThan(0);
	});

	it("maps optional columns from a complete CSV", async () => {
		const csv = [
			"Nome,Documento,Matricula,Email,Telefone,Data_Nascimento,Observacoes",
			"João Silva,123.456,2026001,joao@escola.test,11999999999,2010-05-20,Atendimento",
		].join("\n");
		const file = new File([csv], "estudantes.csv", { type: "text/csv" });
		const { rows, errors } = await parseStudentImportFile(file);
		expect(errors).toEqual([]);
		expect(rows[0]).toMatchObject({
			name: "João Silva",
			document: "123.456",
			registrationNumber: "2026001",
			email: "joao@escola.test",
			phone: "11999999999",
			birthDate: "2010-05-20",
			notes: "Atendimento",
		});
	});

	it("reports missing columns for an empty CSV", async () => {
		const file = new File([""], "estudantes.csv", { type: "text/csv" });
		const { rows, errors } = await parseStudentImportFile(file);
		expect(rows).toEqual([]);
		expect(errors[0]).toContain("nome");
	});

	it("parses xlsx with date cells and empty trailing rows", async () => {
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(
			workbook,
			XLSX.utils.aoa_to_sheet([
				["nome", "data_nascimento", "documento"],
				["João Silva", new Date("2010-05-20T12:00:00Z"), "123456"],
				["", "", ""],
			]),
			"Estudantes",
		);
		const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
		const file = new File([buffer as ArrayBuffer], "estudantes.xlsx");
		const { rows, errors, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(false);
		expect(errors.length).toBeGreaterThan(0);
		expect(rows).toHaveLength(2);
		expect(rows[0].birthDate).toBe("2010-05-20");
		expect(rows[1].errors).toContain("Nome é obrigatório");
	});

	it("requires nome column", async () => {
		const file = new File(["documento\n123456"], "estudantes.csv", {
			type: "text/csv",
		});
		const { rows, errors } = await parseStudentImportFile(file);
		expect(rows).toHaveLength(0);
		expect(errors[0]).toContain("nome");
	});

	it("detects pipe delimiter from a cluttered header line", async () => {
		const file = new File(
			["  nome | documento \nJoão Silva|123456"],
			"estudantes.csv",
			{ type: "text/csv" },
		);
		const { rows, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(false);
		expect(rows[0].name).toBe("João Silva");
	});

	it("falls back to comma when no delimiter is detected", async () => {
		const file = new File(["nome\nJoão Silva"], "estudantes.csv", {
			type: "text/csv",
		});
		const { rows, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(false);
		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe("João Silva");
	});

	it("parses csv with pipe delimiter", async () => {
		const file = new File(
			["nome|documento\nJoão Silva|123456"],
			"estudantes.csv",
			{
				type: "text/csv",
			},
		);
		const { rows, errors, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(false);
		expect(errors).toEqual([]);
		expect(rows[0].name).toBe("João Silva");
		expect(rows[0].document).toBe("123456");
	});

	it("parses csv with tab delimiter", async () => {
		const file = new File(
			["nome\tdocumento\nJoão Silva\t123456"],
			"estudantes.csv",
			{
				type: "text/csv",
			},
		);
		const { rows, errors, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(false);
		expect(errors).toEqual([]);
		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe("João Silva");
		expect(rows[0].document).toBe("123456");
	});

	it("parses xlsx with numeric birthdate serial and non-string cells", async () => {
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(
			workbook,
			XLSX.utils.aoa_to_sheet([
				["nome", "data_nascimento", "documento", "email"],
				["Maria Souza", 40544, 123456, true],
			]),
			"Estudantes",
		);
		const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
		const file = new File([buffer as ArrayBuffer], "estudantes.xlsx");
		const { rows, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(false);
		expect(rows).toHaveLength(1);
		expect(rows[0].birthDate).toBe("2011-01-01");
		expect(rows[0].document).toBe("123456");
	});

	it("rejects an unreadable spreadsheet buffer", async () => {
		const file = new File(["não é planilha"], "estudantes.xlsx", {
			type: "application/octet-stream",
		});
		const { rows, errors, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(true);
		expect(rows).toHaveLength(0);
		expect(errors[0]).not.toHaveLength(0);
	});

	it("rejects an empty spreadsheet without data rows", async () => {
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(
			workbook,
			XLSX.utils.aoa_to_sheet([]),
			"Estudantes",
		);
		const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
		const file = new File([buffer as ArrayBuffer], "estudantes.xlsx");
		const { rows, errors, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(true);
		expect(rows).toHaveLength(0);
		expect(errors[0]).toContain("nome");
	});

	it("detecta o delimitador com maior contagem e cobre fallbacks do parser", async () => {
		const result = await parseStudentImportFile(
			new File(["nome;documento;email\nJoão;123;joao@example.com\n"], "a.csv", {
				type: "text/csv",
			}),
		);
		expect(result.rows[0]).toMatchObject({
			name: "João",
			document: "123",
			email: "joao@example.com",
		});
	});

	it("normaliza valores nulos e vazios de CSV", async () => {
		const result = await parseStudentImportFile(
			new File(["nome,documento\n ,\nMaria,\n"], "a.csv", { type: "text/csv" }),
		);
		expect(result.rows[0]?.errors).toContain("Nome é obrigatório");
		expect(result.rows[1]?.document).toBeUndefined();
	});
});

describe("matchImportRows", () => {
	const existing = [
		{
			id: "s1",
			name: "João Silva",
			document: "123456",
			registrationNumber: null,
			email: null,
			phone: null,
			birthDate: null,
			notes: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	];

	it("detects document conflict", () => {
		const rows = [
			{ index: 2, name: "João S.", document: "123456", errors: [] },
		];
		const matched = matchImportRows(rows, existing);
		expect(matched[0].status).toBe("conflict");
		expect(matched[0].candidates?.[0].reason).toBe("document");
	});

	it("detects name conflict", () => {
		const rows = [{ index: 2, name: "João Silva", errors: [] }];
		const matched = matchImportRows(rows, existing);
		expect(matched[0].status).toBe("conflict");
		expect(matched[0].candidates?.at(-1)?.reason).toBe("name");
	});

	it("does not compare documents when only one side has one", () => {
		const rows = [
			{ index: 2, name: "Carlos Andrade", document: "123456", errors: [] },
		];
		const matched = matchImportRows(rows, [
			...existing,
			{ ...existing[0], id: "s2", name: "Carlos Andrade", document: null },
		]);
		expect(matched[0].status).toBe("conflict");
		expect(matched[0].candidates?.at(-1)?.reason).toBe("name");
	});

	it("marks unique rows as valid", () => {
		const rows = [{ index: 2, name: "Carlos Andrade", errors: [] }];
		const matched = matchImportRows(rows, existing);
		expect(matched[0].status).toBe("valid");
	});

	it("keeps invalid rows invalid", () => {
		const rows = [{ index: 2, name: "", errors: ["Nome é obrigatório"] }];
		const matched = matchImportRows(rows, existing);
		expect(matched[0].status).toBe("invalid");
	});

	it("trata datas numéricas inválidas e fallbacks de cabeçalho", async () => {
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(
			workbook,
			XLSX.utils.aoa_to_sheet([
				["nome", "data_nascimento"],
				["João", Number.MAX_SAFE_INTEGER],
			]),
			"Estudantes",
		);
		const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
		const file = new File([buffer as ArrayBuffer], "estudantes.xlsx");
		const { rows } = await parseStudentImportFile(file);
		expect(rows[0]?.birthDate).toBe(String(Number.MAX_SAFE_INTEGER));
	});
});
