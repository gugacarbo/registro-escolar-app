import { relations, sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { classes } from "./classes-schema";
import { staff } from "./staff-schema";

export const components = sqliteTable(
	"components",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("components_name_idx").on(table.name),
		uniqueIndex("components_name_uidx").on(table.name),
	],
);

export const classOffers = sqliteTable(
	"class_offers",
	{
		id: text("id").primaryKey(),
		classId: text("class_id")
			.notNull()
			.references(() => classes.id, { onDelete: "no action" }),
		componentId: text("component_id")
			.notNull()
			.references(() => components.id, { onDelete: "no action" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("class_offers_class_component_uidx").on(
			table.classId,
			table.componentId,
		),
		index("class_offers_class_idx").on(table.classId),
		index("class_offers_component_idx").on(table.componentId),
	],
);

export const offerProfessors = sqliteTable(
	"offer_professors",
	{
		id: text("id").primaryKey(),
		offerId: text("offer_id")
			.notNull()
			.references(() => classOffers.id, { onDelete: "no action" }),
		staffId: text("staff_id")
			.notNull()
			.references(() => staff.id, { onDelete: "no action" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("offer_professors_offer_staff_uidx").on(
			table.offerId,
			table.staffId,
		),
		index("offer_professors_offer_idx").on(table.offerId),
		index("offer_professors_staff_idx").on(table.staffId),
	],
);

export const classOfferRelations = relations(classOffers, ({ one, many }) => ({
	class: one(classes, {
		fields: [classOffers.classId],
		references: [classes.id],
	}),
	component: one(components, {
		fields: [classOffers.componentId],
		references: [components.id],
	}),
	professors: many(offerProfessors),
}));

export const offerProfessorRelations = relations(
	offerProfessors,
	({ one }) => ({
		offer: one(classOffers, {
			fields: [offerProfessors.offerId],
			references: [classOffers.id],
		}),
		staff: one(staff, {
			fields: [offerProfessors.staffId],
			references: [staff.id],
		}),
	}),
);
