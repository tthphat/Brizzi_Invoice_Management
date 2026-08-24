import type { InvoiceRepository } from "./invoice.repository.js";
import type {
  CreateInvoiceRequest,
  ListInvoiceRequest,
  UpdateInvoiceRequest,
  CancelInvoiceRequest,
  ReplaceInvoiceRequest,
} from "./invoice.validation.js";
import {
  calculateItemAmount,
  calculateItemTax,
  calculateInvoiceTotals,
  generateInvoiceNumber,
} from "./invoice.calculator.js";
import { Decimal } from "decimal.js";
import {
  INVOICE_STATUS,
  type Invoice,
  type ListInvoiceResponse,
  type UpdateStatusType,
} from "./invoice.type.js";
import { AppError, NotFoundError } from "../../lib/app-error.js";
import { ErrorCode } from "../../lib/error-code.js";

export class InvoiceService {
  constructor(private readonly invoiceRepository: InvoiceRepository) {}

  async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    // Calculate amounts using Decimal for precision
    const calculatedItems = data.items.map((item) => {
      const quantity = new Decimal(item.quantity);
      const unitPrice = new Decimal(item.unitPrice);
      const taxRate = new Decimal(item.taxRate);

      const amount = calculateItemAmount(quantity, unitPrice);
      const taxAmount = calculateItemTax(amount, taxRate);

      return {
        ...item,
        amount,
        taxAmount,
      };
    });

    const { subtotal, taxAmount, total } =
      calculateInvoiceTotals(calculatedItems);

    // Convert Decimal to number for repository
    const invoiceData = {
      subtotal: subtotal.toNumber(),
      taxAmount: taxAmount.toNumber(),
      total: total.toNumber(),
    };

    // Convert item amounts to number for repository
    const itemsForRepository = calculatedItems.map((item) => ({
      ...item,
      amount: item.amount.toNumber(),
      taxAmount: item.taxAmount.toNumber(),
    }));

    const invoiceNumber = generateInvoiceNumber();

    return this.invoiceRepository.create({
      invoiceNumber,

      customerName: data.customerName,
      customerEmail: data.customerEmail ?? null,
      customerAddress: data.customerAddress ?? null,
      customerTaxCode: data.customerTaxCode ?? null,

      currency: data.currency,

      subtotal: invoiceData.subtotal,
      taxAmount: invoiceData.taxAmount,
      total: invoiceData.total,

      items: itemsForRepository,
    });
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice> {
    const invoice =
      await this.invoiceRepository.findByInvoiceNumber(invoiceNumber);

    if (!invoice) {
      throw new NotFoundError(`Invoice with number ${invoiceNumber} not found`);
    }

    return invoice;
  }

  async listInvoices(query: ListInvoiceRequest): Promise<ListInvoiceResponse> {
    const { items, total } = await this.invoiceRepository.findMany(query);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async updateDraft(
    invoiceNumber: string,
    data: UpdateInvoiceRequest,
  ): Promise<Invoice> {
    const invoice =
      await this.invoiceRepository.findByInvoiceNumber(invoiceNumber);

    if (!invoice) {
      throw new NotFoundError(`Invoice with number ${invoiceNumber} not found`);
    }

    if (invoice.status !== INVOICE_STATUS.DRAFT) {
      throw new AppError("Invoice is not a draft", 400, ErrorCode.BAD_REQUEST);
    }

    const updateData: Record<string, unknown> = { ...data };

    // Calculate if items provided
    if (data.items) {
      // Calculate with Decimal first
      const calculatedItems = data.items.map((item) => {
        const quantity = new Decimal(item.quantity);
        const unitPrice = new Decimal(item.unitPrice);
        const taxRate = new Decimal(item.taxRate);
        const amount = calculateItemAmount(quantity, unitPrice);
        const taxAmount = calculateItemTax(amount, taxRate);
        return {
          amount,
          taxAmount,
        };
      });

      const { subtotal, taxAmount, total } =
        calculateInvoiceTotals(calculatedItems);

      // Build items for DB (convert to number)
      const itemsForDb = data.items.map((item) => {
        const quantity = new Decimal(item.quantity);
        const unitPrice = new Decimal(item.unitPrice);
        const taxRate = new Decimal(item.taxRate);
        const amount = calculateItemAmount(quantity, unitPrice);
        const taxAmount = calculateItemTax(amount, taxRate);
        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: amount.toNumber(),
          taxRate: item.taxRate,
          taxAmount: taxAmount.toNumber(),
        };
      });

      updateData.subtotal = subtotal.toNumber();
      updateData.taxAmount = taxAmount.toNumber();
      updateData.total = total.toNumber();
      updateData.items = {
        deleteMany: {},
        create: itemsForDb,
      };
    }

    return this.invoiceRepository.updateDraft(invoiceNumber, updateData);
  }

