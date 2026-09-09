import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getStudentsQueryKey } from "./use-students";

type ImportPreviewResponse = {
	rows: Array<{
		index: number;
		name: string;
		document: string;
		registrationNumber: string;
		email: string;
		phone: string;
		birthDate: string;
		notes: string;
		status: "valid" | "conflict" | "invalid";
		existingStudentId?: string;
		existingStudentName?: string;
		errors: string[];
		candidates?: Array<{ id: string; name: string; reason: string }>;
	}>;
	summary: {
		total: number;
		valid: number;
		conflicts: number;
		invalid: number;
	};
	warnings?: string[];
};

export function useImportPreview() {
	return useMutation<ImportPreviewResponse, Error, File>({
		mutationFn: async (file) => {
			const formData = new FormData();
			formData.append("file", file);
			const response = await fetch("/api/students/import", {
				method: "POST",
				body: formData,
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao processar importação");
			}
			return response.json() as Promise<ImportPreviewResponse>;
		},
	});
}

type Resolution = {
	index: number;
	action: "create" | "link" | "skip";
	data?: {
		name: string;
		document?: string;
		registrationNumber?: string;
		email?: string;
		phone?: string;
		birthDate?: string;
		notes?: string;
	};
	existingStudentId?: string;
};

type ImportResolveResponse = {
	created: number;
	linked: number;
	skipped: number;
	students: Array<{ id: string; name: string }>;
};

export function useResolveImport() {
	const queryClient = useQueryClient();

	return useMutation<ImportResolveResponse, Error, { rows: Resolution[] }>({
		mutationFn: async ({ rows }) => {
			const response = await fetch("/api/students/import/resolve", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ rows }),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao confirmar importação");
			}
			return response.json() as Promise<ImportResolveResponse>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getStudentsQueryKey() });
		},
	});
}
