import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { DataTable } from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { PageHeader, PageShell, PageToolbar } from "#/components/ui/page";
import { SearchInput } from "#/components/ui/search-input";
import { useStaff } from "#/hooks/staff/use-staff";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import type { StaffMember } from "#/lib/staff/schema";

export const Route = createFileRoute("/_app/staff/")({
	component: StaffPage,
});

const columns = [
	{
		header: "Nome",
		cell: (member: StaffMember) => member.name,
	},
	{
		header: "Email",
		cell: (member: StaffMember) => member.email ?? "—",
	},
];

export default function StaffPage() {
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
		data: staffPage,
		isLoading,
		isError,
	} = useStaff({ search: debouncedSearch || undefined, page, pageSize });
	const navigate = useNavigate();

	return (
		<PageShell>
			<PageHeader
				eyebrow="Equipe"
				title="Servidores"
				description="Professores, gestores e especialistas que participam das reuniões e atas do conselho."
				actions={
					<Button asChild>
						<Link to="/staff/new">Novo servidor</Link>
					</Button>
				}
			/>
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
				rows={staffPage?.data ?? []}
				getRowKey={(member) => member.id}
				total={staffPage?.total ?? 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={(size) => {
					setPageSize(size);
					setPage(1);
				}}
				onRowClick={(member) =>
					navigate({ to: "/staff/$id", params: { id: member.id } })
				}
				isLoading={isLoading}
				isError={isError}
				ariaLabel="Tabela de servidores"
				emptyTitle="Nenhum servidor encontrado"
				emptyDescription="Ajuste a busca ou cadastre um novo servidor."
			/>
		</PageShell>
	);
}
