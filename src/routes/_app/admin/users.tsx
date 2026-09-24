import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { UserRowActions } from "#/components/admin-users/user-row-actions";
import { DataTable, type DataTableColumn } from "#/components/data-table";
import { Badge } from "#/components/ui/badge";
import { PageHeader, PageShell, PageToolbar } from "#/components/ui/page";
import { SearchInput } from "#/components/ui/search-input";
import { useAdminUsers } from "#/hooks/admin-users/use-admin-users";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import type { AdminUser } from "#/lib/admin-users/schema";
import { useAuthSession } from "#/lib/auth/session-context";

export const Route = createFileRoute("/_app/admin/users")({
	component: AdminUsersPage,
});

function formatCreatedAt(value: Date | string) {
	return new Date(value).toLocaleDateString("pt-BR");
}

export default function AdminUsersPage() {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const debouncedSearch = useDebouncedValue(search, 300);
	const [activeSearch, setActiveSearch] = useState(debouncedSearch);

	if (activeSearch !== debouncedSearch) {
		setActiveSearch(debouncedSearch);
		if (page !== 1) {
			setPage(1);
		}
	}

	const {
		data: usersPage,
		isLoading,
		isError,
		refetch,
	} = useAdminUsers({
		search: debouncedSearch || undefined,
		page,
		pageSize,
	});

	const session = useAuthSession();
	const currentUserId = session?.user.id;

	const columns: DataTableColumn<AdminUser>[] = [
		{
			header: "Nome",
			className: "w-52",
			cell: (row) => (
				<span className="block truncate" title={row.name}>
					{row.name}
				</span>
			),
		},
		{
			header: "Email",
			className: "w-72",
			cell: (row) => (
				<span className="block truncate" title={row.email}>
					{row.email}
				</span>
			),
		},
		{
			header: "Papel",
			cell: (row) => (
				<span className="flex flex-wrap items-center gap-1.5">
					<Badge variant={row.role === "admin" ? "default" : "secondary"}>
						{row.role === "admin" ? "Admin" : "Usuário"}
					</Badge>
					{row.isPermanentAdmin && (
						<Badge variant="outline">Admin permanente</Badge>
					)}
				</span>
			),
		},
		{
			header: "Criado em",
			cell: (row) => formatCreatedAt(row.createdAt),
		},
		{
			key: "acoes",
			header: "Ações",
			align: "right",
			cell: (row) => (
				<UserRowActions user={row} currentUserId={currentUserId} />
			),
		},
	];

	return (
		<PageShell>
			<PageHeader title="Usuários" />
			<PageToolbar>
				<SearchInput
					className="sm:max-w-md"
					value={search}
					onChange={setSearch}
					placeholder="Buscar por nome ou email"
					ariaLabel="Buscar por nome ou email"
				/>
			</PageToolbar>
			<DataTable
				columns={columns}
				rows={usersPage?.data ?? []}
				getRowKey={(row) => row.id}
				total={usersPage?.total ?? 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={(size) => {
					setPageSize(size);
					setPage(1);
				}}
				isLoading={isLoading}
				isError={isError}
				onRetry={() => void refetch()}
				ariaLabel="Tabela de usuários"
				emptyTitle="Nenhum usuário encontrado"
				emptyDescription="Ajuste a busca para encontrar uma conta."
				tableClassName="table-fixed"
			/>
		</PageShell>
	);
}
