import { describe, it, expect } from "vitest";
import { createInvoiceSchema } from "../../src/modules/invoice/invoice.validation.js";

describe("createInvoiceSchema", () => {
  const validInvoice = {
    customerName: "Test Company",
    customerEmail: "test@example.com",
    customerAddress: "123 Test St",
    customerTaxCode: "123456789",
    currency: "VND",
    items: [
      {
        description: "Test Item",
        quantity: 2,
        unitPrice: "100000",
        taxRate: "10",
      },
    ],
  };

  it("should validate valid invoice", () => {
    const result = createInvoiceSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
  });

  it("should reject empty customer name", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      customerName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("customerName");
    }
  });

  it("should reject invalid email", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      customerEmail: "invalid-email",
    });
    expect(result.success).toBe(false);
  });

  it("should accept optional customerEmail", () => {
    const { customerEmail, ...dataWithoutEmail } = validInvoice;
    const result = createInvoiceSchema.safeParse(dataWithoutEmail);
    expect(result.success).toBe(true);
  });

  it("should reject invalid currency", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      currency: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("should accept VND, USD, JPY currencies", () => {
    for (const currency of ["VND", "USD", "JPY"] as const) {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        currency,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should reject non-integer quantity", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      items: [
        {
          ...validInvoice.items[0],
          quantity: 1.5,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative quantity", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      items: [
        {
          ...validInvoice.items[0],
          quantity: -1,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative unitPrice", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      items: [
        {
          ...validInvoice.items[0],
          unitPrice: "-100",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject more than 2 decimal places in unitPrice", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      items: [
        {
          ...validInvoice.items[0],
          unitPrice: "100.123",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should accept 1 decimal place in unitPrice", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      items: [
        {
          ...validInvoice.items[0],
          unitPrice: "100.5",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept 2 decimal places in unitPrice", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      items: [
        {
          ...validInvoice.items[0],
          unitPrice: "100.55",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject taxRate > 100", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      items: [
        {
          ...validInvoice.items[0],
          taxRate: "101",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative taxRate", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      items: [
        {
          ...validInvoice.items[0],
          taxRate: "-5",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty items array", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty item description", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      items: [
        {
          ...validInvoice.items[0],
          description: "",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should set default currency to VND", () => {
    const { currency, ...dataWithoutCurrency } = validInvoice;
    const result = createInvoiceSchema.safeParse(dataWithoutCurrency);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("VND");
    }
  });
});
