import { PrismaClient, Currency } from "../../generated/prisma/client.js";
import type { InvoiceRepository } from "./invoice.repository.js";
import {
  INVOICE_STATUS,
  type CreateInvoiceData,
  type Invoice,
  type UpdateInvoiceData,
  type UpdateStatusType,
} from "./invoice.type.js";
import { toInvoice } from "./invoice.mapper.js";
import type { ListInvoiceRequest } from "./invoice.validation.js";

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

    if (!invoice || invoice.deletedAt) {
      return null;
    }

    return toInvoice(invoice);
  }

  async findMany(
    query: ListInvoiceRequest,
  ): Promise<{ items: Invoice[]; total: number }> {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(status ? { status } : {}),
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items: items.map(toInvoice),
      total,
    };
  }

  async updateDraft(
    invoiceNumber: string,
    data: UpdateInvoiceData,
  ): Promise<Invoice> {
    const updateData: Record<string, unknown> = {};

    if (data.customerName !== undefined)
      updateData.customerName = data.customerName;
    if (data.customerEmail !== undefined)
      updateData.customerEmail = data.customerEmail;
    if (data.customerAddress !== undefined)
      updateData.customerAddress = data.customerAddress;
    if (data.customerTaxCode !== undefined)
      updateData.customerTaxCode = data.customerTaxCode;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.taxAmount !== undefined) updateData.taxAmount = data.taxAmount;
    if (data.total !== undefined) updateData.total = data.total;
    if (data.items !== undefined) updateData.items = data.items;

    const invoice = await this.prisma.invoice.update({
      where: { invoiceNumber },
      data: updateData,
      include: {
        items: true,
      },
    });

    return toInvoice(invoice);
  }

  async updateStatus(
    invoiceNumber: string,
    data: UpdateStatusType,
  ): Promise<Invoice> {
    const invoice = await this.prisma.invoice.update({
      where: { invoiceNumber },
      data,
      include: { items: true },
    });

    return toInvoice(invoice);
  }

  async deleteInvoice(invoiceNumber: string): Promise<void> {
    await this.prisma.invoice.update({
      where: { invoiceNumber },
      data: { deletedAt: new Date() },
      include: { items: true },
    });
  }
}
