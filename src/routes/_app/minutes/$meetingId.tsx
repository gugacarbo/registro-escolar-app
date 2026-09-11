import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircleIcon, DownloadIcon, FileTextIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "#/components/ui/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
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
import { PageHeader, PageSection, PageShell } from "#/components/ui/page";
import { Skeleton } from "#/components/ui/skeleton";
import { Textarea } from "#/components/ui/textarea";
import { useMeeting } from "#/hooks/meetings/use-meeting";
import { useApproveMinute } from "#/hooks/minutes/use-approve-minute";
import { useGenerateMinute } from "#/hooks/minutes/use-generate-minute";
import { useMinutePreview } from "#/hooks/minutes/use-minute-preview";
import { useMinuteVersions } from "#/hooks/minutes/use-minute-versions";
import type { MinuteApprovalStatus } from "#/lib/minutes/types";

export const Route = createFileRoute("/_app/minutes/$meetingId")({
	component: MinuteDetailPage,
});

type ApproveFormValues = {
	data: string;
	observacao: string;
};

type GenerateFormValues = {
	observacao: string;
};

function ApprovalStatusBadge({ status }: { status: MinuteApprovalStatus }) {
	return (
		<Badge variant={status === "aprovada" ? "default" : "secondary"}>
			{status === "aprovada" ? "Aprovada" : "Pendente"}
		</Badge>
	);
}

