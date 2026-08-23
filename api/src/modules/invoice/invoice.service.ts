import type { InvoiceRepository } from "./invoice.repository.js";
import type { CreateInvoiceRequest } from "./invoice.validation.js";
import {
  calculateItemAmount,
  calculateItemTax,
  calculateInvoiceTotals,
  generateInvoiceNumber,
} from "./invoice.calculator.js";
import { Decimal } from "decimal.js";

export class InvoiceService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
  ) {}

  async createInvoice(data: CreateInvoiceRequest) {
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

    const { subtotal, taxAmount, total } = calculateInvoiceTotals(calculatedItems);

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
}