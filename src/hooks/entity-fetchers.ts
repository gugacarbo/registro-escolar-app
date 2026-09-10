import type { Class } from "#/lib/classes/schema";
import type { Component } from "#/lib/components/schema";
import type { Role } from "#/lib/roles/schema";
import type { StaffMember } from "#/lib/staff/schema";
import type { Student } from "#/lib/students/schema";

type PageParams = { search?: string; page: number; pageSize: number };

async function fetchPage<TData>(path: string, params: PageParams) {
	const query = new URLSearchParams();
	if (params.search) query.set("search", params.search);
	query.set("page", String(params.page));
	query.set("pageSize", String(params.pageSize));
	const response = await fetch(`${path}?${query.toString()}`);
	if (!response.ok) {
		throw new Error(`Falha ao carregar ${path}`);
	}
	return response.json() as Promise<{ data: TData[]; total: number }>;
}

export function fetchStudentsPage(params: PageParams) {
	return fetchPage<Student>("/api/students", params);
}

export function fetchClassesPage(params: PageParams) {
	return fetchPage<Class>("/api/classes", params);
}

export function fetchStaffPage(params: PageParams) {
	return fetchPage<StaffMember>("/api/staff", params);
}

export function fetchRolesPage(params: PageParams) {
	return fetchPage<Role>("/api/roles", params);
}

export function fetchComponentsPage(params: PageParams) {
	return fetchPage<Component>("/api/components", params);
}

export function fetchMeetingsPage(params: PageParams & { status?: string }) {
	const query = new URLSearchParams();
	if (params.search) query.set("search", params.search);
	if (params.status) query.set("status", params.status);
	query.set("page", String(params.page));
	query.set("pageSize", String(params.pageSize));
	return fetch("/api/meetings?" + query.toString()).then(async (response) => {
		if (!response.ok) throw new Error("Falha ao carregar /api/meetings");
		return response.json() as Promise<{
			data: Array<{ id: string; title: string }>;
			total: number;
		}>;
	});
}
