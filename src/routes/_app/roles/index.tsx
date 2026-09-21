import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { DataTable } from "#/components/data-table";
import { CreateRoleDialog } from "#/components/roles/create-role-dialog";
import { Button } from "#/components/ui/button";
import { PageHeader, PageShell, PageToolbar } from "#/components/ui/page";
import { SearchInput } from "#/components/ui/search-input";
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

export default function RolesPage() {
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
	const navigate = useNavigate();

	return (
		<PageShell>
			<PageHeader
				eyebrow="Configuração"
				title="Cargos"
				description="Defina as funções usadas ao identificar participantes do conselho."
				actions={
					<Button onClick={() => setDialogOpen(true)}>Novo cargo</Button>
				}
			/>
			<PageToolbar>
				<SearchInput
					className="sm:max-w-md"
					value={search}
					onChange={setSearch}
					placeholder="Buscar por nome"
					ariaLabel="Buscar por nome"
				/>
			</PageToolbar>
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
				onRowClick={(role) =>
					navigate({ to: "/roles/$id", params: { id: role.id } })
				}
				isLoading={isLoading}
				isError={isError}
				ariaLabel="Tabela de cargos"
				emptyTitle="Nenhum cargo encontrado"
				emptyDescription="Ajuste a busca ou cadastre um novo cargo."
			/>
			<CreateRoleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</PageShell>
	);
}
