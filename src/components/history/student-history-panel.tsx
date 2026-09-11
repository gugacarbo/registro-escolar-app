import { useState } from "react";

import { HistoryEventList } from "#/components/history/history-event-list";
import {
	HistorySearchForm,
	type HistorySearchValues,
} from "#/components/history/history-search-form";
import { PageSection } from "#/components/ui/page";
import { useStudentHistory } from "#/hooks/history/use-history";

export function StudentHistoryPanel({ studentId }: { studentId: string }) {
	const [filters, setFilters] = useState<{
		q?: string;
		turmaId?: string;
		componenteId?: string;
		periodo?: string;
	}>({});
	const { data, isLoading, isError } = useStudentHistory(studentId, filters);

	function handleSearch(values: HistorySearchValues) {
		const filters: {
			q?: string;
			turmaId?: string;
			componenteId?: string;
			periodo?: string;
		} = {};
		if (values.q) {
			filters.q = values.q;
		}
		if (values.turmaId) {
			filters.turmaId = values.turmaId;
		}
		if (values.componenteId) {
			filters.componenteId = values.componenteId;
		}
		if (values.periodo) {
			filters.periodo = values.periodo;
		}
		setFilters(filters);
	}

	return (
		<PageSection
			title="Linha do tempo"
			description="Eventos do estudante em ordem cronológica: matrículas, reuniões, registros e relatos."
		>
			<HistorySearchForm
				onSubmit={handleSearch}
				onReset={() => setFilters({})}
			/>
			<HistoryEventList
				events={data?.eventos ?? []}
				isLoading={isLoading}
				isError={isError}
				emptyMessage="Nenhum evento no histórico do estudante."
			/>
		</PageSection>
	);
}
