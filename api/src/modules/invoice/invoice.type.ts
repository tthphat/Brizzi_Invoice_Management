export const CURRENCY = {
  VND: "VND",
  USD: "USD",
  JPY: "JPY",
} as const;
export type CurrencyType = (typeof CURRENCY)[keyof typeof CURRENCY];

export const INVOICE_STATUS = {
  DRAFT: "DRAFT",
  ISSUED: "ISSUED",
  CANCELED: "CANCELED",
} as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export interface CreateInvoiceData {
  invoiceNumber: string;

  customerName: string;
  customerEmail: string | null;
  customerAddress: string | null;
  customerTaxCode: string | null;

  currency: CurrencyType;

  subtotal: number;
  taxAmount: number;
  total: number;

  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate: number;
    taxAmount: number;
  }[];
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  status: InvoiceStatus;
  customerName: string;
  customerEmail: string | null;
  customerAddress: string | null;
  customerTaxCode: string | null;
  currency: CurrencyType;
  subtotal: number;
  taxAmount: number;
  total: number;
  replacedInvoiceId: number | null;
  issuedAt: Date | null;
  canceledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
