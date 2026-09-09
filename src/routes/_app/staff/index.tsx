import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { DataTable } from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
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

export function StaffPage() {
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

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Servidores</h1>
				<Link to="/staff/new">
					<Button>Novo servidor</Button>
				</Link>
			</div>
			<Input
				placeholder="Buscar por nome ou email"
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				aria-label="Buscar por nome ou email"
			/>
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
				isLoading={isLoading}
				isError={isError}
				ariaLabel="Tabela de servidores"
				emptyTitle="Nenhum servidor encontrado"
				emptyDescription="Ajuste a busca ou cadastre um novo servidor."
			/>
		</div>
	);
}
