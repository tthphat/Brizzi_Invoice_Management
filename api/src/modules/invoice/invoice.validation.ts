import { z } from "zod";
import { CURRENCY, INVOICE_STATUS } from "./invoice.type.js";

// create invocie schema
export const createInvoiceSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Customer name is required")
    .max(255, "Customer name must not exceed 255 characters"),

  customerEmail: z.email("Invalid email address").optional(),

  customerAddress: z
    .string()
    .trim()
    .max(500, "Customer address must not exceed 500 characters")
    .optional(),

  customerTaxCode: z
    .string()
    .trim()
    .max(50, "Customer tax code must not exceed 50 characters")
    .optional(),

  currency: z.enum(Object.values(CURRENCY)).default(CURRENCY.VND),

  items: z
    .array(
      z.object({
        description: z
          .string()
          .trim()
          .min(1, "Item description is required")
          .max(500, "Item description must not exceed 500 characters"),

        quantity: z
          .number()
          .int("Quantity must be an integer")
          .positive("Quantity must be greater than 0"),

        unitPrice: z
          .string()
          .regex(/^\d+(\.\d{1,2})?$/, "Unit price must have at most 2 decimal places")
          .transform(Number),

        taxRate: z
          .string()
          .regex(/^\d+(\.\d{1,2})?$/, "Tax rate must have at most 2 decimal places")
          .transform(Number)
          .refine((val) => val <= 100, "Tax rate must be between 0 and 100"),
      }),
    )
    .min(1, "Invoice must contain at least one item"),
});
export type CreateInvoiceRequest = z.infer<typeof createInvoiceSchema>;


// get invoice by invoice number
export const invoiceNumberParamSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
});


// get list invoice
export const listInvoiceSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20),

  status: z
    .enum(Object.values(INVOICE_STATUS))
    .optional(),
});
export type ListInvoiceRequest = z.infer<typeof listInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Customer name is required")
    .max(255, "Customer name must not exceed 255 characters")
    .optional(),

  customerEmail: z.email("Invalid email address").optional(),

  customerAddress: z
    .string()
    .trim()
    .max(500, "Customer address must not exceed 500 characters")
    .optional(),

  customerTaxCode: z
    .string()
    .trim()
    .max(50, "Customer tax code must not exceed 50 characters")
    .optional(),

  currency: z.enum(Object.values(CURRENCY)).default(CURRENCY.VND).optional(),

  items: z
    .array(
      z.object({
        description: z
          .string()
          .trim()
          .min(1, "Item description is required")
          .max(500, "Item description must not exceed 500 characters"),

        quantity: z
          .number()
          .int("Quantity must be an integer")
          .positive("Quantity must be greater than 0"),

        unitPrice: z
          .string()
          .regex(/^\d+(\.\d{1,2})?$/, "Unit price must have at most 2 decimal places")
          .transform(Number),

        taxRate: z
          .string()
          .regex(/^\d+(\.\d{1,2})?$/, "Tax rate must have at most 2 decimal places")
          .transform(Number)
          .refine((val) => val <= 100, "Tax rate must be between 0 and 100"),
      }),
    )
    .min(1, "Invoice must contain at least one item")
    .optional(),
});
export type UpdateInvoiceRequest = z.infer<typeof updateInvoiceSchema>;

// Schema for updating invoice status
export const updateStatusSchema = z.object({
  status: z.enum(["ISSUED", "CANCELED"]),
  reason: z.string().max(500).optional(),
});
export type UpdateStatusRequest = z.infer<typeof updateStatusSchema>;
