import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogTitle } from "./dialog";

describe("Dialog", () => {
	it("expõe o controle de fechar em português", () => {
		render(
			<Dialog open>
				<DialogContent>
					<DialogTitle>Exemplo</DialogTitle>
				</DialogContent>
			</Dialog>,
		);

		expect(screen.getByRole("button", { name: "Fechar" })).toBeVisible();
	});
});
