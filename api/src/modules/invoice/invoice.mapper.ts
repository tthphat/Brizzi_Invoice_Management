import type { Invoice, InvoiceItem } from "../../generated/prisma/client.js";
import type { Invoice as InvoiceDTO } from "./invoice.type.js";

type PrismaInvoiceWithItems = Invoice & { items: InvoiceItem[] };

export function toInvoice(prismaInvoice: PrismaInvoiceWithItems): InvoiceDTO {
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
    deletedAt: prismaInvoice.deletedAt ? new Date(prismaInvoice.deletedAt) : null,
    createdAt: new Date(prismaInvoice.createdAt),
    updatedAt: new Date(prismaInvoice.updatedAt),
    
    items:
      prismaInvoice.items?.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
        amount: item.amount.toNumber(),
        taxRate: item.taxRate.toNumber(),
        taxAmount: item.taxAmount.toNumber(),
      })) ?? [],
  };
}
