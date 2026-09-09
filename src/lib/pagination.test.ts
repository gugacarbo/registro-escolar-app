import { describe, expect, it } from "vitest";

import { parsePageParams } from "./pagination";

describe("parsePageParams", () => {
	it("aplica defaults page 1 e pageSize 10", () => {
		expect(parsePageParams(new URLSearchParams())).toMatchObject({
			page: 1,
			pageSize: 10,
			limit: 10,
			offset: 0,
			search: undefined,
		});
	});

	it("normaliza search e ignora page inválida", () => {
		const params = parsePageParams(
			new URLSearchParams({ search: "  João  ", page: "0" }),
		);
		expect(params).toMatchObject({ search: "João", page: 1, pageSize: 10 });
		expect(params.offset).toBe(0);
	});

	it("calcula offset da página e limita pageSize em 100", () => {
		const params = parsePageParams(
			new URLSearchParams({ page: "2", pageSize: "999" }),
		);
		expect(params).toMatchObject({
			page: 2,
			pageSize: 100,
			limit: 100,
			offset: 100,
		});
	});

	it("mapeia limit/offset legados para page e pageSize", () => {
		const params = parsePageParams(
			new URLSearchParams({ limit: "10", offset: "10" }),
		);
		expect(params).toMatchObject({
			page: 2,
			pageSize: 10,
			limit: 10,
			offset: 10,
		});
	});

	it("aplica defaults com limit/offset inválidos", () => {
		const params = parsePageParams(
			new URLSearchParams({ limit: "0", offset: "-3" }),
		);
		expect(params).toMatchObject({
			page: 1,
			pageSize: 10,
			limit: 10,
			offset: 0,
		});
	});
});
