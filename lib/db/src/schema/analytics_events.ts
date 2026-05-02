import { index, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull().default(""),
    eventName: text("event_name").notNull(),
    source: text("source"),
    variant: text("variant"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index("analytics_events_session_idx").on(table.sessionId),
    eventCreatedIdx: index("analytics_events_event_created_idx").on(
      table.eventName,
      table.createdAt,
    ),
    variantIdx: index("analytics_events_variant_idx").on(table.variant),
  }),
);

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents, {
  eventName: z.string().min(1).max(64),
  source: z.string().max(64).nullish(),
  variant: z.string().max(32).nullish(),
  sessionId: z.string().max(128).optional(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
}).omit({
  id: true,
  createdAt: true,
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
