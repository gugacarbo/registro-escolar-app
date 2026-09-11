import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EnrollmentStatusBadge } from "./enrollment-status-badge";

describe("EnrollmentStatusBadge", () => {
	it("renderiza todos os status conhecidos", () => {
		const cases = [
			["ativa", "Ativa"],
			["transferida", "Transferida"],
			["concluida", "Concluída"],
			["cancelada", "Cancelada"],
			["encerrada", "Encerrada"],
		] as const;
		for (const [status, label] of cases) {
			const { unmount } = render(<EnrollmentStatusBadge status={status} />);
			expect(screen.getByText(label)).toBeInTheDocument();
			unmount();
		}
	});

	it("usa fallback para status desconhecido", () => {
		render(<EnrollmentStatusBadge status="custom" />);
		expect(screen.getByText("custom")).toBeInTheDocument();
	});
});
