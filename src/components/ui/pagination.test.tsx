// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "./pagination";

describe("Pagination", () => {
	it("expõe os controles de navegação em português", () => {
		const { container } = render(
			<Pagination aria-label="paginacao">
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious />
					</PaginationItem>
					<PaginationItem>
						<PaginationNext />
					</PaginationItem>
				</PaginationContent>
			</Pagination>,
		);

		expect(
			container.querySelector(
				'[data-slot="pagination-link"][aria-label="Página anterior"]',
			),
		).not.toBeNull();
		expect(
			container.querySelector(
				'[data-slot="pagination-link"][aria-label="Próxima página"]',
			),
		).not.toBeNull();
	});

	it("descreve o elipse em português para leitores de tela", () => {
		const { getByText } = render(<PaginationEllipsis />);

		expect(getByText("Mais páginas")).toBeInTheDocument();
	});
});
