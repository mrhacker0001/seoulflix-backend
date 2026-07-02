// Server-side source of truth for subscription prices.
// NEVER trust a price sent from the frontend - always look it up here by tierId.
const TIERS = {
  monthly: {
    id: "monthly",
    title: "1 Oylik",
    amount: 25999, // so'm
    durationDays: 30,
  },
  quarterly: {
    id: "quarterly",
    title: "3 Oylik",
    amount: 69999,
    durationDays: 90,
  },
  yearly: {
    id: "yearly",
    title: "1 Yillik",
    amount: 259999,
    durationDays: 365,
  },
};

function getTier(tierId) {
  return TIERS[tierId] || null;
}

module.exports = { TIERS, getTier };
