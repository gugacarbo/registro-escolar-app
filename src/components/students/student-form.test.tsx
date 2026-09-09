import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StudentForm } from "./student-form";

describe("StudentForm", () => {
	it("exibe erro de validação quando o nome está vazio", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(<StudentForm onSubmit={onSubmit} />);

		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(await screen.findByText("Nome é obrigatório")).toBeVisible();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("envia o formulário com dados válidos", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(<StudentForm onSubmit={onSubmit} />);

		await user.type(screen.getByLabelText("Nome *"), "João Silva");
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ name: "João Silva" }),
			undefined,
		);
	});

	it("exibe erro de validação para email inválido", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(<StudentForm onSubmit={onSubmit} />);

		await user.type(screen.getByLabelText("Nome *"), "João Silva");
		await user.type(screen.getByLabelText("Email"), "nao-email");
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(await screen.findByText("Email inválido")).toBeVisible();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("exibe erro vindo do servidor", async () => {
		render(<StudentForm onSubmit={vi.fn()} serverError="Falha ao salvar" />);

		expect(await screen.findByText("Falha ao salvar")).toBeVisible();
	});
});
