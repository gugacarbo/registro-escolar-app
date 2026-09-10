import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import type { OfferFormValues } from "#/components/offers/offer-form";
import { OfferForm } from "#/components/offers/offer-form";
import { PageShell } from "#/components/ui/page";
import { useCreateOffer } from "#/hooks/offers/use-create-offer";
import { useOffers } from "#/hooks/offers/use-offers";

export const Route = createFileRoute("/_app/classes/$id/offers")({
	component: ClassOffersPage,
});

function ClassOffersPage() {
	const { id } = Route.useParams();
	const createOffer = useCreateOffer();
	const { data: offers, isLoading } = useOffers(id);
	const [serverError, setServerError] = useState<string | null>(null);

	async function handleSubmit(values: OfferFormValues) {
		setServerError(null);
		try {
			await createOffer.mutateAsync({
				turmaId: id,
				componenteId: values.componenteId,
				professorIds: values.professorIds,
			});
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	return (
		<PageShell>
			<h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[2rem]">
				Ofertas da turma
			</h1>
			<OfferForm
				onSubmit={handleSubmit}
				serverError={serverError}
				defaultValues={{ turmaId: id }}
			/>
			<h2 className="font-display text-xl font-semibold tracking-tight">
				Componentes ofertados
			</h2>
			{isLoading && <p>Carregando...</p>}
			{offers && offers.length === 0 && (
				<p>Nenhum componente ofertado nesta turma.</p>
			)}
			{offers && offers.length > 0 && (
				<ul className="space-y-2">
					{offers.map((offer) => (
						<li key={offer.id} className="rounded border p-2">
							{offer.component?.name ?? offer.componentId}
							{offer.professors && offer.professors.length > 0 && (
								<span className="text-muted-foreground">
									{" — "}
									{offer.professors
										.map(
											(professor) => professor.staff?.name ?? professor.staffId,
										)
										.join(", ")}
								</span>
							)}
						</li>
					))}
				</ul>
			)}
		</PageShell>
	);
}
