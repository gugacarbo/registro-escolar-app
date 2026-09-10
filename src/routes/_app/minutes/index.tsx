import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { EntitySelect } from "#/components/ui/entity-select";
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
import { Textarea } from "#/components/ui/textarea";
import { fetchMeetingsPage } from "#/hooks/entity-fetchers";
import { useMeeting } from "#/hooks/meetings/use-meeting";
import { useApproveMinute } from "#/hooks/minutes/use-approve-minute";
import { useGenerateMinute } from "#/hooks/minutes/use-generate-minute";
import { useMinutePreview } from "#/hooks/minutes/use-minute-preview";
import { useMinuteTemplates } from "#/hooks/minutes/use-minute-templates";
import { useMinuteVersions } from "#/hooks/minutes/use-minute-versions";
import { useAsyncOptions } from "#/hooks/use-async-options";

export const Route = createFileRoute("/_app/minutes/")({
	component: MinutesPage,
});

type ApproveFormValues = {
	data: string;
	observacao: string;
};

function MinutesPage() {
	const [meetingId, setMeetingId] = useState<string>("");
	const [meetingSearch, setMeetingSearch] = useState("");
	const { data: meetingsResult, isLoading: isLoadingMeetings } =
		useAsyncOptions({
			queryKey: ["minutes-page", "meetings"],
			search: meetingSearch,
			fetchPage: fetchMeetingsPage,
			select: (meeting) => ({ id: meeting.id, name: meeting.title }),
		});
	const meetings = meetingsResult?.options;
	const { data: templates } = useMinuteTemplates();
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
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Atas</h1>
				<div className="flex gap-2">
					<Link to="/minutes/templates">
						<Button variant="secondary">Modelos de ata</Button>
					</Link>
					{meetingId && (
						<Link to="/meetings/$meetingId" params={{ meetingId }}>
							<Button variant="secondary">Ver reunião</Button>
						</Link>
					)}
				</div>
			</div>

			<div className="max-w-xs">
				<EntitySelect
					label="Reunião"
					placeholder="Selecione uma reunião"
					value={meetingId}
					onChange={setMeetingId}
					options={[
						...(meetings ?? []),
						...(meetingId && !(meetings ?? []).some((m) => m.id === meetingId)
							? [{ id: meetingId, name: selectedMeeting?.title ?? meetingId }]
							: []),
					]}
					isLoading={isLoadingMeetings}
					total={meetingsResult?.total ?? 0}
					loadedAll={meetingsResult?.loadedAll ?? true}
					search={meetingSearch}
					onSearchChange={setMeetingSearch}
				/>
			</div>

			{isLoadingMeetings && <p>Carregando reuniões...</p>}

			{!meetingId && !isLoadingMeetings && (
				<p>Selecione uma reunião para ver a ata.</p>
			)}

			{meetingId && (
				<>
					<div className="flex flex-wrap items-center gap-2">
						{preview.data && (
							<>
								<span className="text-sm font-medium">Aprovação:</span>
								<Badge
									variant={
										preview.data.approvalStatus === "aprovada"
											? "default"
											: "secondary"
									}
								>
									{preview.data.approvalStatus}
								</Badge>
							</>
						)}
						{selectedMeeting?.templateId &&
							templates?.find((t) => t.id === selectedMeeting.templateId) && (
								<span className="text-sm text-muted-foreground">
									Modelo:{" "}
									{
										templates.find((t) => t.id === selectedMeeting?.templateId)
											?.name
									}
								</span>
							)}
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
						<h2 className="text-lg font-semibold">Aprovar ata</h2>
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
						<h2 className="text-lg font-semibold">Versões</h2>
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
				</>
			)}
		</div>
	);
}
