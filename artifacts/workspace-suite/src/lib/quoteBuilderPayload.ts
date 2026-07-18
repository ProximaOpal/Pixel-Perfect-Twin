/**
 * Canonical QuoteBuilder webhook body — must match the production contract
 * n8n expects on every "Build Proposal" press:
 *
 * {
 *   vesselType, eventType, source, eventDate, guestCount,
 *   embarkation, departure, returnTime, disembarkation,
 *   menuType, repeatClient, totalCost, selectedUpgrades,
 *   financials: { baseCost, contingency, marginAmount, costToClient, vat, grandTotal, upgradeTotal },
 *   lead: { id, name, email, phone, designation, company, referenceNumber }
 * }
 */
import type { BuiltQuote, QuoteFormSnapshot } from '@/lib/quoteDraftStore';
import { calcFinancials } from '@/lib/quoteFinance';

export type QuoteBuilderLead = {
  id: number;
  name: string;
  email: string;
  phone: string;
  designation: string;
  company: string;
  referenceNumber: string;
};

export type QuoteBuilderWebhookPayload = {
  vesselType: string[];
  eventType: string;
  source: string;
  eventDate: string;
  guestCount: string;
  embarkation: string;
  departure: string;
  returnTime: string;
  disembarkation: string;
  menuType: string[];
  repeatClient: boolean;
  totalCost: string;
  selectedUpgrades: string[];
  financials: {
    baseCost: number;
    contingency: number;
    marginAmount: number;
    costToClient: number;
    vat: number;
    grandTotal: number;
    upgradeTotal: number;
  };
  lead: QuoteBuilderLead;
};

function asString(v: unknown, fallback = ''): string {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim();
  return s === '—' ? '' : s;
}

/** Build the exact body the QuoteBuilder webhook receives. */
export function buildQuoteBuilderPayload(quote: BuiltQuote): QuoteBuilderWebhookPayload {
  const form: QuoteFormSnapshot = quote.form;
  const f = calcFinancials(form);

  // totalCost as a decimal string (matches live n8n samples like "4395.00")
  const totalCost =
    form.totalCost?.trim() ||
    f.baseCost.toFixed(2);

  const lead: QuoteBuilderLead = {
    id: typeof quote.leadId === 'number' ? quote.leadId : 0,
    name: asString(quote.leadName),
    email: asString(quote.leadEmail),
    phone: asString(quote.leadPhone),
    designation: asString(quote.leadDesignation),
    company: asString(quote.leadCompany),
    referenceNumber: asString(quote.referenceNumber),
  };

  return {
    vesselType: Array.isArray(form.vesselType) ? [...form.vesselType] : [],
    eventType: asString(form.eventType),
    source: asString(form.source),
    eventDate: asString(form.eventDate),
    guestCount: asString(form.guestCount),
    embarkation: asString(form.embarkation),
    departure: asString(form.departure),
    returnTime: asString(form.returnTime),
    disembarkation: asString(form.disembarkation),
    menuType: Array.isArray(form.menuType) ? [...form.menuType] : [],
    repeatClient: Boolean(form.repeatClient),
    totalCost,
    // Labels — not stargtm ids (e.g. "Drink Tokens", "Unlimited Drinks")
    selectedUpgrades: Array.isArray(form.selectedUpgrades) ? [...form.selectedUpgrades] : [],
    financials: {
      baseCost: f.baseCost,
      contingency: f.contingency,
      marginAmount: f.marginAmount,
      costToClient: f.costToClient,
      vat: f.vat,
      grandTotal: f.grandTotal,
      upgradeTotal: f.upgradeTotal,
    },
    lead,
  };
}
