/**
 * Always write operational lead fields to localStorage first,
 * then fire-and-forget Sheets sync via n8n.
 */
import { setLeadExtras, type LeadExtras, type LeadKeyParts } from '@/lib/leadExtras';
import { syncLeadUpdate, type LeadUpdatePayload } from '@/lib/n8nSync';

export type PersistLeadInput = LeadKeyParts & {
  leadName?: string;
} & LeadExtras;

export function persistLeadUpdate(input: PersistLeadInput): LeadExtras {
  const {
    referenceNumber,
    email,
    id,
    leadName,
    assignedRep,
    vivaTag,
    packageAbbreviation,
    status,
    nextAction,
    quoteBuilt,
    quoteApproved,
    quoteVersion,
  } = input;

  const local = setLeadExtras(
    { referenceNumber, email, id },
    {
      assignedRep,
      vivaTag,
      packageAbbreviation,
      status,
      nextAction,
      quoteBuilt,
      quoteApproved,
      quoteVersion,
    },
  );

  const syncPayload: Omit<LeadUpdatePayload, 'mode'> = {
    referenceNumber,
    email,
    leadName,
  };
  if (assignedRep !== undefined) syncPayload.assignedRep = assignedRep ?? undefined;
  if (vivaTag !== undefined) syncPayload.vivaTag = vivaTag;
  if (packageAbbreviation !== undefined) syncPayload.packageAbbreviation = packageAbbreviation;
  if (status !== undefined) syncPayload.status = status;
  if (nextAction !== undefined) syncPayload.nextAction = nextAction;
  if (quoteBuilt !== undefined) syncPayload.quoteBuilt = quoteBuilt;
  if (quoteApproved !== undefined) syncPayload.quoteApproved = quoteApproved;
  if (quoteVersion !== undefined) syncPayload.quoteVersion = quoteVersion;

  void syncLeadUpdate(syncPayload);
  return local;
}
