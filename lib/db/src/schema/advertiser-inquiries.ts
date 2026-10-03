import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const advertiserInquiries = pgTable("advertiser_inquiries", {
  id: serial("id").primaryKey(),
  brandName: text("brand_name").notNull(),
  contactName: text("contact_name").notNull().default(""),
  contactEmail: text("contact_email").notNull(),
  website: text("website").notNull().default(""),
  message: text("message").notNull(),
  placements: text("placements").array().notNull().default([]),
  consent: boolean("consent").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertAdvertiserInquirySchema = createInsertSchema(advertiserInquiries).omit({ id: true, createdAt: true });
export type InsertAdvertiserInquiry = z.infer<typeof insertAdvertiserInquirySchema>;
export type AdvertiserInquiry = typeof advertiserInquiries.$inferSelect;