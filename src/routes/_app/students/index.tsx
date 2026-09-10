import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Plus, Search, Upload, X } from "lucide-react";
import { useState } from "react";
import { DataTable } from "#/components/data-table";
import { CreateStudentDialog } from "#/components/students/create-student-dialog";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "#/components/ui/input-group";
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

export function StudentsPage() {
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
		<div className="space-y-4 sm:space-y-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight">Alunos</h1>
					<p className="text-sm text-muted-foreground" role="status">
						{total === 0
							? "Nenhum aluno cadastrado"
							: total === 1
								? "1 aluno cadastrado"
								: `${total} alunos cadastrados`}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button asChild variant="secondary">
						<Link to="/students/import">
							<Upload />
							Importar alunos
						</Link>
					</Button>
					<Button onClick={() => setDialogOpen(true)}>
						<Plus />
						Novo aluno
					</Button>
				</div>
			</div>
			<InputGroup>
				<InputGroupAddon align="inline-start">
					<Search aria-hidden="true" />
				</InputGroupAddon>
				<InputGroupInput
					placeholder="Buscar por nome ou documento"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					aria-label="Buscar por nome ou documento"
				/>
				{search.length > 0 && (
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							size="icon-xs"
							aria-label="Limpar campo de busca"
							onClick={() => setSearch("")}
						>
							<X />
						</InputGroupButton>
					</InputGroupAddon>
				)}
			</InputGroup>
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
				ariaLabel="Tabela de alunos"
				emptyTitle={
					hasSearch
						? "Nenhum aluno corresponde à busca"
						: "Nenhum aluno encontrado"
				}
				emptyDescription={
					hasSearch
						? `Não encontramos resultados para “${debouncedSearch.trim()}”. Tente outro nome ou documento.`
						: "Cadastre o primeiro aluno ou importe uma lista em CSV."
				}
				emptyAction={
					hasSearch ? (
						<Button variant="outline" onClick={() => setSearch("")}>
							Limpar busca
						</Button>
					) : (
						<Button onClick={() => setDialogOpen(true)}>
							<Plus />
							Cadastrar aluno
						</Button>
					)
				}
			/>
			<CreateStudentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</div>
	);
}
