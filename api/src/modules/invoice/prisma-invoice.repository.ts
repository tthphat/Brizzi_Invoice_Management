import { PrismaClient, Currency } from "../../generated/prisma/client.js";
import type { InvoiceRepository } from "./invoice.repository.js";
import type { CreateInvoiceData } from "./invoice.type.js";
import { toInvoice } from "./invoice.mapper.js";
import type { Invoice } from "./invoice.type.js";

export class PrismaInvoiceRepository implements InvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateInvoiceData): Promise<Invoice> {
    const invoice = await this.prisma.invoice.create({
      include: {
        items: true,
      },
      data: {
        invoiceNumber: data.invoiceNumber,

        customerName: data.customerName,
        customerEmail: data.customerEmail ?? null,
        customerAddress: data.customerAddress ?? null,
        customerTaxCode: data.customerTaxCode ?? null,

        currency: data.currency as Currency,

        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        total: data.total,

        items: {
          create: data.items,
        },
      },
    });

    return toInvoice(invoice);
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        items: true,
      },
    });

    if (!invoice) {
      return null;
    }

    return toInvoice(invoice);
  }
}
