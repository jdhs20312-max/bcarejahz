import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const visitorsTable = pgTable("visitors", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  ownerName: text("owner_name"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  firstVisit: timestamp("first_visit", { withTimezone: true }).notNull().defaultNow(),
  lastVisit: timestamp("last_visit", { withTimezone: true }).notNull().defaultNow(),
  visitCount: integer("visit_count").notNull().default(1),
});

export const insertVisitorSchema = createInsertSchema(visitorsTable).omit({
  id: true,
  firstVisit: true,
  lastVisit: true,
  visitCount: true,
});

export const updateVisitorSchema = z.object({
  ownerName: z.string().optional(),
});

export type InsertVisitor = z.infer<typeof insertVisitorSchema>;
export type Visitor = typeof visitorsTable.$inferSelect;
