import { describe, expect, it } from "vitest";
import {
	ALLOWLIST,
	analyze,
	formatReport,
	getPrimitiveNames,
	hasErrors,
	type SourceFile,
	scanFile,
	shouldScan,
} from "./ui-check";

const PRIMITIVES = new Set([
	"button",
	"input",
	"select",
	"textarea",
	"dialog",
	"card",
	"badge",
	"form",
]);

function f(path: string, content: string): SourceFile {
	return { path, content };
}

describe("ui:check — inclusão de arquivos", () => {
	it("não escaneia ui/, routeTree.gen, stories e testes", () => {
		expect(shouldScan("src/components/ui/button.tsx")).toBe(false);
		expect(shouldScan("src/routeTree.gen.ts")).toBe(false);
		expect(shouldScan("src/routes/x.stories.tsx")).toBe(false);
		expect(shouldScan("src/routes/x.test.tsx")).toBe(false);
		expect(shouldScan("src/routes/x.tsx")).toBe(true);
		expect(shouldScan("src/components/students/dialog.tsx")).toBe(true);
	});
});

describe("ui:check — caso válido não marca código limpo", () => {
	it("arquivo limpo com Button primitive e sem violações", () => {
		const v = analyze(
			[
				f(
					"src/routes/_app/classes/index.tsx",
					[
						'import { Button } from "#/components/ui/button";',
						"",
						"export function Page() {",
						'  return <Button variant="outline">Salvar</Button>;',
						"}",
					].join("\n"),
				),
			],
			PRIMITIVES,
		);
		expect(v).toEqual([]);
	});
});

describe("ui:check — regras", () => {
	it("UI001: marca <button> cru em src/components/ fora de ui/", () => {
		const v = scanFile(
			f(
				"src/components/students/foo.tsx",
				'export const A = () => <button type="button">Ok</button>;',
			),
			PRIMITIVES,
		);
		expect(v).toHaveLength(1);
		expect(v[0]?.rule).toBe("UI001");
		expect(v[0]?.severity).toBe("error");
		expect(v[0]?.use).toContain("#/components/ui/button");
	});

	it("UI001: não marca em src/components/ui/ (allowlist de primitives)", () => {
		const v = scanFile(
			f("src/components/ui/button.tsx", "export const B = () => <button />;"),
			PRIMITIVES,
		);
		expect(v).toEqual([]);
	});

	it("UI002: warning para <h1> manual em rota", () => {
		const v = scanFile(
			f(
				"src/routes/_app/foo/index.tsx",
				'const x = <h1 className="text-2xl">Título</h1>;',
			),
			PRIMITIVES,
		);
		expect(v).toHaveLength(1);
		expect(v[0]?.rule).toBe("UI002");
		expect(v[0]?.severity).toBe("warning");
	});

	it("UI002: não marca <h2> ou identificadores com prefixo (h1x)", () => {
		const v = scanFile(
			f(
				"src/routes/_app/foo/index.tsx",
				"const a = <h2>ok</h2>;\nconst b = <h1x />;",
			),
			PRIMITIVES,
		);
		expect(v).toEqual([]);
	});

	it("UI003: erro para import direto de @base-ui/react fora de ui/", () => {
		const v = scanFile(
			f(
				"src/components/students/foo.tsx",
				'import { Dialog } from "@base-ui/react/dialog";',
			),
			PRIMITIVES,
		);
		expect(v).toHaveLength(1);
		expect(v[0]?.rule).toBe("UI003");
		expect(v[0]?.severity).toBe("error");
	});

	it("UI003: erro para radix-ui; não marca import de ui/ re-export", () => {
		const v1 = scanFile(
			f("src/routes/_app/foo.tsx", 'import { X } from "radix-ui";'),
			PRIMITIVES,
		);
		expect(v1).toHaveLength(1);
		expect(v1[0]?.rule).toBe("UI003");
		const v2 = scanFile(
			f(
				"src/components/ui/select.tsx",
				'import { Select } from "@base-ui/react/select";',
			),
			PRIMITIVES,
		);
		expect(v2).toEqual([]);
	});

	it("UI004: warning para hex em className; não marca linha sem className", () => {
		const v1 = scanFile(
			f(
				"src/components/students/foo.tsx",
				'const x = <div className="bg-[#ff0000] text-white" />;',
			),
			PRIMITIVES,
		);
		expect(v1).toHaveLength(1);
		expect(v1[0]?.rule).toBe("UI004");
		expect(v1[0]?.severity).toBe("warning");
		const v2 = scanFile(
			f("src/components/students/foo.tsx", 'const id = "#section-1";'),
			PRIMITIVES,
		);
		expect(v2).toEqual([]);
	});

	it("UI005: warning para valores arbitrários em rotas; não marca em components/", () => {
		const v1 = scanFile(
			f(
				"src/routes/_app/foo.tsx",
				'const x = <div className="w-[42px] gap-[8px] text-[13px]" />;',
			),
			PRIMITIVES,
		);
		expect(v1).toHaveLength(3);
		expect(v1.every((x) => x.rule === "UI005")).toBe(true);
		const v2 = scanFile(
			f(
				"src/components/students/foo.tsx",
				'const y = <div className="p-[10px]" />;',
			),
			PRIMITIVES,
		);
		// apenas UI005 é restrito a rotas — p-[10px] não gera UI001/002/003/007
		expect(v2).toEqual([]);
	});

	it("UI007: erro para <select> e <textarea> crus fora de ui/", () => {
		const v = scanFile(
			f(
				"src/routes/_app/foo.tsx",
				"const a = <select>...</select>;\nconst b = <textarea />;",
			),
			PRIMITIVES,
		);
		expect(v).toHaveLength(2);
		expect(v.every((x) => x.rule === "UI007")).toBe(true);
		expect(v.every((x) => x.severity === "error")).toBe(true);
	});

	it("UI007: não marca componentes Select/Textarea (case-sensitive)", () => {
		const v = scanFile(
			f(
				"src/routes/_app/foo.tsx",
				"const a = <Select onValueChange={f} />;\nconst b = <Textarea />;",
			),
			PRIMITIVES,
		);
		expect(v).toEqual([]);
	});

	it("UI008: erro para arquivo que duplica primitive fora de ui/", () => {
		const v = scanFile(
			f("src/components/students/button.tsx", "export const x = 1;"),
			PRIMITIVES,
		);
		expect(v).toHaveLength(1);
		expect(v[0]?.rule).toBe("UI008");
		expect(v[0]?.severity).toBe("error");
		expect(v[0]?.line).toBe(1);
	});
});

