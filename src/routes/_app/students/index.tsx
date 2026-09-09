import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { CreateStudentDialog } from "#/components/students/create-student-dialog";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useStudents } from "#/hooks/students/use-students";

export const Route = createFileRoute("/_app/students/")({
	component: StudentsPage,
});

function StudentsPage() {
	const [search, setSearch] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const { data: students, isLoading } = useStudents(search);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Alunos</h1>
				<div className="flex gap-2">
					<Button onClick={() => setDialogOpen(true)}>Novo aluno</Button>
					<Link to="/students/import">
						<Button variant="secondary">Importar alunos</Button>
					</Link>
				</div>
			</div>
			<Input
				placeholder="Buscar por nome ou documento"
				value={search}
				onChange={(event) => setSearch(event.target.value)}
			/>
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
			<CreateStudentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</div>
	);
}
