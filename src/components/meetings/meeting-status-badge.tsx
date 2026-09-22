import { Badge } from "#/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
	open: "Aberta",
	closed: "Encerrada",
};

const STATUS_VARIANTS: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	open: "default",
	closed: "outline",
};

export function MeetingStatusBadge({ status }: { status: string }) {
	return (
		<Badge variant={STATUS_VARIANTS[status] ?? "outline"}>
			{STATUS_LABELS[status] ?? status}
		</Badge>
	);
}
