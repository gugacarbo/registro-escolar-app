import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useStaff } from "#/hooks/staff/use-staff";

export const Route = createFileRoute("/_app/staff/")({
	component: StaffPage,
});

function StaffPage() {
	const [search, setSearch] = useState("");
	const { data: staff, isLoading } = useStaff(search);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Servidores</h1>
				<Link to="/staff/new">
					<Button>Novo servidor</Button>
				</Link>
			</div>
			<Input
				placeholder="Buscar por nome ou email"
				value={search}
				onChange={(event) => setSearch(event.target.value)}
			/>
			{isLoading && <p>Carregando...</p>}
			{staff && (
				<ul className="space-y-2">
					{staff.map((member) => (
						<li key={member.id} className="rounded border p-2">
							{member.name}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
