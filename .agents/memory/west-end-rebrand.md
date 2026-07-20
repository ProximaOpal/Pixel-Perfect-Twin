---
name: West End on the Thames brand rebrand
description: Coral/void brand palette decisions for the StarGTM-Automation workspace suite, and the rule for keeping functional success colors green.
---

- Brand primary is coral `#FF5A45` (HSL ~6.8 100% 63.5%), replacing the old emerald `#2ecc71` theme. Dark "void" background is `#0A0A0C` (HSL ~240 9% 4%).
- A coral Tailwind scale (`--color-coral-50..950`) replaced the old `--color-emerald-*` scale in index.css's `@theme` block; `:root` and `.dark` background/sidebar/primary/ring vars were repointed to the void+coral pair.
- **Rule:** functional/success states (task-done checkmarks, "Proposal Ready", Settings "Saved", Timeline's completed-step checkmark) stay green even during a brand-color rebrand — only primary/branding/hover/active accents move to the new brand color. Decorative categorical palettes (avatar initials colors, ProposalDoc note-category swatches) are left alone since they're not brand accents.
- **Why:** the user explicitly required green to keep meaning "success" independent of brand color; conflating the two would break the app's at-a-glance status language.
- **How to apply:** when re-theming, grep for the old brand hex across the codebase, then triage each hit by context (is this a completion/success signal, or a primary/hover/branding accent?) rather than doing a blind find-and-replace.
