import { PrismaClient, Currency, InvoiceStatus } from "../../generated/prisma/client.js";
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
import { AppError, NotFoundError } from "../../lib/app-error.js";
import { ErrorCode } from "../../lib/error-code.js";

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

  async findReplacement(
    originalInvoiceNumber: string,
  ): Promise<Invoice | null> {
    const original = await this.prisma.invoice.findUnique({
      where: { invoiceNumber: originalInvoiceNumber },
    });

    if (!original) {
      return null;
    }

    const replacement = await this.prisma.invoice.findUnique({
      where: { replacedInvoiceId: original.id },
      include: { items: true },
    });

    if (!replacement || replacement.deletedAt) {
      return null;
    }

    return toInvoice(replacement);
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

  async replaceInvoice(
    originalInvoiceNumber: string,
    newInvoiceData: CreateInvoiceData,
    cancelReason: string | null,
  ): Promise<Invoice> {
    return this.prisma.$transaction(async (tx) => {
      // Re-check inside transaction to guard against concurrent replaces
      const original = await tx.invoice.findUnique({
        where: { invoiceNumber: originalInvoiceNumber },
      });

      if (!original || original.deletedAt) {
        throw new NotFoundError(
          `Invoice with number ${originalInvoiceNumber} not found`
        );
      }

      if (original.status !== InvoiceStatus.ISSUED) {
        throw new AppError(
          "Only ISSUED invoice can be replaced",
          400,
          ErrorCode.BAD_REQUEST
        );
      }

      const existingReplacement = await tx.invoice.findUnique({
        where: { replacedInvoiceId: original.id },
      });

      if (existingReplacement && !existingReplacement.deletedAt) {
        throw new AppError(
          `Invoice already replaced by ${existingReplacement.invoiceNumber}`,
          409,
          ErrorCode.CONFLICT
        );
      }

      // Create the replacement invoice (ISSUED, linked to original)
      const created = await tx.invoice.create({
        data: {
          invoiceNumber: newInvoiceData.invoiceNumber,

          customerName: newInvoiceData.customerName,
          customerEmail: newInvoiceData.customerEmail ?? null,
          customerAddress: newInvoiceData.customerAddress ?? null,
          customerTaxCode: newInvoiceData.customerTaxCode ?? null,

          currency: newInvoiceData.currency as Currency,

          subtotal: newInvoiceData.subtotal,
          taxAmount: newInvoiceData.taxAmount,
          total: newInvoiceData.total,

          status: InvoiceStatus.ISSUED,
          issuedAt: new Date(),
          replacedInvoiceId: original.id,

          items: {
            create: newInvoiceData.items,
          },
        },
        include: { items: true },
      });

      // Mark original as CANCELED (replaced)
      await tx.invoice.update({
        where: { id: original.id },
        data: {
          status: InvoiceStatus.CANCELED,
          canceledAt: new Date(),
          cancelReason:
            cancelReason ?? `Replaced by ${created.invoiceNumber}`,
        },
      });

      return toInvoice(created);
    });
  }

  async deleteInvoice(invoiceNumber: string): Promise<void> {
    await this.prisma.invoice.update({
      where: { invoiceNumber },
      data: { deletedAt: new Date() },
      include: { items: true },
    });
  }
}
