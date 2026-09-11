import { createFileRoute } from "@tanstack/react-router";

import { ClassOffersPanel } from "#/components/offers/class-offers-panel";
import { PageHeader, PageShell } from "#/components/ui/page";
import { Skeleton } from "#/components/ui/skeleton";
import { useClassHistory } from "#/hooks/history/use-history";

export const Route = createFileRoute("/_app/classes/$id/offers")({
	component: ClassOffersPage,
});

export default function ClassOffersPage() {
	const { id } = Route.useParams();
	const { data: history } = useClassHistory(id);

	return (
		<PageShell>
			<PageHeader
				eyebrow="Estrutura escolar"
				title="Ofertas da turma"
				description={
					history?.turma.name ? (
						history.turma.name
					) : (
						<Skeleton className="h-4 w-48" />
					)
				}
			/>
			<ClassOffersPanel classId={id} turmaName={history?.turma.name} />
		</PageShell>
	);
}
