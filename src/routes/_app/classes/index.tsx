import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { CreateClassDialog } from "#/components/classes/create-class-dialog";
import { DataTable } from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { PageHeader, PageShell, PageToolbar } from "#/components/ui/page";
import { SearchInput } from "#/components/ui/search-input";
import { useClasses } from "#/hooks/classes/use-classes";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import type { Class } from "#/lib/classes/schema";

export const Route = createFileRoute("/_app/classes/")({
	component: ClassesPage,
});

const columns = [
	{
		header: "Nome",
		cell: (classRow: Class) => classRow.name,
	},
	{
		header: "Período letivo",
		cell: (classRow: Class) => classRow.academicPeriod,
	},
	{
		header: "Ações",
		cell: (classRow: Class) => (
			<div className="flex gap-2">
				<Link
					to="/classes/$id/students"
					params={{ id: classRow.id }}
					search={{ date: undefined }}
					className="text-sm underline"
				>
					Ver estudantes
				</Link>
				<Link
					to="/classes/$id/offers"
					params={{ id: classRow.id }}
					className="text-sm underline"
				>
					Ofertas
				</Link>
			</div>
		),
	},
];

export default function ClassesPage() {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [dialogOpen, setDialogOpen] = useState(false);
	const navigate = useNavigate();
	const debouncedSearch = useDebouncedValue(search, 300);
	const [activeSearch, setActiveSearch] = useState(debouncedSearch);

	if (activeSearch !== debouncedSearch) {
		setActiveSearch(debouncedSearch);
		if (page !== 1) {
			setPage(1);
		}
	}

	const {
		data: classesPage,
		isLoading,
		isError,
	} = useClasses({ search: debouncedSearch || undefined, page, pageSize });

	return (
		<PageShell>
			<PageHeader
				eyebrow="Estrutura escolar"
				title="Turmas"
				description="Organize turmas por período letivo, curso e turno antes de gerar matrículas e ofertas."
				actions={
					<>
						<Button asChild variant="secondary">
							<Link to="/classes/enroll">Matricular estudante</Link>
						</Button>
						<Button onClick={() => setDialogOpen(true)}>Nova turma</Button>
					</>
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
				rows={classesPage?.data ?? []}
				getRowKey={(classRow) => classRow.id}
				total={classesPage?.total ?? 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={(size) => {
					setPageSize(size);
					setPage(1);
				}}
				onRowClick={(classRow) =>
					navigate({
						to: "/classes/$id/students",
						params: { id: classRow.id },
						search: { date: undefined },
					})
				}
				isLoading={isLoading}
				isError={isError}
				ariaLabel="Tabela de turmas"
				emptyTitle="Nenhuma turma encontrada"
				emptyDescription="Ajuste a busca ou cadastre uma nova turma."
			/>
			<CreateClassDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</PageShell>
	);
}
