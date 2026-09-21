import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { MinuteEditableContentJson } from "#/lib/minutes/types";

import { MinuteContentEditor } from "./minute-content-editor";

const initialContent: MinuteEditableContentJson = {
	presetId: "preset-1",
	presetName: "Preset Conselho",
	headerContent: JSON.stringify({
		type: "doc",
		content: [
			{ type: "paragraph", content: [{ type: "text", text: "Cabeçalho" }] },
		],
	}),
	bodyContent: JSON.stringify({
		type: "doc",
		content: [
			{ type: "paragraph", content: [{ type: "text", text: "Corpo" }] },
		],
	}),
	footerContent: JSON.stringify({
		type: "doc",
		content: [
			{ type: "paragraph", content: [{ type: "text", text: "Rodapé" }] },
		],
	}),
};

describe("MinuteContentEditor", () => {
	it("permite editar conteúdo da ata sem exibir campos do modelo", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();

		render(
			<MinuteContentEditor
				initialContent={initialContent}
				onSubmit={onSubmit}
			/>,
		);

		expect(screen.queryByLabelText("Nome *")).not.toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Cabeçalho" }),
		).toHaveTextContent("Cabeçalho");
		expect(screen.getByRole("textbox", { name: "Conteúdo" })).toHaveTextContent(
			"Corpo",
		);
		expect(screen.getByRole("textbox", { name: "Rodapé" })).toHaveTextContent(
			"Rodapé",
		);

		const bodyEditor = screen.getByRole("textbox", { name: "Conteúdo" });
		await user.click(bodyEditor);
		await user.keyboard("Corpo editado");
		await user.click(screen.getByRole("button", { name: "Salvar conteúdo" }));

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				headerContent: expect.any(Object),
				bodyContent: expect.any(Object),
				footerContent: expect.any(Object),
			}),
			undefined,
		);
	});
});
