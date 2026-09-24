import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { CreateComponentDialog } from "#/components/components/create-component-dialog";
import { DataTable } from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { PageHeader, PageShell, PageToolbar } from "#/components/ui/page";
import { SearchInput } from "#/components/ui/search-input";
import { useComponents } from "#/hooks/components/use-components";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import type { Component } from "#/lib/components/schema";

export const Route = createFileRoute("/_app/components/")({
	component: ComponentsPage,
});

const columns = [
	{
		header: "Nome",
		cell: (component: Component) => component.name,
	},
];

export default function ComponentsPage() {
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
		data: componentsPage,
		isLoading,
		isError,
	} = useComponents({ search: debouncedSearch || undefined, page, pageSize });
	const navigate = useNavigate();

	return (
		<PageShell>
			<PageHeader
				title="Componentes curriculares"
				actions={
					<Button onClick={() => setDialogOpen(true)}>Novo componente</Button>
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
				rows={componentsPage?.data ?? []}
				getRowKey={(component) => component.id}
				total={componentsPage?.total ?? 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={(size) => {
					setPageSize(size);
					setPage(1);
				}}
				onRowClick={(component) =>
					navigate({ to: "/components/$id", params: { id: component.id } })
				}
				isLoading={isLoading}
				isError={isError}
				ariaLabel="Tabela de componentes"
				emptyTitle="Nenhum componente encontrado"
				emptyDescription="Ajuste a busca ou cadastre um novo componente."
			/>
			<CreateComponentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</PageShell>
	);
}
