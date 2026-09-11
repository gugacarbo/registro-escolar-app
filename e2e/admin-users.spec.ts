import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
	createSecondaryUserContext,
	deleteAdminUser,
	listAdminUsers,
	listAdminUsersData,
	updateAdminUserRole,
} from "./fixtures/api";
import { signInTestUser } from "./fixtures/auth";
import { E2E_DB_PATH, resetDatabase } from "./fixtures/db";
import { expect, test } from "./fixtures/test";

test.describe("SPEC-0014 administração de usuários e autorização por papéis", () => {
	test("caso 1: a primeira conta vira admin permanente e as demais ficam como user", async ({
		apiContext,
	}) => {
		const me = (await listAdminUsersData(apiContext.cookies)).find(
			(u) => u.email === apiContext.user.email,
		);
		expect(me?.role).toBe("admin");
		expect(me?.isPermanentAdmin).toBe(true);

		const secondary = await createSecondaryUserContext(apiContext);
		const second = (await listAdminUsersData(apiContext.cookies)).find(
			(u) => u.email === secondary.user.email,
		);
		expect(second?.role).toBe("user");
		expect(second?.isPermanentAdmin).toBe(false);
	});

	test("caso 2: migration promove a conta de menor created_at a admin permanente", () => {
		resetDatabase();
		const sqlite = new Database(E2E_DB_PATH);
		try {
			sqlite.pragma("foreign_keys = OFF");
			sqlite.exec(`
				DROP TRIGGER IF EXISTS user_role_insert_check;
				DROP TRIGGER IF EXISTS user_role_update_check;
				DROP TRIGGER IF EXISTS user_permanent_admin_update_check;
				DROP TRIGGER IF EXISTS user_permanent_admin_delete_check;
				DROP TRIGGER IF EXISTS user_first_permanent_admin;
				DROP INDEX IF EXISTS user_role_idx;
				DROP INDEX IF EXISTS user_permanent_admin_uidx;
				ALTER TABLE user DROP COLUMN role;
				ALTER TABLE user DROP COLUMN is_permanent_admin;
			`);
			sqlite.exec(`
				INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
				VALUES
					('old-1', 'Mais Antigo', 'old1@example.com', 0, 1600000000000, 1600000000000),
					('old-2', 'Mais Novo', 'old2@example.com', 0, 1700000000000, 1700000000000);
			`);
			const migration = readFileSync(
				join(process.cwd(), "drizzle/0009_adiciona-papeis-de-acesso.sql"),
				"utf-8",
			);
			for (const statement of migration
				.split(/-->\s*statement-breakpoint/)
				.map((s) => s.trim())
				.filter(Boolean)) {
				sqlite.exec(statement);
			}

			const rows = sqlite
				.prepare(
					"SELECT id, role, is_permanent_admin FROM user ORDER BY created_at ASC",
				)
				.all() as Array<{
				id: string;
				role: string;
				is_permanent_admin: number;
			}>;
			expect(rows).toEqual([
				{ id: "old-1", role: "admin", is_permanent_admin: 1 },
				{ id: "old-2", role: "user", is_permanent_admin: 0 },
			]);
		} finally {
			sqlite.close();
		}
	});

	test("caso 3: user comum é negado na API e na área administrativa", async ({
		page,
		apiContext,
	}) => {
		const secondary = await createSecondaryUserContext(apiContext);
		const response = await listAdminUsers(secondary.cookies);
		expect(response.status).toBe(403);
		const body = (await response.json()) as {
			data?: unknown;
			error?: string;
		};
		expect(body.data).toBeUndefined();
		expect(body.error).toBeTruthy();

		await page.goto("/login");
		await page
			.getByRole("textbox", { name: "Email" })
			.fill(secondary.user.email);
		await page
			.getByRole("textbox", { name: "Senha" })
			.fill(secondary.user.password);
		await page.getByRole("button", { name: "Entrar" }).click();
		await page.waitForURL("/");
		await expect(
			page.getByRole("link", { name: "Usuários" }),
		).toHaveCount(0);

		await page.goto("/admin/users");
		await expect(
			page.getByRole("heading", { name: "Acesso negado" }),
		).toBeVisible();
		await expect(
			page.getByRole("table", { name: "Tabela de usuários" }),
		).toHaveCount(0);
	});

	test("caso 4: admin não altera o próprio papel, o permanente ou papel inválido", async ({
		apiContext,
	}) => {
		const me = (await listAdminUsersData(apiContext.cookies)).find(
			(u) => u.email === apiContext.user.email,
		);
		expect(
			(await updateAdminUserRole(apiContext.cookies, me!.id, "superuser")).status,
		).toBe(400);
		expect(
			(await updateAdminUserRole(apiContext.cookies, me!.id, "user")).status,
		).toBe(403);

		const secondary = await createSecondaryUserContext(apiContext);
		const secondaryRecord = (await listAdminUsersData(
			apiContext.cookies,
		)).find((u) => u.email === secondary.user.email);
		expect(
			(await updateAdminUserRole(
				apiContext.cookies,
				secondaryRecord!.id,
				"admin",
			)).status,
		).toBe(200);

		expect(
			(await updateAdminUserRole(secondary.cookies, me!.id, "user")).status,
		).toBe(403);

		const after = (await listAdminUsersData(apiContext.cookies)).find(
			(u) => u.id === me!.id,
		);
		expect(after?.role).toBe("admin");
		expect(after?.isPermanentAdmin).toBe(true);
	});

	test("caso 5: não se exclui a própria conta, o admin permanente nem outro admin", async ({
		apiContext,
	}) => {
		const me = (await listAdminUsersData(apiContext.cookies)).find(
			(u) => u.email === apiContext.user.email,
		);
		expect(
			(await deleteAdminUser(apiContext.cookies, me!.id)).status,
		).toBe(403);

		const secondary = await createSecondaryUserContext(apiContext);
		const secondaryRecord = (await listAdminUsersData(
			apiContext.cookies,
		)).find((u) => u.email === secondary.user.email);
		expect(
			(await updateAdminUserRole(
				apiContext.cookies,
				secondaryRecord!.id,
				"admin",
			)).status,
		).toBe(200);

		expect(
			(await deleteAdminUser(secondary.cookies, me!.id)).status,
		).toBe(403);
		expect(
			(await deleteAdminUser(apiContext.cookies, secondaryRecord!.id)).status,
		).toBe(403);

		const after = await listAdminUsersData(apiContext.cookies);
		expect(after).toHaveLength(2);
	});

	test("caso 6: excluir outro user invalida sessões e credenciais", async ({
		apiContext,
	}) => {
		const secondary = await createSecondaryUserContext(apiContext);
		const secondaryRecord = (await listAdminUsersData(
			apiContext.cookies,
		)).find((u) => u.email === secondary.user.email);

		expect(
			(await deleteAdminUser(apiContext.cookies, secondaryRecord!.id)).status,
		).toBe(200);

		expect((await listAdminUsers(secondary.cookies)).status).toBe(401);
		const signIn = await signInTestUser(secondary.user);
		expect(signIn.ok).toBe(false);
	});

	test("admin promove e exclui contas pela tela /admin/users", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const secondary = await createSecondaryUserContext(apiContext);
		await page.goto("/admin/users");

		const selfRow = page.getByRole("row", {
			name: new RegExp(apiContext.user.email),
		});
		await expect(selfRow).toBeVisible();
		await expect(
			selfRow.getByRole("button", { name: /Tornar user/ }),
		).toBeDisabled();
		await expect(
			selfRow.getByRole("button", { name: /Excluir/ }),
		).toBeDisabled();
		await expect(page.getByText("Admin permanente")).toBeVisible();

		const row = page.getByRole("row", {
			name: new RegExp(secondary.user.email),
		});
		await expect(row).toBeVisible();
		await row.getByRole("button", { name: /Tornar admin/ }).click();
		await expect(page.getByText("Usuário promovido a admin")).toBeVisible();
		await expect.poll(async () => {
			const users = await listAdminUsersData(apiContext.cookies);
			return users.find((u) => u.email === secondary.user.email)?.role;
		}).toBe("admin");

		const promotedRow = page.getByRole("row", {
			name: new RegExp(secondary.user.email),
		});
		await expect(
			promotedRow.getByRole("button", { name: /Tornar user/ }),
		).toBeVisible();
		await expect(
			promotedRow.getByRole("button", { name: /Excluir/ }),
		).toBeDisabled();

		await promotedRow.getByRole("button", { name: /Tornar user/ }).click();
		await expect(page.getByText("Usuário rebaixado para user")).toBeVisible();
		await expect.poll(async () => {
			const users = await listAdminUsersData(apiContext.cookies);
			return users.find((u) => u.email === secondary.user.email)?.role;
		}).toBe("user");

		await promotedRow.getByRole("button", { name: /Excluir/ }).click();
		const dialog = page.getByRole("alertdialog");
		await expect(dialog).toBeVisible();
		await dialog.getByRole("button", { name: "Excluir", exact: true }).click();
		await expect(page.getByText("Usuário excluído")).toBeVisible();
		await expect(
			page.getByRole("row", { name: new RegExp(secondary.user.email) }),
		).toHaveCount(0);
	});
});
