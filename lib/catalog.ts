export const checkoutCatalog = {
  aura_pro_annual: {
    id: "aura_pro_annual",
    name: "Aura Pro",
    description: "Annual access to Aura Pro",
    amount: 14900,
    currency: "usd",
  },
} as const;

export type CheckoutProductId = keyof typeof checkoutCatalog;