describe("ui:check — falso positivo conhecido", () => {
	it("input type=file oculto NÃO é marcado (UI007 só cobre select/textarea)", () => {
		const v = scanFile(
			f(
				"src/routes/_app/students/import.tsx",
				'<input type="file" className="hidden" />',
			),
			PRIMITIVES,
		);
		expect(v).toEqual([]);
	});
});

describe("ui:check — allowlist", () => {
	it("respeita allowlist por arquivo (UI002 de meetings council)", () => {
		const v = scanFile(
			f(
				"src/routes/_app/meetings/$meetingId/council.tsx",
				'const x = <h1 className="font-display">Título</h1>;',
			),
			PRIMITIVES,
		);
		expect(v).toEqual([]);
	});

	it("allowlist com line fixa expira se a linha mudar", () => {
		const v = scanFile(
			f(
				"src/components/meetings/edit-meeting-dialog.tsx",
				"// linha 1\n// linha 2\n<button />",
			),
			PRIMITIVES,
		);
		expect(v).toHaveLength(1);
		expect(v[0]?.rule).toBe("UI001");
	});

	it("allowlist global (*) com value restringe à exceção", () => {
		const v1 = scanFile(
			f("src/routes/_app/foo.tsx", '<h1 className="sm:text-[2rem]">x</h1>'),
			PRIMITIVES,
		);
		// <h1> cru ainda é UI002 (não há allowlist global para UI002 em rotas arbitrárias),
		// mas text-[2rem] (UI005) não deve aparecer
		expect(v1.some((x) => x.rule === "UI005")).toBe(false);
	});

	it("ALLOWLIST cobre as rotas de h1 manual conhecidas", () => {
		expect(ALLOWLIST.UI002.length).toBeGreaterThanOrEqual(5);
		expect(ALLOWLIST.UI002?.every((e) => e.reason.includes("T5"))).toBe(true);
	});
});

describe("ui:check — agregação e saída", () => {
	it("analyze agrupa, ordena e classifica exit code", () => {
		const v = analyze(
			[
				f("src/routes/_app/b.tsx", "<h1>x</h1>"),
				f("src/components/students/a.tsx", "<button />"),
			],
			PRIMITIVES,
		);
		expect(v[0]?.file).toBe("src/components/students/a.tsx");
		expect(hasErrors(v)).toBe(true);
	});

	it("formatReport ensina o caminho correto", () => {
		const report = formatReport([
			{
				rule: "UI001",
				severity: "error",
				file: "src/routes/_app/foo.tsx",
				line: 42,
				message: "botão HTML cru encontrado.",
				use: "#/components/ui/button",
			},
		]);
		expect(report).toContain("src/routes/_app/foo.tsx");
		expect(report).toContain("UI001: botão HTML cru encontrado.");
		expect(report).toContain("Use: #/components/ui/button");
		expect(report).toContain("1 erro(s), 0 warning(s)");
	});

	it("formatReport OK quando sem violações", () => {
		expect(formatReport([])).toContain("OK");
	});
});

describe("ui:check — primitives reais do repo", () => {
	it("getPrimitiveNames lê src/components/ui/ (não vazio, inclui button/select)", () => {
		const names = getPrimitiveNames();
		expect(names.size).toBeGreaterThan(50);
		expect(names.has("button")).toBe(true);
		expect(names.has("select")).toBe(true);
		expect(names.has("page")).toBe(true);
	});
});
