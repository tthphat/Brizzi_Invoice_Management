import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

// Skip integration tests if no database
const shouldSkip = !process.env.DATABASE_URL;

(shouldSkip ? describe.skip : describe)("Invoice API", () => {

  const validInvoiceData = {
    customerName: "Test Company",
    customerEmail: "test@example.com",
    customerAddress: "123 Test St",
    customerTaxCode: "123456789",
    currency: "VND",
    items: [
      {
        description: "Test Item 1",
        quantity: 2,
        unitPrice: "100000",
        taxRate: "10",
      },
      {
        description: "Test Item 2",
        quantity: 1,
        unitPrice: "50000",
        taxRate: "5",
      },
    ],
  };

  describe("POST /api/invoices", () => {
    it("should create invoice successfully", async () => {
      const response = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.invoiceNumber).toMatch(/^INV-\d{4}-/);
      expect(response.body.data.customerName).toBe("Test Company");
      expect(response.body.data.currency).toBe("VND");
      expect(response.body.data.status).toBe("DRAFT");
      expect(response.body.data.subtotal).toBe(250000); // 200000 + 50000
      expect(response.body.data.taxAmount).toBe(22500); // 20000 + 2500
      expect(response.body.data.total).toBe(272500); // subtotal + taxAmount
      expect(response.body.data.items).toHaveLength(2);
    });

    it("should return 400 for invalid data", async () => {
      const invalidData = {
        customerName: "", // Empty - should fail
        currency: "VND",
        items: [],
      };

      const response = await request(app)
        .post("/api/invoices")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for invalid email", async () => {
      const invalidData = {
        ...validInvoiceData,
        customerEmail: "invalid-email",
      };

      const response = await request(app)
        .post("/api/invoices")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for invalid currency", async () => {
      const invalidData = {
        ...validInvoiceData,
        currency: "INVALID",
      };

      const response = await request(app)
        .post("/api/invoices")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 for negative quantity", async () => {
      const invalidData = {
        ...validInvoiceData,
        items: [
          {
            ...validInvoiceData.items[0],
            quantity: -1,
          },
        ],
      };

      const response = await request(app)
        .post("/api/invoices")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 for more than 2 decimal places", async () => {
      const invalidData = {
        ...validInvoiceData,
        items: [
          {
            ...validInvoiceData.items[0],
            unitPrice: "100.123",
          },
        ],
      };

      const response = await request(app)
        .post("/api/invoices")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 for taxRate > 100", async () => {
      const invalidData = {
        ...validInvoiceData,
        items: [
          {
            ...validInvoiceData.items[0],
            taxRate: "101",
          },
        ],
      };

      const response = await request(app)
        .post("/api/invoices")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 for empty items array", async () => {
      const invalidData = {
        ...validInvoiceData,
        items: [],
      };

      const response = await request(app)
        .post("/api/invoices")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should create invoice with optional fields null", async () => {
      const dataWithoutOptional = {
        customerName: "Minimal Company",
        currency: "VND",
        items: [
          {
            description: "Single Item",
            quantity: 1,
            unitPrice: "10000",
            taxRate: "0",
          },
        ],
      };

      const response = await request(app)
        .post("/api/invoices")
        .send(dataWithoutOptional);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customerEmail).toBeNull();
      expect(response.body.data.customerAddress).toBeNull();
      expect(response.body.data.customerTaxCode).toBeNull();
    });

    it("should handle different currencies", async () => {
      for (const currency of ["VND", "USD", "JPY"] as const) {
        const data = {
          ...validInvoiceData,
          customerName: `Test ${currency}`,
          currency,
        };

        const response = await request(app)
          .post("/api/invoices")
          .send(data);

        expect(response.status).toBe(201);
        expect(response.body.data.currency).toBe(currency);
      }
    });
  });
});
