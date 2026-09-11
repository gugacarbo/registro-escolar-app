import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";
import type { HistoryEvent } from "#/lib/history/types";

const EVENT_LABELS: Record<string, string> = {
	matricula: "Matrícula",
	encerramento_matricula: "Encerramento",
	reuniao: "Reunião",
	registro: "Registro",
	relato_geral: "Relato geral",
	status_reuniao: "Status na reunião",
};

function formatDate(value: string) {
	return new Date(value).toLocaleString("pt-BR", {
		dateStyle: "short",
		timeStyle: "short",
	});
}

export function HistoryEventList({
	events,
	isLoading,
	isError,
	emptyMessage = "Nenhum evento no histórico.",
	turmaNome,
}: {
	events: HistoryEvent[];
	isLoading: boolean;
	isError: boolean;
	emptyMessage?: string;
	/** Quando informado, oculta o campo "Turma" redundante nos eventos. */
	turmaNome?: string;
}) {
	if (isLoading) {
		return (
			<div className="space-y-2" aria-busy="true">
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
			</div>
		);
	}
	if (isError) {
		return (
			<p className="text-sm text-muted-foreground">
				Não foi possível carregar o histórico.
			</p>
		);
	}
	if (events.length === 0) {
		return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
	}
	return (
		<ol className="space-y-2">
			{events.map((event) => (
				<li key={`${event.id}-${event.data}`} className="rounded border p-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<Badge variant="outline">
							{EVENT_LABELS[event.tipo] ?? event.tipo}
						</Badge>
						<time
							className="text-xs text-muted-foreground"
							dateTime={event.data}
						>
							{formatDate(event.data)}
						</time>
					</div>
					{event.texto && <p className="mt-2">{event.texto}</p>}
					<div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
						{event.studentName && (
							<span>Estudante: {event.studentName}</span>
						)}
						{event.turmaNome && event.turmaNome !== turmaNome && (
							<span>Turma: {event.turmaNome}</span>
						)}
						{event.reuniaoTitulo && <span>Reunião: {event.reuniaoTitulo}</span>}
						{event.interno && <span>Registro interno</span>}
					</div>
				</li>
			))}
		</ol>
	);
}
