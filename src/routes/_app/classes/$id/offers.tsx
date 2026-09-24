import { createFileRoute } from "@tanstack/react-router";

import { ClassOffersPanel } from "#/components/offers/class-offers-panel";
import { PageHeader, PageShell } from "#/components/ui/page";
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
				title="Ofertas da turma"
			/>
			<ClassOffersPanel classId={id} turmaName={history?.turma.name} />
		</PageShell>
	);
}
