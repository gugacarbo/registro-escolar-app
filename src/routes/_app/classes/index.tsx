import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { CreateClassDialog } from "#/components/classes/create-class-dialog";
import { DataTable } from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
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
			<Link
				to="/classes/$id/students"
				params={{ id: classRow.id }}
				search={{ date: undefined }}
				className="text-sm underline"
			>
				Ver alunos
			</Link>
		),
	},
];

export function ClassesPage() {
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
		data: classesPage,
		isLoading,
		isError,
	} = useClasses({ search: debouncedSearch || undefined, page, pageSize });

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Turmas</h1>
				<div className="flex gap-2">
					<Button onClick={() => setDialogOpen(true)}>Nova turma</Button>
					<Link to="/classes/enroll">
						<Button variant="secondary">Matricular aluno</Button>
					</Link>
				</div>
			</div>
			<Input
				placeholder="Buscar por nome"
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				aria-label="Buscar por nome"
			/>
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
				isLoading={isLoading}
				isError={isError}
				ariaLabel="Tabela de turmas"
				emptyTitle="Nenhuma turma encontrada"
				emptyDescription="Ajuste a busca ou cadastre uma nova turma."
			/>
			<CreateClassDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</div>
	);
}
