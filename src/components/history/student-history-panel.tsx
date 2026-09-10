import { useState } from "react";

import { HistoryEventList } from "#/components/history/history-event-list";
import {
	HistorySearchForm,
	type HistorySearchValues,
} from "#/components/history/history-search-form";
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
		setFilters({
			q: values.q || undefined,
			turmaId: values.turmaId || undefined,
			componenteId: values.componenteId || undefined,
			periodo: values.periodo || undefined,
		});
	}

	return (
		<section className="space-y-3" aria-labelledby="student-history-title">
			<h2 id="student-history-title" className="text-lg font-semibold">
				Histórico
			</h2>
			<HistorySearchForm onSubmit={handleSearch} />
			<HistoryEventList
				events={data?.eventos ?? []}
				isLoading={isLoading}
				isError={isError}
				emptyMessage="Nenhum evento no histórico do estudante."
			/>
		</section>
	);
}
