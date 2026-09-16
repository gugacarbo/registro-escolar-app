#!/usr/bin/env bun
/**
 * ui:check — enforcement automático das convenções visuais do design system.
 *
 * Plano: docs/plans/ai-frontend-review-fix.md (Fases 7–8).
 * Analisa src/**\/*.{ts,tsx} (exceto src/components/ui/, routeTree.gen.ts,
 * *.stories.tsx e *.test.{ts,tsx}) e reporta violações NO FORMATO DO PLANO:
 * o linter ensina o caminho correto (#/components/ui/...).
 *
 * Regras ativas:
 *   UI001 [erro]    <button> cru fora de src/components/ui/
 *   UI002 [warning] <h1> manual em rotas fora de PageHeader
 *   UI003 [erro]    import direto de @base-ui/react / radix-ui fora de ui/
 *   UI004 [warning] cor literal (hex/rgb) em className fora de ui/
 *   UI005 [warning] valores arbitrários Tailwind (w-[ h-[ p-[ gap-[ space-y-[ text-[ shadow-[ ...) em rotas
 *   UI007 [erro]    <select>/<textarea> cru fora de ui/
 *   UI008 [erro]    arquivo que duplica nome de primitive do design system
 *
 * Allowlist: violações existentes conhecidas ficam listadas abaixo com o
 * comentário "pendente migração T5". A migração (Tarefa 5) remove as entradas.
 * Entrada com `line` expira se a linha mudar — a violação volta a aparecer.
 *
 * Exit: 1 se houver erro; 0 se só warnings (prefixo WARN) ou nada.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SRC_DIR = join(process.cwd(), "src");
const UI_DIR = join(SRC_DIR, "components", "ui");

export type Severity = "error" | "warning";

export interface Violation {
	rule: string;
	severity: Severity;
	file: string; // posix, relativo à raiz do repo (ex.: src/routes/...)
	line: number;
	message: string;
	use: string;
}

export interface SourceFile {
	path: string; // posix, relativo à raiz do repo
	content: string;
}

export interface RuleDef {
	id: string;
	severity: Severity;
	message: string;
	use: string;
}

const RULE_DEFS: Record<string, RuleDef> = {
	UI001: {
		id: "UI001",
		severity: "error",
		message: "botão HTML cru encontrado.",
		use: "#/components/ui/button",
	},
	UI002: {
		id: "UI002",
		severity: "warning",
		message: "título <h1> manual em rota interna.",
		use: "#/components/ui/page (PageHeader) ou #/components/ui/page-recipes (ListPage/DetailPage/FormPage)",
	},
	UI003: {
		id: "UI003",
		severity: "error",
		message:
			"import direto de @base-ui/react ou radix-ui fora de src/components/ui/.",
		use: "#/components/ui/<primitive correspondente>",
	},
	UI004: {
		id: "UI004",
		severity: "warning",
		message: "cor literal (hex/rgb) em className fora dos tokens do tema.",
		use: "tokens de cor do tema (bg-primary, text-muted-foreground, …) definidos em src/styles.css",
	},
	UI005: {
		id: "UI005",
		severity: "warning",
		message: "valor arbitrário do Tailwind em rota.",
		use: "escalas canônicas do Tailwind ou recipes (#/components/ui/page-recipes)",
	},
	UI007: {
		id: "UI007",
		severity: "error",
		message:
			"elemento de formulário HTML cru (<select>/<textarea>) encontrado.",
		use: "#/components/ui/select, #/components/ui/textarea ou #/components/ui/native-select",
	},
	UI008: {
		id: "UI008",
		severity: "error",
		message: "arquivo duplica o nome de uma primitive do design system.",
		use: "#/components/ui/<primitive> — estenda via variant/composição",
	},
};

const FOOTER =
	"Se o caso não for atendido, documente a exceção ou crie uma variante no design system em vez de duplicar a implementação.";

// ---------------------------------------------------------------------------
// Allowlist — violações existentes conhecidas (pendente migração T5).
// file: posix relativo à raiz; line: fixa a exceção à linha (expira se mudar);
// value: restringe a exceção ao valor casado; "*" como file = exceção global.
// ---------------------------------------------------------------------------
export interface AllowEntry {
	file: string;
	line?: number;
	value?: string;
	reason: string;
}

export const ALLOWLIST: Record<string, AllowEntry[]> = {
	// UI001 — <button> cru conhecido hoje (auditoria Task 0 marcava só
	// edit-meeting-dialog.tsx:57; medição no head 66cb90d encontrou os 3 abaixo).
	UI001: [
		{
			file: "src/components/meetings/edit-meeting-dialog.tsx",
			line: 57,
			reason: "pendente migração T5",
		},
		{
			file: "src/components/enrollments/enrollment-dialog.tsx",
			line: 404,
			reason: "pendente migração T5",
		},
		{
			file: "src/routes/_app/meetings/$meetingId/council.tsx",
			line: 409,
			reason: "pendente migração T5",
		},
	],
	// UI002 — rotas com <h1> manual (warning); migração T5 substitui por
	// PageHeader/DetailPage e remove estas entradas.
	UI002: [
		{
			file: "src/routes/_app/meetings/$meetingId/council.tsx",
			reason: "pendente migração T5",
		},
		{
			file: "src/routes/_app/meetings/$meetingId/participants.tsx",
			reason: "pendente migração T5",
		},
		{
			file: "src/routes/_app/meetings/$meetingId/students.tsx",
			reason: "pendente migração T5",
		},
		{
			file: "src/routes/_app/students/import.tsx",
			reason: "pendente migração T5",
		},
	],
	// UI003/UI004/UI007/UI008 — sem violações conhecidas na auditoria; as duas
	// entradas UI007 abaixo foram descobertas pelo próprio checker no head
	// 66cb90d (não constavam da Task 0): pendente migração T5.
	// UI007:
	// - src/components/students/import-preview-table.tsx (linhas 113 e 135):
	//   <select> nativo por linha de tabela de preview (onChange controlado).
	UI007: [
		{
			file: "src/components/students/import-preview-table.tsx",
			line: 113,
			reason:
				"pendente migração T5 (violacao descoberta por este checker, nao prevista na Task 0)",
		},
		{
			file: "src/components/students/import-preview-table.tsx",
			line: 135,
			reason:
				"pendente migração T5 (violacao descoberta por este checker, nao prevista na Task 0)",
		},
	],
	// UI005 — warning; exceções pontuais para não poluir o pre-push.
	UI005: [
		{
			file: "*",
			value: "text-[2rem]",
			reason:
				"padrão canônico de tipografia de PageHeader (page.tsx); pendente migração T5",
		},
		{
			file: "src/routes/login.tsx",
			value: "shadow-[",
			reason: "pendente migração T5",
		},
		{
			file: "src/routes/register.tsx",
			value: "shadow-[",
			reason: "pendente migração T5",
		},
		{
			file: "src/routes/_app/meetings/$meetingId/council.tsx",
			value: "max-h-[90vh]",
			reason: "pendente migração T5",
		},
	],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function shouldScan(path: string): boolean {
	const p = path.replaceAll("\\", "/");
	if (!/\.(ts|tsx)$/.test(p)) return false;
	if (p === "src/routeTree.gen.ts") return false;
	if (p.startsWith("src/components/ui/")) return false;
	if (/\.stories\.tsx$/.test(p)) return false;
	if (/\.test\.(ts|tsx)$/.test(p)) return false;
	return true;
}

/** src/routes/ ou src/components/ fora de src/components/ui/ */
function isFeaturePath(posixPath: string): boolean {
	if (posixPath.startsWith("src/components/ui/")) return false;
	return (
		posixPath.startsWith("src/routes/") ||
		posixPath.startsWith("src/components/")
	);
}

