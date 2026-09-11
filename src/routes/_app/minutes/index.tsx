import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "#/components/data-table";
import { Badge } from "#/components/ui/badge";
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
import { useMinutes } from "#/hooks/minutes/use-minutes";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import type { MinuteApprovalStatus, MinuteListItem } from "#/lib/minutes/types";

export const Route = createFileRoute("/_app/minutes/")({
	component: MinutesPage,
});

const APPROVAL_OPTIONS: Array<{ value: MinuteApprovalStatus; label: string }> =
	[
		{ value: "pendente_aprovacao", label: "Pendente de aprovação" },
		{ value: "aprovada", label: "Aprovada" },
	];

function ApprovalStatusBadge({ status }: { status: MinuteApprovalStatus }) {
	return (
		<Badge variant={status === "aprovada" ? "default" : "secondary"}>
			{status === "aprovada" ? "Aprovada" : "Pendente"}
		</Badge>
	);
}

const columns: DataTableColumn<MinuteListItem>[] = [
	{
		header: "Reunião",
		cell: (row) => (
			<Link
				to="/meetings/$meetingId"
				params={{ meetingId: row.meetingId }}
				className="block min-w-0"
			>
				<span className="block truncate underline">{row.meetingTitle}</span>
			</Link>
		),
	},
	{
		header: "Modelo",
		className: "hidden md:table-cell",
		cell: (row) =>
			row.templateName ?? <span className="text-muted-foreground">Padrão</span>,
	},
	{
		header: "Aprovação",
		cell: (row) => <ApprovalStatusBadge status={row.approvalStatus} />,
	},
	{
		header: "Versão",
		align: "center" as const,
		cell: (row) =>
			row.currentVersion ?? <span className="text-muted-foreground">—</span>,
	},
	{
		header: "Atualizada em",
		className: "hidden sm:table-cell",
		cell: (row) => new Date(row.updatedAt).toLocaleDateString("pt-BR"),
	},
];

export default function MinutesPage() {
	const [search, setSearch] = useState("");
	const [approvalStatus, setApprovalStatus] = useState<
		MinuteApprovalStatus | ""
	>("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
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
		data: minutesPage,
		isLoading,
		isError,
		refetch,
	} = useMinutes({
		search: activeSearch || undefined,
		approvalStatus: approvalStatus || undefined,
		page,
		pageSize,
	});

	return (
		<PageShell>
			<PageHeader
				eyebrow="Conselho de classe"
				title="Atas"
				description="Todas as atas das reuniões, com status de aprovação e versões geradas."
				actions={
					<Link to="/minutes/templates">
						<Button variant="secondary">Modelos de ata</Button>
					</Link>
				}
			/>
			<PageToolbar className="sm:justify-between">
				<SearchInput
					className="sm:max-w-sm"
					value={search}
					onChange={setSearch}
					placeholder="Buscar por reunião"
					ariaLabel="Buscar por reunião"
				/>
				<Select
					value={approvalStatus}
					onValueChange={(value) => {
						setApprovalStatus(value as MinuteApprovalStatus | "");
						setPage(1);
					}}
				>
					<SelectTrigger aria-label="Status de aprovação" className="w-48">
						<SelectValue placeholder="Todos os status" />
					</SelectTrigger>
					<SelectContent>
						{APPROVAL_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</PageToolbar>
			<DataTable
				columns={columns}
				rows={minutesPage?.data ?? []}
				getRowKey={(row) => row.id}
				total={minutesPage?.total ?? 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={(size) => {
					setPageSize(size);
					setPage(1);
				}}
				onRowClick={(row) =>
					navigate({
						to: "/minutes/$meetingId",
						params: { meetingId: row.meetingId },
					})
				}
				isLoading={isLoading}
				isError={isError}
				onRetry={() => void refetch()}
				ariaLabel="Tabela de atas"
				emptyTitle="Nenhuma ata encontrada"
				emptyDescription="Ajuste a busca ou gere a ata de uma reunião."
			/>
		</PageShell>
	);
}