  async issue(invoiceNumber: string): Promise<Invoice> {
    const invoice =
      await this.invoiceRepository.findByInvoiceNumber(invoiceNumber);

    if (!invoice) {
      throw new NotFoundError(`Invoice with number ${invoiceNumber} not found`);
    }

    if (invoice.status !== INVOICE_STATUS.DRAFT) {
      throw new AppError(
        "Only DRAFT invoice can be issued",
        400,
        ErrorCode.BAD_REQUEST,
      );
    }

    const updateData: UpdateStatusType = {
      status: INVOICE_STATUS.ISSUED,
      canceledAt: null,
      cancelReason: null,
      issuedAt: new Date(),
    };

    return this.invoiceRepository.updateStatus(invoiceNumber, updateData);
  }

  async cancel(
    invoiceNumber: string,
    data: CancelInvoiceRequest,
  ): Promise<Invoice> {
    const invoice =
      await this.invoiceRepository.findByInvoiceNumber(invoiceNumber);

    if (!invoice) {
      throw new NotFoundError(`Invoice with number ${invoiceNumber} not found`);
    }

    if (invoice.status !== INVOICE_STATUS.ISSUED) {
      throw new AppError(
        "Only ISSUED invoice can be canceled",
        400,
        ErrorCode.BAD_REQUEST,
      );
    }

    const updateData: UpdateStatusType = {
      status: INVOICE_STATUS.CANCELED,
      canceledAt: new Date(),
      cancelReason: data.cancelReason,
      issuedAt: invoice.issuedAt,
    };

    return this.invoiceRepository.updateStatus(invoiceNumber, updateData);
  }

  async replace(
    invoiceNumber: string,
    data: ReplaceInvoiceRequest,
  ): Promise<Invoice> {
    const original =
      await this.invoiceRepository.findByInvoiceNumber(invoiceNumber);

    if (!original) {
      throw new NotFoundError(`Invoice with number ${invoiceNumber} not found`);
    }

    if (original.status !== INVOICE_STATUS.ISSUED) {
      // Distinguish "not issuable" from "already replaced" for clearer errors
      const replacement =
        await this.invoiceRepository.findReplacement(invoiceNumber);

      if (replacement) {
        throw new AppError(
          `Invoice already replaced by ${replacement.invoiceNumber}`,
          409,
          ErrorCode.CONFLICT
        );
      }

      throw new AppError(
        "Only ISSUED invoice can be replaced",
        400,
        ErrorCode.BAD_REQUEST
      );
    }

    // Calculate amounts for the new invoice using Decimal (same as create)
    const calculatedItems = data.items.map((item) => {
      const quantity = new Decimal(item.quantity);
      const unitPrice = new Decimal(item.unitPrice);
      const taxRate = new Decimal(item.taxRate);

      const amount = calculateItemAmount(quantity, unitPrice);
      const taxAmount = calculateItemTax(amount, taxRate);

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: amount.toNumber(),
        taxRate: item.taxRate,
        taxAmount: taxAmount.toNumber(),
      };
    });

    const { subtotal, taxAmount, total } =
      calculateInvoiceTotals(
        calculatedItems.map((item) => ({
          amount: new Decimal(item.amount),
          taxAmount: new Decimal(item.taxAmount),
        }))
      );

    return this.invoiceRepository.replaceInvoice(
      invoiceNumber,
      {
        invoiceNumber: generateInvoiceNumber(),

        customerName: data.customerName,
        customerEmail: data.customerEmail ?? null,
        customerAddress: data.customerAddress ?? null,
        customerTaxCode: data.customerTaxCode ?? null,

        currency: data.currency,

        subtotal: subtotal.toNumber(),
        taxAmount: taxAmount.toNumber(),
        total: total.toNumber(),

        items: calculatedItems,
      },
      data.reason ?? null
    );
  }

  async deleteInvoice(invoiceNumber: string): Promise<void> {
    const invoice =
      await this.invoiceRepository.findByInvoiceNumber(invoiceNumber);

    if (!invoice) {
      throw new NotFoundError(`Invoice with number ${invoiceNumber} not found`);
    }

    if (invoice.status === INVOICE_STATUS.ISSUED) {
      throw new AppError(
        "Can not delete issued invoice",
        403,
        ErrorCode.FORBIDDEN,
      );
    }

    await this.invoiceRepository.deleteInvoice(invoice.invoiceNumber);
  }
}
