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
				<>
					<div className="flex flex-wrap gap-2">
						<Badge key="students" variant="secondary">
							{data.estudantes.length} estudantes
						</Badge>
						<Badge key="meetings" variant="secondary">
							{data.reunioes.length} reuniões
						</Badge>
						<Badge key="events" variant="secondary">
							{data.eventos.length} eventos
						</Badge>
					</div>
					<section className="space-y-2">
						<h3 className="text-base font-semibold">Vínculos</h3>
						<ul className="space-y-2">
							{data.estudantes.map((student) => (
								<li
									key={`${student.studentId}-${student.startDate}`}
									className="rounded border p-2"
								>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<span>{student.name}</span>
										<Badge variant={student.endDate ? "outline" : "secondary"}>
											{student.endDate ? "Histórico" : "Ativo"}
										</Badge>
									</div>
									<p className="text-xs text-muted-foreground">
										Início{" "}
										{new Date(student.startDate).toLocaleDateString("pt-BR")}
										{student.endDate
											? ` — fim ${new Date(student.endDate).toLocaleDateString("pt-BR")}`
											: ""}
									</p>
								</li>
							))}
						</ul>
					</section>
				</>
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
