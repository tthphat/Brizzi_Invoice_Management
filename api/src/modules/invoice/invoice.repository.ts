import type { CreateInvoiceData, Invoice } from "./invoice.type.js";
import type { ListInvoiceRequest } from "./invoice.validation.js";

export interface InvoiceRepository {
  create(data: CreateInvoiceData): Promise<Invoice>;

  findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null>;

  findMany(query: ListInvoiceRequest): Promise<{ items: Invoice[]; total: number }>;
}
