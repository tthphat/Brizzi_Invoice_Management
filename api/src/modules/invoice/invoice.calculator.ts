import { Decimal } from "decimal.js";

export function calculateItemAmount(
  quantity: Decimal,
  unitPrice: Decimal,
): Decimal {
  return quantity.mul(unitPrice).toDecimalPlaces(2);
}

export function calculateItemTax(
  amount: Decimal,
  taxRate: Decimal,
): Decimal {
  return amount
    .mul(taxRate)
    .div(100)
    .toDecimalPlaces(2);
}

export function calculateInvoiceTotals(
  items: {
    amount: Decimal;
    taxAmount: Decimal;
  }[],
) {
  let subtotal = new Decimal(0);
  let taxAmount = new Decimal(0);

  for (const item of items) {
    subtotal = subtotal.add(item.amount);
    taxAmount = taxAmount.add(item.taxAmount);
  }

  const total = subtotal.add(taxAmount);

  return {
    subtotal: subtotal.toDecimalPlaces(2),
    taxAmount: taxAmount.toDecimalPlaces(2),
    total: total.toDecimalPlaces(2),
  };
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const shortUuid = crypto.randomUUID().split("-")[0].toUpperCase();

  return `INV-${year}-${shortUuid}`;
}
