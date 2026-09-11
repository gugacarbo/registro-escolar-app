import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { DataTable } from "#/components/data-table";
import { CreateStudentDialog } from "#/components/students/create-student-dialog";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { PageHeader, PageShell, PageToolbar } from "#/components/ui/page";
import { SearchInput } from "#/components/ui/search-input";
import { useStudents } from "#/hooks/students/use-students";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import type { Student } from "#/lib/students/schema";

export const Route = createFileRoute("/_app/students/")({
	component: StudentsPage,
});

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return "?";
	}
	const first = parts[0]?.[0] ?? "";
	const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
	return `${first}${last}`.toUpperCase() || "?";
}

function StudentRowActions({ student }: { student: Student }) {
	return (
		<Button asChild variant="ghost" size="icon-sm">
			<Link
				to="/students/$id"
				params={{ id: student.id }}
				aria-label={`Ver detalhes de ${student.name}`}
			>
				<ChevronRight />
			</Link>
		</Button>
	);
}

const columns = [
	{
		key: "name",
		header: "Nome",
		skeletonClassName: "h-9 w-44 max-w-full",
		cell: (student: Student) => (
			<span className="flex min-w-0 items-center gap-3">
				<Avatar size="sm" aria-hidden="true">
					<AvatarFallback>{getInitials(student.name)}</AvatarFallback>
				</Avatar>
				<Link
					to="/students/$id"
					params={{ id: student.id }}
					className="truncate font-medium underline-offset-4 hover:underline"
				>
					{student.name}
				</Link>
			</span>
		),
	},
	{
		key: "document",
		header: "Documento",
		align: "right" as const,
		className: "hidden sm:table-cell",
		skeletonClassName: "ml-auto h-4 w-24",
		cell: (student: Student) =>
			student.document ? (
				<Badge variant="secondary" className="font-mono tabular-nums">
					{student.document}
				</Badge>
			) : (
				<span className="text-muted-foreground">—</span>
			),
	},
	{
		key: "actions",
		header: <span className="sr-only">Ações</span>,
		align: "right" as const,
		skeletonClassName: "ml-auto size-8",
		cell: (student: Student) => <StudentRowActions student={student} />,
	},
];

export default function StudentsPage() {
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
		data: studentsPage,
		isLoading,
		isError,
		refetch,
	} = useStudents({
		search: debouncedSearch || undefined,
		page,
		pageSize,
	});
	const total = studentsPage?.total ?? 0;
	const hasSearch = debouncedSearch.trim().length > 0;

	return (
		<PageShell>
			<PageHeader
				eyebrow="Cadastro"
				title="Estudantes"
				description="Busque, cadastre e importe alunos. Cada linha leva ao histórico completo e aos registros do conselho."
				actions={
					<>
						<Button asChild variant="secondary">
							<Link to="/students/import">
								<Upload aria-hidden="true" />
								Importar
							</Link>
						</Button>
						<Button onClick={() => setDialogOpen(true)}>
							<Plus aria-hidden="true" />
							Novo estudante
						</Button>
					</>
				}
			/>
			<PageToolbar>
				<SearchInput
					className="sm:max-w-md"
					value={search}
					onChange={setSearch}
					placeholder="Buscar por nome ou documento"
					ariaLabel="Buscar por nome ou documento"
				/>
			</PageToolbar>
			<DataTable
				columns={columns}
				rows={studentsPage?.data ?? []}
				getRowKey={(student) => student.id}
				total={total}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={(size) => {
					setPageSize(size);
					setPage(1);
				}}
				onRowClick={(student) =>
					navigate({ to: "/students/$id", params: { id: student.id } })
				}
				isLoading={isLoading}
				isError={isError}
				onRetry={() => {
					void refetch();
				}}
				ariaLabel="Tabela de estudantes"
				emptyTitle={
					hasSearch
						? "Nenhum estudante corresponde à busca"
						: "Nenhum estudante encontrado"
				}
				emptyDescription={
					hasSearch
						? `Não encontramos resultados para “${debouncedSearch.trim()}”. Tente outro nome ou documento.`
						: "Cadastre o primeiro estudante ou importe uma lista em CSV."
				}
				emptyAction={
					hasSearch ? (
						<Button variant="outline" onClick={() => setSearch("")}>
							Limpar busca
						</Button>
					) : (
						<Button onClick={() => setDialogOpen(true)}>
							<Plus />
							Cadastrar estudante
						</Button>
					)
				}
			/>
			<CreateStudentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</PageShell>
	);
}
