import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { MeetingStatusBadge } from "#/components/meetings/meeting-status-badge";
import { TransitionButtons } from "#/components/meetings/transition-buttons";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { useMeetings } from "#/hooks/meetings/use-meetings";
import type { MeetingStatus } from "#/lib/meetings/schema";

export const Route = createFileRoute("/_app/meetings/")({
	component: MeetingsPage,
});

const STATUS_OPTIONS: Array<{ value: MeetingStatus; label: string }> = [
	{ value: "draft", label: "Rascunho" },
	{ value: "in_progress", label: "Em andamento" },
	{ value: "finished", label: "Finalizada" },
	{ value: "reopened", label: "Reaberta" },
];

function MeetingsPage() {
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<MeetingStatus | "">("");
	const { data: meetings, isLoading } = useMeetings({
		search: search || undefined,
		status: status || undefined,
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Reuniões</h1>
				<Link to="/meetings/new">
					<Button>Nova reunião</Button>
				</Link>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<Input
					className="max-w-xs"
					placeholder="Buscar por nome"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
				/>
				<Select
					value={status}
					onValueChange={(value) => setStatus(value as MeetingStatus | "")}
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
			</div>
			{isLoading && <p>Carregando...</p>}
			{meetings && meetings.length === 0 && <p>Nenhuma reunião encontrada.</p>}
			{meetings && meetings.length > 0 && (
				<ul className="space-y-2">
					{meetings.map((meeting) => (
						<li key={meeting.id} className="rounded border p-2">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									<MeetingStatusBadge status={meeting.status} />
									<Link
										to="/meetings/$meetingId"
										params={{ meetingId: meeting.id }}
										className="underline"
									>
										{meeting.title}
									</Link>
								</div>
								<TransitionButtons
									meetingId={meeting.id}
									status={meeting.status}
								/>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
