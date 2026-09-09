import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MinuteTemplateForm } from "./minute-template-form";

describe("MinuteTemplateForm", () => {
	it("submete modelo válido", async () => {
		const onSubmit = vi.fn();

		render(<MinuteTemplateForm onSubmit={onSubmit} />);

		fireEvent.change(screen.getByLabelText(/nome/i), {
			target: { value: "Modelo padrão" },
		});
		fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
		expect(onSubmit.mock.calls[0][0]).toMatchObject({
			name: "Modelo padrão",
		});
	});

	it("exibe erro quando o nome está vazio", async () => {
		const onSubmit = vi.fn();

		render(<MinuteTemplateForm onSubmit={onSubmit} />);

		fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

		expect(await screen.findByText("Nome é obrigatório")).toBeInTheDocument();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("exibe erro do servidor", () => {
		render(
			<MinuteTemplateForm onSubmit={vi.fn()} serverError="Falha ao criar" />,
		);

		expect(screen.getByText("Falha ao criar")).toBeInTheDocument();
	});
});
