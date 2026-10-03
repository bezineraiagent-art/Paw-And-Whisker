import { integer, pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

// Anonymous operational counters only. Never raw IPs, questions or pet profiles.
export const usageCounters = pgTable("usage_counters", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, table => [index("usage_counters_expiry_idx").on(table.expiresAt)]);