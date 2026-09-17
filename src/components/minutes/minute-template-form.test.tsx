import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { textDoc } from "#/lib/minutes/tiptap/serializer";
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

	it("preenche o formulário com os valores de um template existente", () => {
		render(
			<MinuteTemplateForm
				onSubmit={vi.fn()}
				defaultValues={{
					name: "Modelo de reunião",
					headerContent: textDoc("Cabeçalho") as unknown as Record<
						string,
						unknown
					>,
					bodyContent: textDoc("Conteúdo") as unknown as Record<
						string,
						unknown
					>,
					footerContent: textDoc("Rodapé") as unknown as Record<
						string,
						unknown
					>,
				}}
			/>,
		);

		expect(screen.getByLabelText(/nome/i)).toHaveValue("Modelo de reunião");
		expect(screen.getAllByText("Cabeçalho")).toHaveLength(2);
		expect(screen.getAllByText("Rodapé")).toHaveLength(2);
		expect(screen.getAllByText("Conteúdo")).toHaveLength(2);
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
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
