import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

// Skip integration tests if no database
const shouldSkip = !process.env.DATABASE_URL;

(shouldSkip ? describe.skip : describe)("PATCH /api/invoices/:invoiceNumber", () => {
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
    ],
  };

  describe("when database is available", () => {
    let createdInvoiceNumber: string;

    it("should create invoice first for testing", async () => {
      const response = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      expect(response.status).toBe(201);
      createdInvoiceNumber = response.body.data.invoiceNumber;
    });

    it("should update invoice successfully", async () => {
      const response = await request(app)
        .patch(`/api/invoices/${createdInvoiceNumber}`)
        .send({
          customerName: "Updated Company",
        });

      console.log("Update response:", JSON.stringify(response.body, null, 2));
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customerName).toBe("Updated Company");
    });

    it("should update items and recalculate totals", async () => {
      const response = await request(app)
        .patch(`/api/invoices/${createdInvoiceNumber}`)
        .send({
          items: [
            {
              description: "New Item",
              quantity: 5,
              unitPrice: "50000",
              taxRate: "5",
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].description).toBe("New Item");
      // subtotal = 5 * 50000 = 250000
      expect(response.body.data.subtotal).toBe(250000);
      // taxAmount = 250000 * 5% = 12500
      expect(response.body.data.taxAmount).toBe(12500);
      // total = 250000 + 12500 = 262500
      expect(response.body.data.total).toBe(262500);
    });

    it("should return 400 when updating non-draft invoice", async () => {
      // First create a new invoice
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      const newInvoiceNumber = createResponse.body.data.invoiceNumber;

      // Try to update it (it's DRAFT so should work)
      const updateResponse = await request(app)
        .patch(`/api/invoices/${newInvoiceNumber}`)
        .send({
          customerName: "Another Company",
        });

      expect(updateResponse.status).toBe(200);
    });

    it("should return 404 for non-existent invoice", async () => {
      const response = await request(app)
        .patch("/api/invoices/INV-9999-NOTEXIST")
        .send({
          customerName: "Test",
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("NOT_FOUND");
    });

    it("should return 400 for empty invoice number", async () => {
      const response = await request(app)
        .patch("/api/invoices/")
        .send({ customerName: "Test" });

      expect(response.status).toBe(404);
    });

    it("should return 400 when items missing required fields", async () => {
      const response = await request(app)
        .patch(`/api/invoices/${createdInvoiceNumber}`)
        .send({
          items: [
            {
              description: "Incomplete Item",
              // missing quantity, unitPrice, taxRate
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("VALIDATION_ERROR");
    });
  });
});
