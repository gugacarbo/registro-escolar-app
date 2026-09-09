import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
	it("merge classes simples", () => {
		expect(cn("a", "b")).toBe("a b");
	});

	it("remove duplicatas do tailwind", () => {
		expect(cn("px-2", "px-4")).toBe("px-4");
	});

	it("ignora valores falsy", () => {
		expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
	});

	it("aceita arrays e objetos condicionais", () => {
		expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
	});
});
