import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Leads ingested via POST /api/webhooks/leads and read by GET /api/leads.
 * Extended fields cover the Nexus CRM UI (status + event enquiry details).
 * Unmapped payload keys remain in `raw` for forward compatibility.
 */
export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  designation: text("designation"),
  sector: text("sector"),
  source: text("source"),
  referenceNumber: text("reference_number"),
  linkedin: text("linkedin"),
  status: text("status").notNull().default("live"),
  market: text("market"),
  eventType: text("event_type"),
  yearOfEvent: text("year_of_event"),
  fullEventDate: text("full_event_date"),
  eventDateFlexible: text("event_date_flexible"),
  requestedEventTimes: text("requested_event_times"),
  groupSize: text("group_size"),
  budget: text("budget"),
  bestTimeToCall: text("best_time_to_call"),
  howHeard: text("how_heard"),
  enquiryDate: text("enquiry_date"),
  raw: text("raw"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
