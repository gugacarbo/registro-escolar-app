import type { ParsedImportRow } from "./csv-parser";
import type { Student } from "./schema";
import { normalizeDocument, normalizeName } from "./shared";

export type ConflictCandidate = {
	student: Student;
	reason: "document" | "name";
};

export type MatchedRow = ParsedImportRow & {
	status: "valid" | "conflict" | "invalid";
	candidates?: ConflictCandidate[];
};

export function matchImportRows(
	rows: ParsedImportRow[],
	existingStudents: Student[],
): MatchedRow[] {
	return rows.map((row) => {
		if (row.errors.length > 0) {
			return { ...row, status: "invalid" };
		}

		const normalizedName = normalizeName(row.name);
		const normalizedDocument = row.document
			? normalizeDocument(row.document)
			: undefined;

		const candidates: ConflictCandidate[] = [];

		for (const student of existingStudents) {
			if (
				normalizedDocument &&
				student.document &&
				normalizeDocument(student.document) === normalizedDocument
			) {
				candidates.push({ student, reason: "document" });
				continue;
			}

			if (normalizeName(student.name) === normalizedName) {
				candidates.push({ student, reason: "name" });
			}
		}

		if (candidates.length > 0) {
			return { ...row, status: "conflict", candidates };
		}

		return { ...row, status: "valid" };
	});
}
