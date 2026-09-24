import { useState } from "react";

import { DataTable } from "#/components/data-table";
import { CreateOfferDialog } from "#/components/offers/create-offer-dialog";
import { Button } from "#/components/ui/button";
import { PageSection } from "#/components/ui/page";
import { useOffers } from "#/hooks/offers/use-offers";
import type { OfferWithRelations } from "#/lib/offers/types";

function paginate<T>(rows: T[], page: number, pageSize: number): T[] {
	const start = (page - 1) * pageSize;
	return rows.slice(start, start + pageSize);
}

const offerColumns = [
	{
		header: "Componente",
		cell: (offer: OfferWithRelations) => (
			<span className="font-medium">
				{offer.component?.name ?? offer.componentId}
			</span>
		),
	},
	{
		header: "Professores",
		align: "right" as const,
		cell: (offer: OfferWithRelations) =>
			offer.professors && offer.professors.length > 0 ? (
				offer.professors
					.map((professor) => professor.staff?.name ?? professor.staffId)
					.join(", ")
			) : (
				<span className="text-muted-foreground">Sem professor atribuído</span>
			),
	},
];

export function ClassOffersPanel({
	classId,
	turmaName,
}: {
	classId: string;
	turmaName?: string;
}) {
	const [offersPage, setOffersPage] = useState(1);
	const [offersPageSize, setOffersPageSize] = useState(10);
	const { data: offers, isLoading, isError, error } = useOffers(classId);

	const rows = offers ?? [];

	return (
		<PageSection
			title="Componentes ofertados"
			description="Componentes cursados pelos estudantes desta turma."
			actions={
				<CreateOfferDialog
					classId={classId}
					turmaName={turmaName}
					trigger={<Button>Nova oferta</Button>}
				/>
			}
		>
			<DataTable
				columns={offerColumns}
				rows={paginate(rows, offersPage, offersPageSize)}
				getRowKey={(offer) => offer.id}
				total={rows.length}
				page={offersPage}
				pageSize={offersPageSize}
				onPageChange={setOffersPage}
				onPageSizeChange={(size) => {
					setOffersPageSize(size);
					setOffersPage(1);
				}}
				isLoading={isLoading}
				isError={isError}
				errorMessage={
					error instanceof Error
						? error.message
						: "Falha ao carregar ofertas da turma"
				}
				ariaLabel="Componentes ofertados"
				emptyTitle="Nenhum componente ofertado."
				emptyDescription="Oferte um componente para montar a grade desta turma."
			/>
		</PageSection>
	);
}
