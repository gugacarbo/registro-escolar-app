import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PackageOpenIcon } from "lucide-react";
import { useState } from "react";
import { ClassRowActions } from "#/components/classes/class-row-actions";
import { CreateClassDialog } from "#/components/classes/create-class-dialog";
import { DataTable } from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { PageHeader, PageShell, PageToolbar } from "#/components/ui/page";
import { SearchInput } from "#/components/ui/search-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { useClasses } from "#/hooks/classes/use-classes";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import type { ClassListItem } from "#/lib/classes/types";

export const Route = createFileRoute("/_app/classes/")({
	component: ClassesPage,
});

const ALL_PERIODS = "__all__";

const columns = [
	{
		header: "Nome",
		cell: (classRow: ClassListItem) => classRow.name,
	},
	{
		header: "Período letivo",
		cell: (classRow: ClassListItem) => classRow.academicPeriod,
	},
	{
		header: "Estudantes ativos",
		cell: (classRow: ClassListItem) => classRow.activeStudentCount,
	},
	{
		header: "Ofertas",
		cell: (classRow: ClassListItem) => (
			<Button asChild variant="outline" size="sm">
				<Link to="/classes/$id/offers" params={{ id: classRow.id }}>
					<PackageOpenIcon className="mr-1.5 size-3.5" />
					Ofertas
				</Link>
			</Button>
		),
	},
	{
		header: "Ações",
		align: "right" as const,
		cell: (classRow: ClassListItem) => <ClassRowActions classRow={classRow} />,
	},
];

export default function ClassesPage() {
	const [search, setSearch] = useState("");
	const [academicPeriod, setAcademicPeriod] = useState("");
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
	} = useClasses({
		search: debouncedSearch || undefined,
		academicPeriod: academicPeriod || undefined,
		page,
		pageSize,
	});
	const periodOptions = classesPage?.academicPeriods ?? [];
	const hasFilter = debouncedSearch.trim().length > 0 || academicPeriod !== "";

	return (
		<PageShell>
			<PageHeader
				title="Turmas"
				actions={
					<>
						<Button asChild variant="secondary">
							<Link to="/classes/enroll">Matricular estudante</Link>
						</Button>
						<Button onClick={() => setDialogOpen(true)}>Nova turma</Button>
					</>
				}
			/>
			<PageToolbar className="sm:justify-between">
				<SearchInput
					className="sm:max-w-md"
					value={search}
					onChange={setSearch}
					placeholder="Buscar por nome"
					ariaLabel="Buscar por nome"
				/>
				<Select
					value={academicPeriod || ALL_PERIODS}
					onValueChange={(value) => {
						setAcademicPeriod(value === ALL_PERIODS ? "" : value);
						setPage(1);
					}}
				>
					<SelectTrigger
						aria-label="Filtrar por período letivo"
						className="w-52"
					>
						<SelectValue placeholder="Todos os períodos" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_PERIODS}>Todos os períodos</SelectItem>
						{periodOptions.map((period) => (
							<SelectItem key={period} value={period}>
								{period}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
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
					})
				}
				isLoading={isLoading}
				isError={isError}
				ariaLabel="Tabela de turmas"
				emptyTitle={
					hasFilter
						? "Nenhuma turma corresponde aos filtros"
						: "Nenhuma turma encontrada"
				}
				emptyDescription={
					hasFilter
						? "Ajuste a busca ou o período letivo."
						: "Cadastre uma nova turma."
				}
			/>
			<CreateClassDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</PageShell>
	);
}
