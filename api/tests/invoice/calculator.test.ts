import { describe, it, expect } from "vitest";
import { Decimal } from "decimal.js";
import {
  calculateItemAmount,
  calculateItemTax,
  calculateInvoiceTotals,
  generateInvoiceNumber,
} from "../../src/modules/invoice/invoice.calculator.js";

describe("calculateItemAmount", () => {
  it("should calculate amount correctly", () => {
    const result = calculateItemAmount(
      new Decimal(2),
      new Decimal(100),
    );
    expect(result.toNumber()).toBe(200);
  });

  it("should handle decimal correctly", () => {
    const result = calculateItemAmount(
      new Decimal(3),
      new Decimal(15.5),
    );
    expect(result.toNumber()).toBe(46.5);
  });

  it("should round to 2 decimal places", () => {
    const result = calculateItemAmount(
      new Decimal(2),
      new Decimal(33.333),
    );
    expect(result.toNumber()).toBe(66.67);
  });
});

describe("calculateItemTax", () => {
  it("should calculate tax correctly", () => {
    const result = calculateItemTax(
      new Decimal(100),
      new Decimal(10),
    );
    expect(result.toNumber()).toBe(10);
  });

  it("should handle decimal tax rate", () => {
    const result = calculateItemTax(
      new Decimal(100),
      new Decimal(7.5),
    );
    expect(result.toNumber()).toBe(7.5);
  });

  it("should handle zero tax rate", () => {
    const result = calculateItemTax(
      new Decimal(100),
      new Decimal(0),
    );
    expect(result.toNumber()).toBe(0);
  });
});

describe("calculateInvoiceTotals", () => {
  it("should calculate subtotal and total correctly", () => {
    const items = [
      {
        amount: new Decimal(100),
        taxAmount: new Decimal(10),
      },
      {
        amount: new Decimal(200),
        taxAmount: new Decimal(20),
      },
    ];

    const result = calculateInvoiceTotals(items);

    expect(result.subtotal.toNumber()).toBe(300);
    expect(result.taxAmount.toNumber()).toBe(30);
    expect(result.total.toNumber()).toBe(330);
  });

  it("should handle single item", () => {
    const items = [
      {
        amount: new Decimal(500),
        taxAmount: new Decimal(50),
      },
    ];

    const result = calculateInvoiceTotals(items);

    expect(result.subtotal.toNumber()).toBe(500);
    expect(result.taxAmount.toNumber()).toBe(50);
    expect(result.total.toNumber()).toBe(550);
  });
});

describe("generateInvoiceNumber", () => {
  it("should generate invoice number with year and uuid", () => {
    const result = generateInvoiceNumber();

    expect(result).toMatch(/^INV-\d{4}-[A-F0-9]{8}$/);
  });

  it("should generate unique invoice numbers", () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(generateInvoiceNumber());
    }
    // Should have 100 unique values
    expect(results.size).toBe(100);
  });
});
