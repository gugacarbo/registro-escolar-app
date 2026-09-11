import { and, eq, like, or, sql } from "drizzle-orm";

import type { DB } from "#/db";
import { account, session, user } from "#/db/schema";

import type { UserRole } from "./schema";
import type { ListUsersOptions } from "./types";

function buildUserWhere(search?: string) {
	const term = search?.trim();
	if (!term) {
		return undefined;
	}
	return and(
		or(
			like(user.name, sql`'%' || ${term} || '%'`),
			like(user.email, sql`'%' || ${term} || '%'`),
		),
	);
}

export async function listUsers(db: DB, options: ListUsersOptions = {}) {
	const { limit = 10, offset = 0, search } = options;

	return db.query.user.findMany({
		where: buildUserWhere(search),
		limit,
		offset,
		orderBy: (user, { desc }) => [desc(user.createdAt)],
	});
}

export async function countUsers(
	db: DB,
	options: Pick<ListUsersOptions, "search"> = {},
) {
	return db.$count(user, buildUserWhere(options.search));
}

export async function findUserById(db: DB, id: string) {
	return db.query.user.findFirst({
		where: eq(user.id, id),
	});
}

export async function updateUserRole(db: DB, id: string, role: UserRole) {
	return db.update(user).set({ role }).where(eq(user.id, id)).returning().get();
}

export async function deleteUserWithCascade(db: DB, id: string) {
	// D1 não expõe .transaction(): deletes sequenciais, com FK cascade como
	// rede de segurança (mesma convenção dos demais repositórios).
	await db.delete(session).where(eq(session.userId, id));
	await db.delete(account).where(eq(account.userId, id));
	await db.delete(user).where(eq(user.id, id));
}
