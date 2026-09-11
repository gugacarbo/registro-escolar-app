import type { TestUser } from "./types";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3001";

export type { TestUser };

export function generateTestUser(): TestUser {
	const id = crypto.randomUUID();
	return {
		name: `E2E User ${id.slice(0, 8)}`,
		email: `e2e-${id}@example.com`,
		password: `E2ePass@${id.slice(0, 8)}!1A`,
	};
}

export async function signUpTestUser(user = generateTestUser(), inviteToken?: string) {
	const response = await fetch(`${baseURL}/api/auth/sign-up/email`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Origin: baseURL,
		},
		body: JSON.stringify({
			email: user.email,
			password: user.password,
			name: user.name,
			...(inviteToken ? { token: inviteToken } : {}),
		}),
	});

	if (!response.ok) {
		throw new Error(`Failed to sign up test user: ${response.status}`);
	}

	return { user };
}

export async function signInTestUser(user: TestUser): Promise<Response> {
	return fetch(`${baseURL}/api/auth/sign-in/email`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Origin: baseURL,
		},
		body: JSON.stringify({ email: user.email, password: user.password }),
	});
}

export async function getSessionCookie(user: TestUser): Promise<string> {
	const response = await signInTestUser(user);
	if (!response.ok) {
		throw new Error(`Failed to sign in via API: ${response.status}`);
	}
	const cookies = response.headers.get("set-cookie") ?? "";
	if (!cookies) {
		throw new Error("No set-cookie header returned from sign-in");
	}
	return cookies;
}
