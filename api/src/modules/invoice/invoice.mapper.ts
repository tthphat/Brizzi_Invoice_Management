import type { Invoice as PrismaInvoice } from "../../generated/prisma/client.js";
import type { Invoice } from "./invoice.type.js";

export function toInvoice(prismaInvoice: PrismaInvoice): Invoice {
  return {
    id: prismaInvoice.id,
    invoiceNumber: prismaInvoice.invoiceNumber,
    status: prismaInvoice.status,
    customerName: prismaInvoice.customerName,
    customerEmail: prismaInvoice.customerEmail ?? null,
    customerAddress: prismaInvoice.customerAddress ?? null,
    customerTaxCode: prismaInvoice.customerTaxCode ?? null,
    currency: prismaInvoice.currency,
    subtotal: prismaInvoice.subtotal.toNumber(),
    taxAmount: prismaInvoice.taxAmount.toNumber(),
    total: prismaInvoice.total.toNumber(),
    replacedInvoiceId: prismaInvoice.replacedInvoiceId ?? null,
    issuedAt: prismaInvoice.issuedAt ? new Date(prismaInvoice.issuedAt) : null,
    canceledAt: prismaInvoice.canceledAt
      ? new Date(prismaInvoice.canceledAt)
      : null,
    cancelReason: prismaInvoice.cancelReason ?? null,
    createdAt: new Date(prismaInvoice.createdAt),
    updatedAt: new Date(prismaInvoice.updatedAt),
  };
}
