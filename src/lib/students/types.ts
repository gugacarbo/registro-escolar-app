import type { Student } from "./schema";

export type ListStudentsOptions = {
	limit?: number;
	offset?: number;
	search?: string;
};

export type StudentsPageResult = {
	data: Student[];
	total: number;
	page: number;
	pageSize: number;
};
