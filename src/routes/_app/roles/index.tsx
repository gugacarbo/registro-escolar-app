import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { DataTable } from "#/components/data-table";
import { CreateRoleDialog } from "#/components/roles/create-role-dialog";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useRoles } from "#/hooks/roles/use-roles";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import type { Role } from "#/lib/roles/schema";

export const Route = createFileRoute("/_app/roles/")({
	component: RolesPage,
});

const columns = [
	{
		header: "Nome",
		cell: (role: Role) => role.name,
	},
];

export function RolesPage() {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [dialogOpen, setDialogOpen] = useState(false);
	const debouncedSearch = useDebouncedValue(search, 300);
	const [activeSearch, setActiveSearch] = useState(debouncedSearch);

	if (activeSearch !== debouncedSearch) {
		setActiveSearch(debouncedSearch);
		if (page !== 1) {
			setPage(1);
		}
	}

	const {
		data: rolesPage,
		isLoading,
		isError,
	} = useRoles({ search: debouncedSearch || undefined, page, pageSize });

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Papéis</h1>
				<Button onClick={() => setDialogOpen(true)}>Novo papel</Button>
			</div>
			<Input
				placeholder="Buscar por nome"
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				aria-label="Buscar por nome"
			/>
			<DataTable
				columns={columns}
				rows={rolesPage?.data ?? []}
				getRowKey={(role) => role.id}
				total={rolesPage?.total ?? 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={(size) => {
					setPageSize(size);
					setPage(1);
				}}
				isLoading={isLoading}
				isError={isError}
				ariaLabel="Tabela de papéis"
				emptyTitle="Nenhum papel encontrado"
				emptyDescription="Ajuste a busca ou cadastre um novo papel."
			/>
			<CreateRoleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</div>
	);
}
