import type { CreateInvoiceData, Invoice } from "./invoice.type.js";

export interface InvoiceRepository {
  create(data: CreateInvoiceData): Promise<Invoice>;
}
