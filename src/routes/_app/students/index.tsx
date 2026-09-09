import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable } from "#/components/data-table";
import { CreateStudentDialog } from "#/components/students/create-student-dialog";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useStudents } from "#/hooks/students/use-students";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import type { Student } from "#/lib/students/schema";

export const Route = createFileRoute("/_app/students/")({
	component: StudentsPage,
});

const columns = [
	{
		header: "Nome",
		cell: (student: Student) => (
			<Link
				to="/students/$id"
				params={{ id: student.id }}
				className="font-medium underline-offset-4 hover:underline"
			>
				{student.name}
			</Link>
		),
	},
	{
		header: "Documento",
		cell: (student: Student) => student.document ?? "—",
	},
];

export function StudentsPage() {
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
		data: studentsPage,
		isLoading,
		isError,
	} = useStudents({ search: debouncedSearch || undefined, page, pageSize });

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Alunos</h1>
				<div className="flex gap-2">
					<Button onClick={() => setDialogOpen(true)}>Novo aluno</Button>
					<Link to="/students/import">
						<Button variant="secondary">Importar alunos</Button>
					</Link>
				</div>
			</div>
			<Input
				placeholder="Buscar por nome ou documento"
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				aria-label="Buscar por nome ou documento"
			/>
			<DataTable
				columns={columns}
				rows={studentsPage?.data ?? []}
				getRowKey={(student) => student.id}
				total={studentsPage?.total ?? 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={(size) => {
					setPageSize(size);
					setPage(1);
				}}
				isLoading={isLoading}
				isError={isError}
				ariaLabel="Tabela de alunos"
				emptyTitle="Nenhum aluno encontrado"
				emptyDescription="Ajuste a busca ou cadastre um novo aluno."
			/>
			<CreateStudentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</div>
	);
}
