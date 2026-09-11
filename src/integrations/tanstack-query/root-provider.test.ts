import { describe, expect, it } from "vitest";

import { createQueryClient } from "./root-provider";

describe("createQueryClient", () => {
	it("desabilita retry global de queries", () => {
		const queryClient = createQueryClient();

		expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
	});
});
