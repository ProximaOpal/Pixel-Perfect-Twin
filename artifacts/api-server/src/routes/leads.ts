import { Router, type IRouter } from "express";
import { db, leadsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { normalizeLeadPayload } from "../lib/leadPayload";

const router: IRouter = Router();

const N8N_LEAD_FETCH_URL =
  process.env.N8N_LEAD_FETCH_URL ??
  "https://meeraworkflows.app.n8n.cloud/webhook/LeadDataFetch";

/** Ingest a single lead (n8n webhook / form submit). */
router.post("/webhooks/leads", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const normalized = normalizeLeadPayload(body);

  if (!normalized) {
    return res.status(400).json({
      error: "Payload must include a name (or firstName/lastName).",
    });
  }

  try {
    const [lead] = await db.insert(leadsTable).values(normalized).returning();
    return res.status(201).json({ lead });
  } catch (err) {
    req.log?.error(err, "Failed to insert lead from webhook");
    return res.status(500).json({ error: "Failed to store lead." });
  }
});

/** List leads for the workspace-suite UI (most recent 200). */
router.get("/leads", async (_req, res) => {
  try {
    const leads = await db
      .select()
      .from(leadsTable)
      .orderBy(desc(leadsTable.createdAt))
      .limit(200);
    return res.json({ leads });
  } catch {
    return res.status(500).json({ error: "Failed to load leads." });
  }
});

/**
 * Sync leads from the upstream n8n LeadDataFetch webhook into Postgres.
 * Idempotent on referenceNumber when present; otherwise inserts new rows.
 */
router.post("/leads/sync", async (req, res) => {
  try {
    const upstream = await fetch(N8N_LEAD_FETCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
    });

    if (!upstream.ok) {
      return res.status(502).json({
        error: `Upstream lead source responded ${upstream.status}`,
      });
    }

    const data = (await upstream.json()) as { leads?: unknown[] };
    const rows = Array.isArray(data?.leads) ? data.leads : [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const normalized = normalizeLeadPayload(
        (row ?? {}) as Record<string, unknown>,
      );
      if (!normalized) {
        skipped += 1;
        continue;
      }

      if (normalized.referenceNumber) {
        const existing = await db
          .select()
          .from(leadsTable)
          .where(eq(leadsTable.referenceNumber, normalized.referenceNumber))
          .limit(1);

        if (existing[0]) {
          await db
            .update(leadsTable)
            .set({ ...normalized, updatedAt: new Date() })
            .where(eq(leadsTable.id, existing[0].id));
          updated += 1;
          continue;
        }
      }

      await db.insert(leadsTable).values(normalized);
      inserted += 1;
    }

    const leads = await db
      .select()
      .from(leadsTable)
      .orderBy(desc(leadsTable.createdAt))
      .limit(200);

    return res.json({ inserted, updated, skipped, total: leads.length, leads });
  } catch (err) {
    req.log?.error(err, "Failed to sync leads from upstream");
    return res.status(500).json({ error: "Failed to sync leads." });
  }
});

/** Update lead status from Progress Notes / pipeline UI. */
router.patch("/leads/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status ?? "")
    .toLowerCase()
    .trim();

  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid lead id." });
  }
  if (!["live", "booked", "dead", "blacklisted"].includes(status)) {
    return res.status(400).json({
      error: "status must be live | booked | dead | blacklisted",
    });
  }

  try {
    const [lead] = await db
      .update(leadsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(leadsTable.id, id))
      .returning();

    if (!lead) return res.status(404).json({ error: "Lead not found." });
    return res.json({ lead });
  } catch (err) {
    req.log?.error(err, "Failed to update lead status");
    return res.status(500).json({ error: "Failed to update lead status." });
  }
});

export default router;
