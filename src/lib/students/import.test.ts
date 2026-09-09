import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { parseStudentImportFile } from "./csv-parser";
import { matchImportRows } from "./matching";

describe("parseStudentImportFile", () => {
	it("parses a valid CSV", async () => {
		const file = new File(
			["nome,documento\nJoão Silva,123456\nMaria Souza,789012"],
			"alunos.csv",
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
		const file = new File(["not csv"], "alunos.txt", { type: "text/plain" });
		const { rows, errors, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(true);
		expect(rows).toHaveLength(0);
		expect(errors[0]).toContain("Formato");
	});

	it("parses csv with semicolon delimiter", async () => {
		const file = new File(["nome;documento\nJoão Silva;123456"], "alunos.csv", {
			type: "text/csv",
		});
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
			"Alunos",
		);
		const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
		const file = new File([buffer as ArrayBuffer], "alunos.xlsx");
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
			"Alunos",
		);
		const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
		const file = new File([buffer as ArrayBuffer], "alunos.xlsx");
		const { rows, errors, fatal } = await parseStudentImportFile(file);
		expect(fatal).toBe(true);
		expect(rows).toHaveLength(0);
		expect(errors[0]).toContain("nome");
	});

	it("flags rows without name", async () => {
		const file = new File(["nome\n\nJoão Silva"], "alunos.csv", {
			type: "text/csv",
		});
		const { rows } = await parseStudentImportFile(file);
		expect(rows).toHaveLength(2);
		expect(rows[0].errors).toContain("Nome é obrigatório");
		expect(rows[1].name).toBe("João Silva");
		expect(rows[1].errors).toHaveLength(0);
	});

	it("returns recoverable rows with line warnings instead of failing", async () => {
		const file = new File(
			['"nome","documento"\n"João Silva","unclosed'],
			"alunos.csv",
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
		const file = new File([csv], "alunos.csv", { type: "text/csv" });
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
		const file = new File([""], "alunos.csv", { type: "text/csv" });
		const { rows, errors } = await parseStudentImportFile(file);
		expect(rows).toEqual([]);
		expect(errors[0]).toContain("nome");
	});

	it("requires nome column", async () => {
		const file = new File(["documento\n123456"], "alunos.csv", {
			type: "text/csv",
		});
		const { rows, errors } = await parseStudentImportFile(file);
		expect(rows).toHaveLength(0);
		expect(errors[0]).toContain("nome");
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
});