export default function MinuteDetailPage() {
	const { meetingId } = Route.useParams();
	const { data: meeting, isLoading: isLoadingMeeting } = useMeeting(meetingId);
	const preview = useMinutePreview(meetingId);
	const versions = useMinuteVersions(meetingId);
	const generate = useGenerateMinute(meetingId);
	const approve = useApproveMinute(meetingId);
	const [saved, setSaved] = useState(false);

	const isDraft = meeting?.status === "draft";

	const approveForm = useForm<ApproveFormValues>({
		defaultValues: { data: "", observacao: "" },
	});
	const generateForm = useForm<GenerateFormValues>({
		defaultValues: { observacao: "" },
	});

	if (isLoadingMeeting) {
		return (
			<PageShell>
				<div className="space-y-4">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-72 w-full" />
				</div>
			</PageShell>
		);
	}

	if (!meeting) {
		return (
			<PageShell>
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<AlertCircleIcon />
						</EmptyMedia>
						<EmptyTitle>Ata não encontrada</EmptyTitle>
						<EmptyDescription>
							A reunião desta ata não existe ou foi removida.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Link to="/minutes">
							<Button variant="outline">Voltar para a lista de atas</Button>
						</Link>
					</EmptyContent>
				</Empty>
			</PageShell>
		);
	}

	return (
		<PageShell>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/minutes">Atas</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{meeting.title}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<PageHeader
				eyebrow="Conselho de classe"
				title={`Ata de ${meeting.title}`}
				description={
					<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
						<ApprovalStatusBadge
							status={
								(preview.data?.approvalStatus ??
									"pendente_aprovacao") as MinuteApprovalStatus
							}
						/>
						<span className="flex items-center gap-1.5 text-muted-foreground">
							<FileTextIcon className="size-4 shrink-0 text-primary/70" />
							{versions.data?.length
								? `${versions.data.length} versão(ões) gerada(s)`
								: "Nenhuma versão emitida"}
						</span>
					</div>
				}
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<Link to="/meetings/$meetingId" params={{ meetingId }}>
							<Button variant="secondary">Ver reunião</Button>
						</Link>
						<Link to="/minutes">
							<Button variant="outline">Voltar para a lista</Button>
						</Link>
					</div>
				}
			/>

			{isDraft && (
				<p className="text-sm text-muted-foreground">
					Reunião em rascunho — inicie a reunião para gerar a versão oficial.
				</p>
			)}

			<PageSection
				title="Prévia da ata"
				description="Conteúdo renderizado a partir dos registros, participantes e relatos da reunião."
				actions={
					<span className="text-sm text-muted-foreground">
						{preview.data?.templateId
							? "Modelo personalizado"
							: "Modelo padrão"}
					</span>
				}
			>
				{preview.isLoading && <Skeleton className="h-48 w-full" />}
				{preview.error && (
					<p role="alert" className="text-sm text-destructive">
						{preview.error.message || "Falha ao carregar prévia da ata"}
					</p>
				)}
				{preview.data && (
					<pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground">
						{preview.data.content}
					</pre>
				)}
			</PageSection>

			<PageSection
				title="Gerar nova versão"
				description="Cada geração cria uma versão imutável com PDF; versões anteriores permanecem disponíveis."
			>
				<Form {...generateForm}>
					<FormNative
						className="space-y-3"
						onSubmit={async () => {
							setSaved(false);
							const values = generateForm.getValues();
							await generate.mutateAsync({
								observacao: values.observacao || undefined,
							});
							generateForm.reset();
						}}
					>
						<FormField
							control={generateForm.control}
							name="observacao"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Observação da versão</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											placeholder="Motivo da emissão ou ajuste realizado"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormSubmit disabled={generate.isPending || isDraft}>
							{generate.isPending ? "Gerando..." : "Gerar nova versão"}
						</FormSubmit>
					</FormNative>
				</Form>
				{generate.error && (
					<p role="alert" className="text-sm text-destructive">
						{generate.error.message || "Falha ao gerar ata"}
					</p>
				)}
				{generate.data && (
					<p role="status" className="text-sm font-medium text-primary">
						Versão {generate.data.version} gerada em{" "}
						{new Date(generate.data.createdAt).toLocaleString("pt-BR")}.
					</p>
				)}
			</PageSection>

			<PageSection
				title="Aprovar ata"
				description="Registre a data e uma observação ao aprovar a versão atual."
			>
				<Form {...approveForm}>
					<FormNative
						className="space-y-3"
						onSubmit={() => {
							setSaved(false);
							const values = approveForm.getValues();
							approve.mutate(
								{
									data: values.data || undefined,
									observacao: values.observacao || undefined,
								},
								{
									onSuccess: () => setSaved(true),
								},
							);
						}}
					>
						<FormField
							control={approveForm.control}
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
							control={approveForm.control}
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
				{saved && (
					<p role="status" className="text-sm text-muted-foreground">
						Ata aprovada
					</p>
				)}
				{approve.error && (
					<p role="alert" className="text-sm text-destructive">
						{approve.error.message || "Falha ao aprovar ata"}
					</p>
				)}
			</PageSection>

			<PageSection
				title="Versões"
				description="Histórico imutável das versões geradas e seus PDFs."
			>
				{versions.isLoading && <Skeleton className="h-24 w-full" />}
				{versions.error && (
					<p role="alert" className="text-sm text-destructive">
						{versions.error.message || "Falha ao carregar versões da ata"}
					</p>
				)}
				{versions.data && versions.data.length === 0 && (
					<p className="text-sm text-muted-foreground">
						Nenhuma versão gerada.
					</p>
				)}
				{versions.data && versions.data.length > 0 && (
					<ul className="divide-y rounded-lg border">
						{versions.data.map((version) => (
							<li
								key={version.id}
								className="flex items-center justify-between gap-2 p-3 text-sm"
							>
								<div className="flex min-w-0 items-center gap-2">
									<span className="font-medium">Versão {version.version}</span>
									{version.isCurrent && (
										<Badge variant="default" className="text-xs">
											Atual
										</Badge>
									)}
									<span className="text-xs text-muted-foreground">
										{new Date(version.createdAt).toLocaleString("pt-BR")}
									</span>
								</div>
								{version.hasPdf && (
									<a
										className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
										href={`/api/meetings/${meetingId}/minutes/versions/${version.version}/pdf`}
										target="_blank"
										rel="noreferrer"
									>
										<DownloadIcon className="size-3.5" />
										Baixar PDF
									</a>
								)}
							</li>
						))}
					</ul>
				)}
			</PageSection>
		</PageShell>
	);
}
