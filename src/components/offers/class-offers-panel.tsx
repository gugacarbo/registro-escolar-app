import { BookOpenIcon } from "lucide-react";

import { CreateOfferDialog } from "#/components/offers/create-offer-dialog";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { PageSection } from "#/components/ui/page";
import { Skeleton } from "#/components/ui/skeleton";
import { useOffers } from "#/hooks/offers/use-offers";

export function ClassOffersPanel({
	classId,
	turmaName,
}: {
	classId: string;
	turmaName?: string;
}) {
	const { data: offers, isLoading } = useOffers(classId);

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
			{isLoading ? (
				<div className="space-y-2">
					<Skeleton className="h-16 w-full" />
				</div>
			) : offers && offers.length === 0 ? (
				<Empty className="border-0">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<BookOpenIcon />
						</EmptyMedia>
						<EmptyTitle>Nenhum componente ofertado</EmptyTitle>
						<EmptyDescription>
							Oferte um componente para montar a grade desta turma.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<ul aria-label="Componentes ofertados" className="grid gap-2">
					{offers?.map((offer) => (
						<li
							key={offer.id}
							className="rounded-lg border bg-background/40 p-3"
						>
							<p className="font-medium">
								{offer.component?.name ?? offer.componentId}
							</p>
							<p className="text-sm text-muted-foreground">
								{offer.professors && offer.professors.length > 0
									? `Professores: ${offer.professors
											.map(
												(professor) =>
													professor.staff?.name ?? professor.staffId,
											)
											.join(", ")}`
									: "Sem professor atribuído"}
							</p>
						</li>
					))}
				</ul>
			)}
		</PageSection>
	);
}
