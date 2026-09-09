import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useComponents } from "#/hooks/components/use-components";

export const Route = createFileRoute("/_app/components/")({
	component: ComponentsPage,
});

function ComponentsPage() {
	const [search, setSearch] = useState("");
	const { data: components, isLoading } = useComponents(search);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Componentes</h1>
				<Link to="/components/new">
					<Button>Novo componente</Button>
				</Link>
			</div>
			<Input
				placeholder="Buscar por nome"
				value={search}
				onChange={(event) => setSearch(event.target.value)}
			/>
			{isLoading && <p>Carregando...</p>}
			{components && components.length === 0 && (
				<p>Nenhum componente encontrado.</p>
			)}
			{components && components.length > 0 && (
				<ul className="space-y-2">
					{components.map((component) => (
						<li key={component.id} className="rounded border p-2">
							{component.name}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
