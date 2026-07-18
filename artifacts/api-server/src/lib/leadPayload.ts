/**
 * Normalize inbound lead payloads from n8n / forms into DB column values.
 */
export type NormalizedLead = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  designation: string | null;
  sector: string | null;
  source: string | null;
  referenceNumber: string | null;
  linkedin: string | null;
  status: string;
  market: string | null;
  eventType: string | null;
  yearOfEvent: string | null;
  fullEventDate: string | null;
  eventDateFlexible: string | null;
  requestedEventTimes: string | null;
  groupSize: string | null;
  budget: string | null;
  bestTimeToCall: string | null;
  howHeard: string | null;
  enquiryDate: string | null;
  raw: string;
};

function str(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function normalizeStatus(value: unknown): string {
  const s = (str(value) ?? "live").toLowerCase();
  if (["live", "booked", "dead", "blacklisted"].includes(s)) return s;
  return "live";
}

export function normalizeLeadPayload(body: Record<string, unknown>): NormalizedLead | null {
  const joinedName = [str(body.firstName), str(body.lastName)]
    .filter(Boolean)
    .join(" ")
    .trim();
  const name = str(body.name) ?? str(body.fullName) ?? (joinedName || null);

  if (!name) return null;

  return {
    name,
    email: str(body.email),
    phone: str(body.phone) ?? str(body.phoneNumber),
    company: str(body.company) ?? str(body.companyName),
    designation: str(body.designation) ?? str(body.title) ?? str(body.jobRole),
    sector: str(body.sector) ?? str(body.companySector),
    source: str(body.source) ?? "n8n Webhook",
    referenceNumber: str(body.referenceNumber) ?? str(body.reference),
    linkedin: str(body.linkedin),
    status: normalizeStatus(body.status),
    market: str(body.market),
    eventType: str(body.eventType),
    yearOfEvent: str(body.yearOfEvent),
    fullEventDate: str(body.fullEventDate),
    eventDateFlexible: str(body.eventDateFlexible),
    requestedEventTimes: str(body.requestedEventTimes),
    groupSize: str(body.groupSize),
    budget: str(body.budget),
    bestTimeToCall: str(body.bestTimeToCall),
    howHeard: str(body.howHeard),
    enquiryDate: str(body.enquiryDate) ?? str(body.joined),
    raw: JSON.stringify(body),
  };
}
