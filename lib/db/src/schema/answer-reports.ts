import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
export const answerReports = pgTable("answer_reports", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});