import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useStudents } from "#/hooks/students/use-students";

export const Route = createFileRoute("/app/students/")({
	component: StudentsPage,
});

function StudentsPage() {
	const { data: students, isLoading } = useStudents();

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Alunos</h1>
				<div className="flex gap-2">
					<Link to="/app/students/new">
						<Button>Novo aluno</Button>
					</Link>
					<Link to="/app/students/import">
						<Button variant="secondary">Importar alunos</Button>
					</Link>
				</div>
			</div>
			<Input placeholder="Buscar por nome ou documento" />
			{isLoading && <p>Carregando...</p>}
			{students && (
				<ul className="space-y-2">
					{students.map((student) => (
						<li key={student.id} className="rounded border p-2">
							{student.name}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
