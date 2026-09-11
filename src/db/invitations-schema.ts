import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema";

export const invitation = sqliteTable(
	"invitation",
	{
		id: text("id").primaryKey(),
		email: text("email").notNull(),
		invitedById: text("invited_by_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		token: text("token").notNull().unique(),
		status: text("status", {
			enum: ["pending", "accepted", "expired", "revoked"],
		})
			.notNull()
			.default("pending"),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		index("invitation_token_idx").on(table.token),
		index("invitation_email_idx").on(table.email),
		index("invitation_invited_by_id_idx").on(table.invitedById),
		index("invitation_status_idx").on(table.status),
	],
);

export const invitationRelations = relations(invitation, ({ one }) => ({
	invitedBy: one(user, {
		fields: [invitation.invitedById],
		references: [user.id],
	}),
}));
