import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DetailPage, FormPage, ListPage } from "./page-recipes";

describe("ListPage", () => {
	it("renderiza title, actions, toolbar e children", () => {
		render(
			<ListPage
				title="Usuários"
				eyebrow="Administração"
				description="Contas de acesso."
				actions={<button type="button">Novo usuário</button>}
				toolbar={<input placeholder="Buscar" />}
			>
				<div>Conteúdo da lista</div>
			</ListPage>,
		);
		expect(
			screen.getByRole("heading", { level: 1, name: "Usuários" }),
		).toBeInTheDocument();
		expect(screen.getByText("Administração")).toBeInTheDocument();
		expect(screen.getByText("Contas de acesso.")).toBeInTheDocument();
		expect(screen.getByText("Novo usuário")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Buscar")).toBeInTheDocument();
		expect(screen.getByText("Conteúdo da lista")).toBeInTheDocument();
	});

	it("tem exatamente um h1", () => {
		render(
			<ListPage title="Título único">
				<div>ok</div>
			</ListPage>,
		);
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
	});
});

describe("DetailPage", () => {
	it("renderiza voltar, título, actions e conteúdo", () => {
		render(
			<DetailPage
				title="Dados do componente"
				backTo={{ to: "/components", label: "Voltar para a lista" }}
				actions={<button type="button">Editar</button>}
			>
				<div>Formulário do componente</div>
			</DetailPage>,
		);
		expect(
			screen.getByRole("heading", { level: 1, name: "Dados do componente" }),
		).toBeInTheDocument();
		expect(screen.getByText("Voltar para a lista")).toBeInTheDocument();
		expect(screen.getByText("Editar")).toBeInTheDocument();
		expect(screen.getByText("Formulário do componente")).toBeInTheDocument();
	});

	it("isLoading mostra LoadingFeedback e não o conteúdo", () => {
		render(
			<DetailPage title="Detalhe" isLoading>
				<div>Conteúdo oculto</div>
			</DetailPage>,
		);
		expect(screen.getByText("Carregando...")).toBeInTheDocument();
		expect(screen.queryByText("Conteúdo oculto")).not.toBeInTheDocument();
	});

	it("error mostra ErrorFeedback e não o conteúdo", () => {
		render(
			<DetailPage title="Detalhe" error="Falha ao carregar componente">
				<div>Conteúdo oculto</div>
			</DetailPage>,
		);
		expect(
			screen.getByText("Falha ao carregar componente"),
		).toBeInTheDocument();
		expect(screen.queryByText("Conteúdo oculto")).not.toBeInTheDocument();
	});

	it("tem exatamente um h1", () => {
		render(
			<DetailPage title="Detalhe">
				<div>ok</div>
			</DetailPage>,
		);
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
	});
});

describe("FormPage", () => {
	it("aplica largura narrow e renderiza slots", () => {
		const { container } = render(
			<FormPage
				title="Matricular estudante"
				description="Selecione o estudante."
				backTo={{ to: "/classes", label: "Voltar" }}
			>
				<div>Formulário</div>
			</FormPage>,
		);
		const shell = container.firstElementChild as HTMLElement;
		expect(shell.className).toContain("max-w-2xl");
		expect(shell.className).toContain("mx-auto");
		expect(
			screen.getByRole("heading", { level: 1, name: "Matricular estudante" }),
		).toBeInTheDocument();
		expect(screen.getByText("Selecione o estudante.")).toBeInTheDocument();
		expect(screen.getByText("Formulário")).toBeInTheDocument();
	});

	it("tem exatamente um h1", () => {
		render(
			<FormPage title="Formulário">
				<div>ok</div>
			</FormPage>,
		);
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
	});
});