function isRoutePath(posixPath: string): boolean {
	return posixPath.startsWith("src/routes/");
}

function isAllowed(
	rule: string,
	posixPath: string,
	line: number,
	matched: string,
): boolean {
	const entries = ALLOWLIST[rule] ?? [];
	for (const entry of entries) {
		if (entry.file !== "*" && entry.file !== posixPath) continue;
		if (entry.line !== undefined && entry.line !== line) continue;
		if (entry.value !== undefined && !matched.startsWith(entry.value)) continue;
		return true;
	}
	return false;
}

function violation(
	rule: string,
	file: string,
	line: number,
	matched: string,
): Violation | null {
	if (isAllowed(rule, file, line, matched)) return null;
	const def = RULE_DEFS[rule];
	return {
		rule,
		severity: def.severity,
		file,
		line,
		message: def.message,
		use: def.use,
	};
}

/** Nomes de primitives: arquivos *.tsx canônicos em src/components/ui/ */
export function getPrimitiveNames(): Set<string> {
	const names = new Set<string>();
	for (const entry of readdirSync(UI_DIR)) {
		if (!entry.endsWith(".tsx")) continue;
		if (entry.includes(".stories.") || entry.includes(".test.")) continue;
		names.add(entry.replace(/\.tsx$/, ""));
	}
	return names;
}

// ---------------------------------------------------------------------------
// Detecção (linha a linha — as regras são ocorrências simples de tag/import)
// ---------------------------------------------------------------------------

const ARBITRARY_RE =
	/\b(?:w|h|p|gap|space-y|text|shadow|min-w|min-h|max-w|max-h|size)-\[[^\]]*\]/g;
