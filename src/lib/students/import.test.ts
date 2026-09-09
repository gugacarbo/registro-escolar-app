import { describe, expect, it } from "vitest";

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

	it("rejects non-csv files", async () => {
		const file = new File(["not csv"], "alunos.txt", { type: "text/plain" });
		const { rows, errors } = await parseStudentImportFile(file);
		expect(rows).toHaveLength(0);
		expect(errors[0]).toContain("Formato");
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
		expect(matched[0].candidates?.[0].reason).toBe("name");
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
