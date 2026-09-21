import {
	baseURL,
	addParticipant,
	createMeeting,
	createRole,
	createRoleResponse,
	createStaff,
	listRoles,
	softDeleteStaff,
} from "./fixtures/api";
import { expect, test } from "./fixtures/test";
import { gotoReady } from "./pages/navigation";

test.describe("SPEC-0003 servidores e cargos", () => {
	test("cadastra e lista servidor pela UI", async ({
		authenticatedPage: page,
	}) => {
		await gotoReady(page,"/staff");
		await page.getByRole("button", { name: "Novo servidor" }).click();
		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Novo servidor" }),
		).toBeVisible();

		const nameField = page.getByRole("textbox", { name: "Nome" });
		await nameField.click();
		await nameField.fill("Servidor E2E");
		await expect(nameField).toHaveValue("Servidor E2E");
		await page.getByRole("button", { name: "Salvar" }).click();

		await expect(page.getByRole("dialog")).not.toBeVisible();
		await expect.poll(async () => page.url()).toBe(`${baseURL}/staff`);
		await expect(page.getByText("Servidor E2E")).toBeVisible();
	});

	test("abre o detalhe do servidor ao clicar na linha", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const staff = await createStaff(apiContext, "Servidor Linha Clicável");

		await gotoReady(page,"/staff");
		const cell = page.getByRole("cell", {
			name: "Servidor Linha Clicável",
			exact: true,
		});
		await expect(cell).toBeVisible();
		await cell.click();
		await expect(page).toHaveURL(new RegExp(`/staff/${staff.id}`));
		await expect(
			page.getByRole("heading", { name: "Servidor Linha Clicável" }),
		).toBeVisible();
	});

	test("abre o detalhe do cargo ao clicar na linha", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const role = await createRole(apiContext, "Cargo Linha Clicável");

		await gotoReady(page,"/roles");
		const cell = page.getByRole("cell", { name: "Cargo Linha Clicável" });
		await expect(cell).toBeVisible();
		await cell.click();
		await expect(page).toHaveURL(new RegExp(`/roles/${role.id}`));
		await expect(
			page.getByRole("heading", { name: "Cargo Linha Clicável" }),
		).toBeVisible();
	});

	test("reutiliza servidor já cadastrado", async ({ apiContext }) => {
		const first = await createStaff(apiContext, "Servidor Duplicado");
		const duplicateResponse = await fetch(`${baseURL}/api/staff`, {
			method: "POST",
			headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
			body: JSON.stringify({ name: " Servidor Duplicado " }),
		});
		expect(duplicateResponse.status).toBe(409);
		const body = (await duplicateResponse.json()) as {
			existingStaff: { id: string };
		};
		expect(body.existingStaff.id).toBe(first.id);
	});

	test("garante cargo padrão Professor", async ({ apiContext }) => {
		const roles = await listRoles(apiContext);
		expect(roles.filter((role) => role.name === "Professor")).toHaveLength(1);
		const duplicateDefault = await createRoleResponse(apiContext, "Professor");
		expect(duplicateDefault.status).toBe(409);
	});

	test("normaliza cargo duplicado", async ({ apiContext }) => {
		const normalizedResponse = await createRoleResponse(
			apiContext,
			"Coordenacao Pedagogica",
		);
		expect(normalizedResponse.status).toBe(201);
		const normalized = (await normalizedResponse.json()) as { name: string };
		expect(normalized.name).toBe("Coordenacao Pedagogica");

		const duplicateResponse = await createRoleResponse(
			apiContext,
			"COORDENAÇÃO PEDAGÓGICA",
		);
		expect(duplicateResponse.status).toBe(409);
	});

	test("adiciona participante com cargo e exibe IDs", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const staff = await createStaff(apiContext, "Participante E2E");
		const [role] = (await listRoles(apiContext)).filter(
			(item) => item.name === "Professor",
		);
		expect(role).toBeDefined();
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Participantes",
			heldAt: "2026-05-01",
			classIds: [],
			participants: [],
		});
		const participant = await addParticipant(
			apiContext,
			meeting.id,
			staff.id,
			role.id,
		);
		expect(participant).toMatchObject({ staffId: staff.id, roleId: role.id });

		await gotoReady(page,`/meetings/${meeting.id}/participants`);
		await expect(page.getByText(`${staff.name} — Professor`)).toBeVisible();
	});

	test("rejeita cargo inexistente em participação", async ({
		apiContext,
	}) => {
		const staff = await createStaff(apiContext, "Servidor Cargo Inválido");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Cargo Inválido",
			heldAt: "2026-05-01",
			classIds: [],
			participants: [],
		});
		const response = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/participants`,
			{
				method: "POST",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ staffId: staff.id, roleId: "role-inexistente" }),
			},
		);
		expect(response.status).toBe(404);
		expect(await response.json()).toMatchObject({ error: "Cargo não encontrado" });
	});

	test("soft delete de servidor preserva participações históricas", async ({
		apiContext,
	}) => {
		const staff = await createStaff(apiContext, "Servidor Removido");
		const [role] = (await listRoles(apiContext)).filter(
			(item) => item.name === "Professor",
		);
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Remoção",
			heldAt: "2026-05-01",
			classIds: [],
			participants: [],
		});
		await addParticipant(apiContext, meeting.id, staff.id, role.id);

		const deleted = await softDeleteStaff(apiContext, staff.id);
		expect(deleted.deletedAt).not.toBeNull();

		const activeListResponse = await fetch(`${baseURL}/api/staff`, {
			headers: { Cookie: apiContext.cookies },
		});
		const activeStaff = (await activeListResponse.json()) as {
			data: Array<{ id: string }>;
		};
		expect(activeStaff.data.map((member) => member.id)).not.toContain(staff.id);

		const response = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/participants`,
			{ headers: { Cookie: apiContext.cookies } },
		);
		const participants = (await response.json()) as Array<{
			staffId: string;
			roleId: string;
		}>;
		expect(
			participants.filter(
				(participant) =>
					participant.staffId === staff.id && participant.roleId === role.id,
			),
		).toHaveLength(1);
	});
});
