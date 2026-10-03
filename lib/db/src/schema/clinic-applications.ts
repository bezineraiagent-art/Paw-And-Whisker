import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clinicApplications = pgTable("clinic_applications", {
  id: serial("id").primaryKey(),
  clinicName: text("clinic_name").notNull(),
  contactName: text("contact_name").notNull().default(""),
  contactEmail: text("contact_email").notNull(),
  city: text("city").notNull(),
  website: text("website").notNull().default(""),
  message: text("message").notNull(),
  intent: text("intent").notNull().default("claim"),
  consent: boolean("consent").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertClinicApplicationSchema = createInsertSchema(clinicApplications).omit({ id: true, createdAt: true });
export type InsertClinicApplication = z.infer<typeof insertClinicApplicationSchema>;
export type ClinicApplication = typeof clinicApplications.$inferSelect;