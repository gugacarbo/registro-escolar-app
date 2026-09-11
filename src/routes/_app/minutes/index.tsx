import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "#/components/data-table";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormNative,
	FormSubmit,
	useForm,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { PageHeader, PageShell, PageToolbar } from "#/components/ui/page";
import { SearchInput } from "#/components/ui/search-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { useMeeting } from "#/hooks/meetings/use-meeting";
import { useApproveMinute } from "#/hooks/minutes/use-approve-minute";
import { useGenerateMinute } from "#/hooks/minutes/use-generate-minute";
import { useMinutePreview } from "#/hooks/minutes/use-minute-preview";
import { useMinuteVersions } from "#/hooks/minutes/use-minute-versions";
import { useMinutes } from "#/hooks/minutes/use-minutes";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import type { MinuteApprovalStatus, MinuteListItem } from "#/lib/minutes/types";

export const Route = createFileRoute("/_app/minutes/")({
	component: MinutesPage,
});

type ApproveFormValues = {
	data: string;
	observacao: string;
};

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
	const [meetingId, setMeetingId] = useState<string>("");
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

	const preview = useMinutePreview(meetingId || undefined);
	const versions = useMinuteVersions(meetingId || undefined);
	const generate = useGenerateMinute(meetingId);
	const approve = useApproveMinute(meetingId);

	const { data: selectedMeeting } = useMeeting(meetingId || "");
	const isDraft = selectedMeeting?.status === "draft";

	const form = useForm<ApproveFormValues>({
		defaultValues: { data: "", observacao: "" },
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
				onRowClick={(row) => setMeetingId(row.meetingId)}
				isLoading={isLoading}
				isError={isError}
				onRetry={() => void refetch()}
				ariaLabel="Tabela de atas"
				emptyTitle="Nenhuma ata encontrada"
				emptyDescription="Ajuste a busca ou gere a ata de uma reunião."
			/>

			{meetingId && (
				<section className="space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h2 className="font-display text-lg font-semibold tracking-tight">
							Ata de {selectedMeeting?.title ?? meetingId}
						</h2>
						<div className="flex gap-2">
							<Link to="/meetings/$meetingId" params={{ meetingId }}>
								<Button variant="secondary">Ver reunião</Button>
							</Link>
						</div>
					</div>

					{preview.isLoading && <p>Carregando prévia...</p>}
					{preview.error && (
						<p role="alert">
							{preview.error.message || "Falha ao carregar prévia da ata"}
						</p>
					)}
					{preview.data && (
						<pre className="whitespace-pre-wrap rounded border p-3 text-sm">
							{preview.data.content}
						</pre>
					)}

					<div className="flex flex-wrap gap-2">
						<Button
							onClick={() => generate.mutate({})}
							disabled={generate.isPending || isDraft}
						>
							{generate.isPending ? "Gerando..." : "Gerar nova versão"}
						</Button>
					</div>
					{isDraft && (
						<p className="text-sm text-muted-foreground">
							Reunião em rascunho — inicie a reunião para gerar a versão
							oficial.
						</p>
					)}
					{generate.error && (
						<p role="alert">{generate.error.message || "Falha ao gerar ata"}</p>
					)}
					{generate.data && (
						<p role="status">
							Versão {generate.data.version} gerada em{" "}
							{new Date(generate.data.createdAt).toLocaleString("pt-BR")}.
						</p>
					)}

					<div className="space-y-2 rounded border p-3">
						<h3 className="font-display text-lg font-semibold tracking-tight">
							Aprovar ata
						</h3>
						<Form {...form}>
							<FormNative
								onSubmit={() => {
									const values = form.getValues();
									approve.mutate({
										data: values.data || undefined,
										observacao: values.observacao || undefined,
									});
								}}
							>
								<FormField
									control={form.control}
									name="data"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Data de aprovação</FormLabel>
											<FormControl>
												<Input type="date" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="observacao"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Observação</FormLabel>
											<FormControl>
												<Textarea {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormSubmit disabled={approve.isPending}>
									{approve.isPending ? "Aprovando..." : "Aprovar ata"}
								</FormSubmit>
							</FormNative>
						</Form>
						{approve.error && (
							<p role="alert">
								{approve.error.message || "Falha ao aprovar ata"}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<h3 className="font-display text-lg font-semibold tracking-tight">
							Versões
						</h3>
						{versions.isLoading && <p>Carregando versões...</p>}
						{versions.error && (
							<p role="alert">
								{versions.error.message || "Falha ao carregar versões da ata"}
							</p>
						)}
						{versions.data && versions.data.length === 0 && (
							<p>Nenhuma versão gerada.</p>
						)}
						{versions.data && versions.data.length > 0 && (
							<ul className="space-y-2">
								{versions.data.map(
									(version: {
										id: string;
										version: number;
										isCurrent: boolean;
										createdAt: string;
										hasPdf: boolean;
									}) => (
										<li
											key={version.id}
											className="flex items-center justify-between gap-2 rounded border p-2"
										>
											<span className="text-sm">
												Versão {version.version}
												{version.isCurrent && " (atual)"} —{" "}
												{new Date(version.createdAt).toLocaleString("pt-BR")}
											</span>
											{version.hasPdf && (
												<a
													className="text-sm underline"
													href={`/api/meetings/${meetingId}/minutes/versions/${version.version}/pdf`}
													target="_blank"
													rel="noreferrer"
												>
													Baixar PDF
												</a>
											)}
										</li>
									),
								)}
							</ul>
						)}
					</div>
				</section>
			)}
		</PageShell>
	);
}
