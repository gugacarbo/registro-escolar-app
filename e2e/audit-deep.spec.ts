import { expect, test } from "./fixtures/test";
import { baseURL } from "./fixtures/api";
import * as fs from "node:fs";

const OUT_DIR = "/tmp/audit";
if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

test.describe("Deep UI/UX Audit", () => {
	test.setTimeout(180000);
	test("Audits public auth and authenticated application flows", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});

		// 1. Audit /login (logged out state in a fresh incognito context)
		const browser = page.context().browser()!;
		const publicContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});
		const publicPage = await publicContext.newPage();

		await publicPage.goto(`${baseURL}/login`);
		await publicPage.waitForLoadState("networkidle");
		await publicPage.screenshot({ path: `${OUT_DIR}/01-login-desktop.png` });

		// Check empty submission validation
		await publicPage.getByRole("button", { name: "Entrar" }).click();
		await publicPage.waitForTimeout(400);
		await publicPage.screenshot({ path: `${OUT_DIR}/01b-login-errors.png` });

		// Check invalid credentials
		await publicPage.getByRole("textbox", { name: "Email" }).fill("inexistente@example.com");
		await publicPage.getByRole("textbox", { name: "Senha" }).fill("SenhaInvalida123!");
		await publicPage.getByRole("button", { name: "Entrar" }).click();
		await publicPage.waitForTimeout(1000);
		await publicPage.screenshot({ path: `${OUT_DIR}/01c-login-server-error.png` });

		// Mobile Login
		await publicPage.setViewportSize({ width: 390, height: 844 });
		await publicPage.waitForTimeout(300);
		await publicPage.screenshot({ path: `${OUT_DIR}/01d-login-mobile.png` });

		// Register page (cadastro por convite: cria um convite e abre com o token)
		await publicPage.setViewportSize({ width: 1440, height: 900 });
		const inviteRes = await fetch(`${baseURL}/api/invitations`, {
			method: "POST",
			headers: {
				Cookie: apiContext.cookies,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email: "audit-convite@example.com" }),
		});
		expect(inviteRes.status).toBe(201);
		const invite = (await inviteRes.json()) as { token: string };
		await publicPage.goto(`${baseURL}/register?token=${invite.token}`);
		await publicPage.waitForLoadState("networkidle");
		await publicPage.screenshot({ path: `${OUT_DIR}/02-register-desktop.png` });

		await publicPage.getByRole("button", { name: "Cadastrar" }).click();
		await publicPage.waitForTimeout(400);
		await publicPage.screenshot({ path: `${OUT_DIR}/02b-register-errors.png` });

		await publicPage.setViewportSize({ width: 390, height: 844 });
		await publicPage.waitForTimeout(300);
		await publicPage.screenshot({ path: `${OUT_DIR}/02c-register-mobile.png` });

		await publicPage.close();
		await publicContext.close();

		// 2. Seed extensive data via API so that dashboards, tables, and details are realistic
		// Create 5 students
		for (const name of [
			"Ana Clara Souza",
			"Bruno Henrique Ferreira",
			"Camila Rodrigues Lima",
			"Diego de Oliveira Santos",
			"Eduarda Beatriz Barbosa",
		]) {
			await fetch(`${baseURL}/api/students`, {
				method: "POST",
				headers: {
					Cookie: apiContext.cookies,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name }),
			});
		}

		// Create 2 Classes
		const classRes1 = await fetch(`${baseURL}/api/classes`, {
			method: "POST",
			headers: {
				Cookie: apiContext.cookies,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				nome: "3º Ano A - Ensino Médio",
				periodoLetivo: "2026/1",
				curso: "Técnico em Informática",
				serie: "3º Ano",
				turno: "matutino",
			}),
		});
		const class1 = (await classRes1.json()) as { data?: { id: string } };

		await fetch(`${baseURL}/api/classes`, {
			method: "POST",
			headers: {
				Cookie: apiContext.cookies,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				nome: "1º Ano B - Ensino Médio",
				periodoLetivo: "2026/1",
				curso: "Técnico em Administração",
				serie: "1º Ano",
				turno: "vespertino",
			}),
		});

		// Create Roles
		await fetch(`${baseURL}/api/roles`, {
			method: "POST",
			headers: {
				Cookie: apiContext.cookies,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				nome: "Professor Titular",
				descricao: "Responsável pelo componente curricular e avaliação dos discentes",
			}),
		});

		// Create Staff
		await fetch(`${baseURL}/api/staff`, {
			method: "POST",
			headers: {
				Cookie: apiContext.cookies,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				nome: "Prof. Dr. Roberto Mendes",
				email: "roberto.mendes@escola.edu.br",
				matricula: "PRF-2026-001",
				status: "ativo",
			}),
		});

		// Create Curricular Component
		await fetch(`${baseURL}/api/components`, {
			method: "POST",
			headers: {
				Cookie: apiContext.cookies,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				nome: "Desenvolvimento Web II",
				codigo: "INF-302",
				cargaHoraria: 80,
			}),
		});

		// Create Minute Template
		await fetch(`${baseURL}/api/minutes/templates`, {
			method: "POST",
			headers: {
				Cookie: apiContext.cookies,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				nome: "Modelo Ata Ordinária do 1º Trimestre",
				descricao: "Modelo padrão com pauta formatada para conselho intermediário",
				conteudo: "# ATA DE REUNIÃO DE CONSELHO DE CLASSE\n\nData: __/__/____\n\n## 1. Abertura e Expediente\n...",
			}),
		});

		// Create Meeting
		const meetingRes = await fetch(`${baseURL}/api/meetings`, {
			method: "POST",
			headers: {
				Cookie: apiContext.cookies,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				titulo: "Conselho de Classe - 1º Bimestre 2026",
				data: "2026-04-15",
				tipo: "ordinaria",
				periodoLetivo: "2026/1",
				descricao: "Avaliação do rendimento acadêmico e frequência das turmas de formação técnica",
				turmas: class1?.data?.id ? [class1.data.id] : [],
			}),
		});
		const meeting = (await meetingRes.json()) as { data?: { id: string } };

		// 3. Authenticated desktop audit of all main pages
		await page.setViewportSize({ width: 1440, height: 900 });

		// Home / Dashboard
		await page.goto(`${baseURL}/`);
		await page.waitForLoadState("networkidle");
		await page.screenshot({ path: `${OUT_DIR}/03-dashboard-desktop.png`, fullPage: true });

		// Students
		await page.goto(`${baseURL}/students`);
		await page.waitForLoadState("networkidle");
		await page.screenshot({ path: `${OUT_DIR}/04-students-list-desktop.png`, fullPage: true });

		// Open student creation dialog
		const newStudentBtn = page.getByRole("button", { name: /novo estudante/i });
		if (await newStudentBtn.isVisible()) {
			await newStudentBtn.click();
			await page.waitForTimeout(400);
			await page.screenshot({ path: `${OUT_DIR}/04b-students-dialog-open.png` });

			// Trigger validation error on empty submit inside dialog
			const submitModalBtn = page.getByRole("dialog").getByRole("button", { name: /cadastrar|salvar|adicionar/i });
			if (await submitModalBtn.isVisible()) {
				await submitModalBtn.click();
				await page.waitForTimeout(400);
				await page.screenshot({ path: `${OUT_DIR}/04c-students-dialog-error.png` });
			}
			await page.keyboard.press("Escape");
			await page.waitForTimeout(400);
		}

		// Classes
		await page.goto(`${baseURL}/classes`);
		await page.waitForLoadState("networkidle");
		await page.screenshot({ path: `${OUT_DIR}/05-classes-list-desktop.png`, fullPage: true });

		// Open class modal
		const newClassBtn = page.getByRole("button", { name: /nova turma/i });
		if (await newClassBtn.isVisible()) {
			await newClassBtn.click();
			await page.waitForTimeout(400);
			await page.screenshot({ path: `${OUT_DIR}/05b-classes-dialog-open.png` });
			await page.keyboard.press("Escape");
			await page.waitForTimeout(400);
		}

		// Staff
		await page.goto(`${baseURL}/staff`);
		await page.waitForLoadState("networkidle");
		await page.screenshot({ path: `${OUT_DIR}/06-staff-list-desktop.png`, fullPage: true });

		// Roles
		await page.goto(`${baseURL}/roles`);
		await page.waitForLoadState("networkidle");
		await page.screenshot({ path: `${OUT_DIR}/07-roles-list-desktop.png`, fullPage: true });

		// Components
		await page.goto(`${baseURL}/components`);
		await page.waitForLoadState("networkidle");
		await page.screenshot({ path: `${OUT_DIR}/08-components-list-desktop.png`, fullPage: true });

		// Meetings
		await page.goto(`${baseURL}/meetings`);
		await page.waitForLoadState("networkidle");
		await page.screenshot({ path: `${OUT_DIR}/09-meetings-list-desktop.png`, fullPage: true });

		// Meeting Detail / Council
		if (meeting?.data?.id) {
			await page.goto(`${baseURL}/meetings/${meeting.data.id}`);
			await page.waitForLoadState("networkidle");
			await page.screenshot({ path: `${OUT_DIR}/10-meeting-detail-desktop.png`, fullPage: true });

			await page.goto(`${baseURL}/meetings/${meeting.data.id}/council`);
			await page.waitForLoadState("networkidle");
			await page.screenshot({ path: `${OUT_DIR}/11-meeting-council-desktop.png`, fullPage: true });

			await page.goto(`${baseURL}/meetings/${meeting.data.id}/participants`);
			await page.waitForLoadState("networkidle");
			await page.screenshot({ path: `${OUT_DIR}/12-meeting-participants-desktop.png`, fullPage: true });
		}

		// Minutes Templates
		await page.goto(`${baseURL}/minutes/templates`);
		await page.waitForLoadState("networkidle");
		await page.screenshot({ path: `${OUT_DIR}/13-minutes-templates-desktop.png`, fullPage: true });

		// Minutes List
		await page.goto(`${baseURL}/minutes`);
		await page.waitForLoadState("networkidle");
		await page.screenshot({ path: `${OUT_DIR}/14-minutes-list-desktop.png`, fullPage: true });

		// 4. Mobile inspection (390px viewport width)
		await page.setViewportSize({ width: 390, height: 844 });

		await page.goto(`${baseURL}/`);
		await page.waitForLoadState("networkidle");
		await page.screenshot({ path: `${OUT_DIR}/m-03-dashboard-mobile.png`, fullPage: true });

		// Test mobile sidebar toggle
		const sidebarTrigger = page.locator('button[data-sidebar="trigger"], [aria-label*="sidebar" i], [aria-label*="menu" i], button:has(svg.lucide-panel-left)');
		if (await sidebarTrigger.count() > 0) {
			await sidebarTrigger.first().click();
			await page.waitForTimeout(500);
			await page.screenshot({ path: `${OUT_DIR}/m-03b-sidebar-drawer-open.png` });
			// Close drawer
			await page.keyboard.press("Escape");
			await page.waitForTimeout(400);
		}

		await page.goto(`${baseURL}/students`);
		await page.waitForLoadState("networkidle");
		await page.screenshot({ path: `${OUT_DIR}/m-04-students-mobile.png`, fullPage: true });

		await page.goto(`${baseURL}/classes`);
		await page.waitForLoadState("networkidle");
		await page.screenshot({ path: `${OUT_DIR}/m-05-classes-mobile.png`, fullPage: true });

		await page.goto(`${baseURL}/meetings`);
		await page.waitForLoadState("networkidle");
		await page.screenshot({ path: `${OUT_DIR}/m-09-meetings-mobile.png`, fullPage: true });

		if (meeting?.data?.id) {
			await page.goto(`${baseURL}/meetings/${meeting.data.id}/council`);
			await page.waitForLoadState("networkidle");
			await page.screenshot({ path: `${OUT_DIR}/m-11-council-mobile.png`, fullPage: true });
		}

		// 5. Automated deep audit of DOM elements across the application
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto(`${baseURL}/`);

		const domAudit = await page.evaluate(() => {
			const results: any = {
				unlabeledButtons: [],
				unlabeledInputs: [],
				contrastSuspicious: [],
				dialogsWithoutAria: [],
				headingHierarchy: [],
				skipToContentExists: false,
			};

			// Check skip to content
			const skipLink = document.querySelector('a[href*="#main"], a[href*="#content"], .skip-link');
			results.skipToContentExists = Boolean(skipLink);

			// Check buttons without text or aria-label
			const buttons = Array.from(document.querySelectorAll("button"));
			for (const b of buttons) {
				const text = b.innerText?.trim() || "";
				const ariaLabel = b.getAttribute("aria-label");
				const ariaLabelledBy = b.getAttribute("aria-labelledby");
				const title = b.getAttribute("title");
				if (!text && !ariaLabel && !ariaLabelledBy && !title) {
					results.unlabeledButtons.push({
						html: b.outerHTML.slice(0, 150),
						parent: b.parentElement?.tagName,
						className: b.className,
					});
				}
			}

			// Check inputs without associated label
			const inputs = Array.from(document.querySelectorAll("input, select, textarea"));
			for (const i of inputs) {
				const id = i.getAttribute("id");
				const ariaLabel = i.getAttribute("aria-label");
				const ariaLabelledBy = i.getAttribute("aria-labelledby");
				const hasLabel = id ? Boolean(document.querySelector(`label[for="${id}"]`)) : false;
				const parentLabel = Boolean(i.closest("label"));
				if (!hasLabel && !parentLabel && !ariaLabel && !ariaLabelledBy && i.getAttribute("type") !== "hidden") {
					results.unlabeledInputs.push({
						name: i.getAttribute("name"),
						id: id,
						type: i.getAttribute("type"),
						className: i.className,
					});
				}
			}

			// Headings hierarchy
			const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((h) => ({
				tag: h.tagName,
				text: h.textContent?.trim(),
			}));
			results.headingHierarchy = headings;

			return results;
		});

		fs.writeFileSync(`${OUT_DIR}/dom-audit.json`, JSON.stringify(domAudit, null, 2));
		fs.writeFileSync(`${OUT_DIR}/console-errors.json`, JSON.stringify(consoleErrors, null, 2));

		console.log("Audit complete! Saved screenshots and DOM audit report to", OUT_DIR);
	});
});
