export interface PartyWisePriceRule {
  partyId: string;
  partyName: string;
  price: number;
  isTaxInclusive?: boolean;
}

interface ItemPricingRegistryEntry {
  itemId: string;
  itemName?: string;
  rules: PartyWisePriceRule[];
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = "mybill_item_party_prices_";
const REGISTRY_STORAGE_KEY = "mybill_party_pricing_registry";

function normalizeString(val?: string | null): string {
  if (!val) return "";
  return val.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Retrieve all configured party-wise price rules for a given item ID or Name.
 */
export function getItemPartyPrices(itemIdOrName: string): PartyWisePriceRule[] {
  if (typeof window === "undefined" || !itemIdOrName) return [];
  const cleanKey = itemIdOrName.trim();
  if (!cleanKey) return [];

  // 1. Direct local storage key lookup
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${cleanKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  // 2. Registry lookup (supports lookup by itemId or itemName)
  try {
    const regRaw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (regRaw) {
      const registry: Record<string, ItemPricingRegistryEntry> = JSON.parse(regRaw);
      // Direct ID in registry
      if (registry[cleanKey]?.rules?.length) {
        return registry[cleanKey].rules;
      }

      // Check by item name
      const targetNorm = normalizeString(cleanKey);
      for (const entry of Object.values(registry)) {
        if (
          entry.itemName &&
          (normalizeString(entry.itemName) === targetNorm ||
            targetNorm.includes(normalizeString(entry.itemName)) ||
            normalizeString(entry.itemName).includes(targetNorm))
        ) {
          if (Array.isArray(entry.rules) && entry.rules.length > 0) {
            return entry.rules;
          }
        }
      }
    }
  } catch {}

  // 3. Scan all localStorage keys starting with STORAGE_KEY_PREFIX as fallback
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const rules: PartyWisePriceRule[] = JSON.parse(raw);
            if (Array.isArray(rules)) {
              const ruleId = key.slice(STORAGE_KEY_PREFIX.length);
              if (ruleId === cleanKey) return rules;
            }
          } catch {}
        }
      }
    }
  } catch {}

  return [];
}

/**
 * Save party-wise price rules for an item.
 */
export function setItemPartyPrices(
  itemId: string,
  rules: PartyWisePriceRule[],
  itemName?: string
): void {
  if (typeof window === "undefined" || !itemId) return;
  const cleanId = itemId.trim();
  if (!cleanId) return;

  try {
    // Save to item-specific key
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${cleanId}`, JSON.stringify(rules));

    // Also update unified registry
    let registry: Record<string, ItemPricingRegistryEntry> = {};
    try {
      const regRaw = localStorage.getItem(REGISTRY_STORAGE_KEY);
      if (regRaw) registry = JSON.parse(regRaw);
    } catch {}

    registry[cleanId] = {
      itemId: cleanId,
      itemName: itemName?.trim() || registry[cleanId]?.itemName,
      rules,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(registry));
  } catch (err) {
    console.error("Failed to save party item prices:", err);
  }
}

/**
 * Retrieve the specific price rule matching the party and item.
 */
export function getPartyItemPriceRule(
  partyIdOrName?: string | null,
  itemIdOrName?: string | null,
  fallbackPartyName?: string | null,
  fallbackItemName?: string | null
): PartyWisePriceRule | null {
  if (!partyIdOrName || !itemIdOrName) return null;

  const cleanParty = partyIdOrName.trim();
  const cleanItem = itemIdOrName.trim();
  if (!cleanParty || !cleanItem) return null;

  // Get rules for this item
  let rules = getItemPartyPrices(cleanItem);
  if ((!rules || rules.length === 0) && fallbackItemName) {
    rules = getItemPartyPrices(fallbackItemName);
  }

  // If still empty, check the registry for any matching item
  if (!rules || rules.length === 0) {
    try {
      const regRaw = localStorage.getItem(REGISTRY_STORAGE_KEY);
      if (regRaw) {
        const registry: Record<string, ItemPricingRegistryEntry> = JSON.parse(regRaw);
        for (const entry of Object.values(registry)) {
          if (
            entry.itemId === cleanItem ||
            (entry.itemName && (entry.itemName === cleanItem || entry.itemName === fallbackItemName))
          ) {
            rules = entry.rules || [];
            break;
          }
        }
      }
    } catch {}
  }

  if (!rules || rules.length === 0) return null;

  const partyNorm = normalizeString(cleanParty);
  const fallbackPartyNorm = normalizeString(fallbackPartyName);

  // Match rule by:
  // 1. Exact partyId
  // 2. Exact partyName
  // 3. Fallback partyName
  // 4. Substring / fuzzy match (e.g. "Patel Provision Store (9825012345)" matches "Patel Provision Store")
  const found = rules.find((r) => {
    if (!r) return false;
    // 1. Direct ID match
    if (r.partyId === cleanParty || (fallbackPartyName && r.partyId === fallbackPartyName)) {
      return true;
    }

    const rulePartyNorm = normalizeString(r.partyName);
    if (!rulePartyNorm) return false;

    // 2. Exact normalized name match
    if (rulePartyNorm === partyNorm) return true;
    if (fallbackPartyNorm && rulePartyNorm === fallbackPartyNorm) return true;

    // 3. Substring match (e.g., rule has phone number in parentheses)
    if (partyNorm && (rulePartyNorm.includes(partyNorm) || partyNorm.includes(rulePartyNorm))) {
      return true;
    }
    if (
      fallbackPartyNorm &&
      (rulePartyNorm.includes(fallbackPartyNorm) || fallbackPartyNorm.includes(rulePartyNorm))
    ) {
      return true;
    }

    return false;
  });

  if (found && !isNaN(Number(found.price))) {
    return found;
  }

  return null;
}

/**
 * Returns the effective sales price for a given party and item, or null if no party-specific rate is set.
 */
export function getPartyItemPrice(
  partyIdOrName?: string | null,
  itemIdOrName?: string | null,
  fallbackPartyName?: string | null,
  fallbackItemName?: string | null
): number | null {
  const rule = getPartyItemPriceRule(
    partyIdOrName,
    itemIdOrName,
    fallbackPartyName,
    fallbackItemName
  );
  return rule !== null ? Number(rule.price) : null;
}
