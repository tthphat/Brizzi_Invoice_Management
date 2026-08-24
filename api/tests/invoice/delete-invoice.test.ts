import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

// Skip integration tests if no database
const shouldSkip = !process.env.DATABASE_URL;

(shouldSkip ? describe.skip : describe)("DELETE /api/invoices/:invoiceNumber", () => {
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
    it("should delete DRAFT invoice successfully", async () => {
      // Create invoice
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      expect(createResponse.status).toBe(201);
      const invoiceNumber = createResponse.body.data.invoiceNumber;

      // Delete invoice
      const deleteResponse = await request(app)
        .delete(`/api/invoices/${invoiceNumber}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify deleted - should not be found
      const getResponse = await request(app)
        .get(`/api/invoices/${invoiceNumber}`);

      expect(getResponse.status).toBe(404);
    });

    it("should delete CANCELED invoice successfully", async () => {
      // Create invoice
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      const invoiceNumber = createResponse.body.data.invoiceNumber;

      // Issue then cancel
      await request(app).post(`/api/invoices/${invoiceNumber}/issue`);

      await request(app)
        .post(`/api/invoices/${invoiceNumber}/cancel`)
        .send({ cancelReason: "Test cancel" });

      // Delete invoice
      const deleteResponse = await request(app)
        .delete(`/api/invoices/${invoiceNumber}`);

      expect(deleteResponse.status).toBe(200);
    });

    it("should return 403 when trying to delete ISSUED invoice", async () => {
      // Create and issue invoice
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      const invoiceNumber = createResponse.body.data.invoiceNumber;

      await request(app).post(`/api/invoices/${invoiceNumber}/issue`);

      // Try to delete
      const deleteResponse = await request(app)
        .delete(`/api/invoices/${invoiceNumber}`);

      expect(deleteResponse.status).toBe(403);
      expect(deleteResponse.body.success).toBe(false);
      expect(deleteResponse.body.error?.message).toBe("Can not delete issued invoice");
    });

    it("should return 404 for non-existent invoice", async () => {
      const response = await request(app)
        .delete("/api/invoices/INV-9999-NOTEXIST");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("NOT_FOUND");
    });

    it("should return 404 for already deleted invoice", async () => {
      // Create and delete invoice
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      const invoiceNumber = createResponse.body.data.invoiceNumber;

      await request(app)
        .delete(`/api/invoices/${invoiceNumber}`);

      // Try to delete again
      const deleteResponse = await request(app)
        .delete(`/api/invoices/${invoiceNumber}`);

      expect(deleteResponse.status).toBe(404);
    });
  });
});
