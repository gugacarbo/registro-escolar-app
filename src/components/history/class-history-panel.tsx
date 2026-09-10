import { useState } from "react";

import { HistoryEventList } from "#/components/history/history-event-list";
import {
	HistorySearchForm,
	type HistorySearchValues,
} from "#/components/history/history-search-form";
import { Badge } from "#/components/ui/badge";
import { useClassHistory } from "#/hooks/history/use-history";

export function ClassHistoryPanel({ classId }: { classId: string }) {
	const [filters, setFilters] = useState<{
		q?: string;
		componenteId?: string;
		periodo?: string;
		estudanteId?: string;
	}>({});
	const { data, isLoading, isError } = useClassHistory(classId, filters);

	function handleSearch(values: HistorySearchValues) {
		setFilters({
			q: values.q || undefined,
			componenteId: values.componenteId || undefined,
			periodo: values.periodo || undefined,
		});
	}

	return (
		<section className="space-y-3" aria-labelledby="class-history-title">
			<h2 id="class-history-title" className="text-lg font-semibold">
				Histórico da turma
			</h2>
			<HistorySearchForm onSubmit={handleSearch} hideStudentFilters />
			{data && (
				<div className="flex flex-wrap gap-2">
					<Badge variant="secondary">{data.estudantes.length} estudantes</Badge>
					<Badge variant="secondary">{data.reunioes.length} reuniões</Badge>
					<Badge variant="secondary">{data.eventos.length} eventos</Badge>
				</div>
			)}
			<HistoryEventList
				events={data?.eventos ?? []}
				isLoading={isLoading}
				isError={isError}
				emptyMessage="Nenhum evento no histórico da turma."
			/>
		</section>
	);
}