const LIB_IMPORT_RE =
	/(?:from|import)\s*["'](?:@base-ui\/react|radix-ui)(?:\/[\w./-]+)?["']/;
const RAW_COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\s*\(/;

export function scanFile(
	file: SourceFile,
	primitives: ReadonlySet<string>,
): Violation[] {
	const p = file.path.replaceAll("\\", "/");
	const out: Violation[] = [];
	const isFeature = isFeaturePath(p);
	const isRoute = isRoutePath(p);

	file.content.split(/\r?\n/).forEach((lineText, idx) => {
		const line = idx + 1;

		if (isFeature && /<button(?![a-zA-Z])/.test(lineText)) {
			const v = violation("UI001", p, line, "<button");
			if (v) out.push(v);
		}

		if (isRoute && /<h1(?![a-zA-Z])/.test(lineText)) {
			const v = violation("UI002", p, line, "<h1");
			if (v) out.push(v);
		}

		if (isFeature && LIB_IMPORT_RE.test(lineText)) {
			const matched = lineText.match(LIB_IMPORT_RE)?.[0] ?? "";
			const v = violation("UI003", p, line, matched);
			if (v) out.push(v);
		}

		if (
			!p.startsWith("src/components/ui/") &&
			/className\s*=/.test(lineText) &&
			RAW_COLOR_RE.test(lineText)
		) {
			const matched = lineText.match(RAW_COLOR_RE)?.[0] ?? "";
			const v = violation("UI004", p, line, matched);
			if (v) out.push(v);
		}

		if (isRoute) {
			for (const m of lineText.matchAll(ARBITRARY_RE)) {
				const v = violation("UI005", p, line, m[0]);
				if (v) out.push(v);
			}
		}

		if (isFeature && /<(?:select|textarea)(?![a-zA-Z])/.test(lineText)) {
			const raw = lineText.match(/<(?:select|textarea)(?![a-zA-Z])/)?.[0] ?? "";
			const v = violation("UI007", p, line, raw);
			if (v) out.push(v);
		}
	});

	// UI008 — duplicação de nome de primitive fora de ui/
	if (isFeature) {
		const base = p.split("/").pop() ?? "";
		if (base.endsWith(".tsx")) {
			const name = base.replace(/\.tsx$/, "");
			if (primitives.has(name)) {
				const v = violation("UI008", p, 1, name);
				if (v) out.push(v);
			}
		}
	}

	return out;
}

export function analyze(
	files: readonly SourceFile[],
	primitives: ReadonlySet<string>,
): Violation[] {
	return files
		.filter((f) => shouldScan(f.path))
		.flatMap((f) => scanFile(f, primitives))
		.sort(
			(a, b) =>
				a.file.localeCompare(b.file) ||
				a.line - b.line ||
				a.rule.localeCompare(b.rule),
		);
}

export function hasErrors(violations: readonly Violation[]): boolean {
	return violations.some((v) => v.severity === "error");
}

// ---------------------------------------------------------------------------
// Saída
// ---------------------------------------------------------------------------

export function formatReport(violations: readonly Violation[]): string {
	if (violations.length === 0) {
		return "ui:check: OK — nenhuma violação.";
	}
	const byFile = new Map<string, Violation[]>();
	for (const v of violations) {
		const list = byFile.get(v.file) ?? [];
		list.push(v);
		byFile.set(v.file, list);
	}
	const blocks: string[] = [];
	for (const [file, list] of byFile) {
		const items = list
			.map((v) => {
				const prefix = v.severity === "warning" ? "WARN " : "";
				return [
					`${prefix}${v.rule}: ${v.message} (linha ${v.line})`,
					`Use: ${v.use}`,
					FOOTER,
				].join("\n");
			})
			.join("\n");
		blocks.push(`${file}\n${items}`);
	}
	const errors = violations.filter((v) => v.severity === "error").length;
	const warnings = violations.length - errors;
	blocks.push(
		`ui:check: ${errors} erro(s), ${warnings} warning(s) em ${byFile.size} arquivo(s).`,
	);
	return blocks.join("\n\n");
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

function collectFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			out.push(...collectFiles(full));
		} else {
			out.push(full);
		}
	}
	return out;
}

function run(): void {
	const files = collectFiles(SRC_DIR)
		.map((abs) => abs.replaceAll(sep, "/"))
		.map((abs) => ({
			path: relative(process.cwd(), abs).replaceAll(sep, "/"),
			content: readFileSync(abs, "utf8"),
		}));
	const violations = analyze(files, getPrimitiveNames());
	console.log(formatReport(violations));
	process.exitCode = hasErrors(violations) ? 1 : 0;
}

const isMain = (import.meta as unknown as { main?: boolean }).main === true;
if (isMain) {
	run();
}
