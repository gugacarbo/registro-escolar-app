import { Badge } from "#/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
	draft: "Rascunho",
	in_progress: "Em andamento",
	finished: "Finalizada",
	reopened: "Reaberta",
};

const STATUS_VARIANTS: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	draft: "secondary",
	in_progress: "default",
	finished: "outline",
	reopened: "destructive",
};

export function MeetingStatusBadge({ status }: { status: string }) {
	return (
		<Badge variant={STATUS_VARIANTS[status] ?? "outline"}>
			{STATUS_LABELS[status] ?? status}
		</Badge>
	);
}
