import { Badge } from "#/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
	ativa: "Ativa",
	transferida: "Transferida",
	concluida: "Concluída",
	cancelada: "Cancelada",
	encerrada: "Encerrada",
};

const STATUS_VARIANTS: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	ativa: "default",
	transferida: "secondary",
	concluida: "outline",
	cancelada: "destructive",
	encerrada: "outline",
};

export function EnrollmentStatusBadge({ status }: { status: string }) {
	return (
		<Badge variant={STATUS_VARIANTS[status] ?? "outline"}>
			{STATUS_LABELS[status] ?? status}
		</Badge>
	);
}
