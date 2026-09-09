/**
 * Resolve o Env do runtime Cloudflare.
 *
 * Em produção (worker) o TanStack Start injeta `{ env, ctx }` via
 * `src/default-entry.ts`. No dev (`vite dev` + @cloudflare/vite-plugin) o SSR
 * roda dentro do workerd e os bindings vêm de `cloudflare:workers`, não do
 * request context — por isso `context.env` chega undefined no dev e os
 * handlers quebravam com `Cannot read properties of undefined (reading 'DB')`.
 *
 * Ordem de resolução:
 * 1. `context.env` — presente nos testes e em produção;
 * 2. `cloudflare:workers` — dev local e produção no workerd.
 *
 * O import de `cloudflare:workers` é dinâmico de propósito: import estático
 * quebra no vitest (node), onde o módulo não existe.
 */
export async function getRuntimeEnv(
	context?: unknown,
): Promise<Env | undefined> {
	const fromContext =
		(context as unknown as { env?: Env } | undefined)?.env ??
		(context as unknown as { cloudflare?: { env?: Env } } | undefined)
			?.cloudflare?.env;
	if (fromContext) {
		return fromContext;
	}

	try {
		// Indireção via variável: impede o Vite/vitest de tentar resolver o
		// módulo em tempo de transform (ele só existe dentro do workerd).
		const specifier = "cloudflare:workers";
		const mod = (await import(/* @vite-ignore */ specifier)) as unknown as {
			env: Env;
		};
		return mod.env;
	} catch {
		return undefined;
	}
}

/** Retorna o binding D1 ou lança — o handler vira 500 com mensagem útil. */
export function requireD1(env: Env | undefined): D1Database {
	const db = env?.DB;
	// Só checa presença: `instanceof D1Database` quebra no dev (proxy do
	// miniflare) e D1Database pode nem existir como global no node.
	if (!db) {
		throw new Error("D1 binding not available");
	}
	return db;
}
