import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Input } from "#/components/ui/input";
import { useClassStudents } from "#/hooks/enrollments/use-class-students";

export const Route = createFileRoute("/_app/classes/$id/students")({
	component: ClassStudentsPage,
	validateSearch: (search: Record<string, unknown>) => ({
		date: typeof search.date === "string" ? search.date : undefined,
	}),
});

function todayString() {
	return new Date().toISOString().slice(0, 10);
}

function ClassStudentsPage() {
	const { id } = Route.useParams();
	const search = Route.useSearch();
	const [date, setDate] = useState(search.date ?? todayString());
	const { data: rows, isLoading } = useClassStudents(id, date);

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">Estudantes da turma</h1>
			<Input
				type="date"
				value={date}
				onChange={(event) => setDate(event.target.value)}
			/>
			{isLoading && <p>Carregando...</p>}
			{rows && rows.length === 0 && <p>Nenhum vínculo ativo nesta data.</p>}
			{rows && rows.length > 0 && (
				<ul className="space-y-2">
					{rows.map(({ student, enrollment }) => (
						<li key={enrollment.id} className="rounded border p-2">
							{student.name} — {enrollment.status}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
