import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vetReviewerApplications = pgTable("vet_reviewer_applications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  credentials: text("credentials").notNull(),
  registrationBody: text("registration_body").notNull(),
  registrationNumber: text("registration_number").notNull(),
  clinic: text("clinic"),
  clinicWebsite: text("clinic_website"),
  message: text("message").notNull(),
  consent: boolean("consent").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const insertVetReviewerApplicationSchema = createInsertSchema(vetReviewerApplications).omit({ id: true, createdAt: true });
export type InsertVetReviewerApplication = z.infer<typeof insertVetReviewerApplicationSchema>;
export type VetReviewerApplication = typeof vetReviewerApplications.$inferSelect;