// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Table, TableHead, TableHeader } from "./table";

describe("Table", () => {
	it("marca os cabeçalhos como colunas", () => {
		render(
			<Table data-testid="tabela">
				<TableHeader>
					<tr>
						<TableHead>Nome</TableHead>
						<TableHead>Idade</TableHead>
					</tr>
				</TableHeader>
			</Table>,
		);

		const table = screen.getByTestId("tabela");
		const headers = table.querySelectorAll("th");
		expect(headers).toHaveLength(2);
		for (const header of headers) {
			expect(header).toHaveAttribute("scope", "col");
		}
	});
});
