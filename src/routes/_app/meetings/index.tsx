import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { DataTable } from "#/components/data-table";
import { CreateMeetingDialog } from "#/components/meetings/create-meeting-dialog";
import { MeetingStatusBadge } from "#/components/meetings/meeting-status-badge";
import { TransitionButtons } from "#/components/meetings/transition-buttons";
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
import { useMeetings } from "#/hooks/meetings/use-meetings";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import type { Meeting, MeetingStatus } from "#/lib/meetings/schema";

export const Route = createFileRoute("/_app/meetings/")({
	component: MeetingsPage,
});

const STATUS_OPTIONS: Array<{ value: MeetingStatus; label: string }> = [
	{ value: "draft", label: "Rascunho" },
	{ value: "in_progress", label: "Em andamento" },
	{ value: "finished", label: "Finalizada" },
	{ value: "reopened", label: "Reaberta" },
];

const columns = [
	{
		header: "Status",
		cell: (meeting: Meeting) => <MeetingStatusBadge status={meeting.status} />,
	},
	{
		header: "Título",
		cell: (meeting: Meeting) => (
			<Link
				to="/meetings/$meetingId"
				params={{ meetingId: meeting.id }}
				className="underline"
			>
				{meeting.title}
			</Link>
		),
	},
	{
		header: "Ações",
		cell: (meeting: Meeting) => (
			<div data-no-row-click>
				<TransitionButtons meetingId={meeting.id} status={meeting.status} />
			</div>
		),
	},
];

export default function MeetingsPage() {
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<MeetingStatus | "">("");
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
		data: meetingsPage,
		isLoading,
		isError,
	} = useMeetings({
		search: debouncedSearch || undefined,
		status: status || undefined,
		page,
		pageSize,
	});

	return (
		<PageShell>
			<PageHeader
				eyebrow="Conselho de classe"
				title="Reuniões"
				description="Acompanhe cada reunião do rascunho à finalização e entre diretamente na sala do conselho."
				actions={
					<Button onClick={() => setDialogOpen(true)}>Nova reunião</Button>
				}
			/>
			<PageToolbar className="sm:justify-between">
				<SearchInput
					className="sm:max-w-sm"
					value={search}
					onChange={setSearch}
					placeholder="Buscar por título"
					ariaLabel="Buscar por título"
				/>
				<Select
					value={status}
					onValueChange={(value) => {
						setStatus(value as MeetingStatus | "");
						setPage(1);
					}}
				>
					<SelectTrigger aria-label="Status" className="w-44">
						<SelectValue placeholder="Todos os status" />
					</SelectTrigger>
					<SelectContent>
						{STATUS_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</PageToolbar>
			<DataTable
				columns={columns}
				rows={meetingsPage?.data ?? []}
				getRowKey={(meeting) => meeting.id}
				total={meetingsPage?.total ?? 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={(size) => {
					setPageSize(size);
					setPage(1);
				}}
				onRowClick={(meeting) =>
					navigate({
						to: "/meetings/$meetingId",
						params: { meetingId: meeting.id },
					})
				}
				isLoading={isLoading}
				isError={isError}
				ariaLabel="Tabela de reuniões"
				emptyTitle="Nenhuma reunião encontrada"
				emptyDescription="Ajuste a busca ou crie uma nova reunião."
			/>
			<CreateMeetingDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSuccess={(meetingId) =>
					void navigate({ to: "/meetings/$meetingId", params: { meetingId } })
				}
			/>
		</PageShell>
	);
}
