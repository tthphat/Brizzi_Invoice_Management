import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

// Skip integration tests if no database
const shouldSkip = !process.env.DATABASE_URL;

(shouldSkip ? describe.skip : describe)("PATCH /api/invoices/:invoiceNumber/status", () => {
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
      expect(response.body.data.status).toBe("DRAFT");
    });

    it("should issue invoice successfully (DRAFT → ISSUED)", async () => {
      const response = await request(app)
        .patch(`/api/invoices/${createdInvoiceNumber}/status`)
        .send({ status: "ISSUED" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("ISSUED");
      expect(response.body.data.issuedAt).not.toBeNull();
    });

    it("should cancel invoice successfully (ISSUED → CANCELED)", async () => {
      const response = await request(app)
        .patch(`/api/invoices/${createdInvoiceNumber}/status`)
        .send({ status: "CANCELED", reason: "Customer request" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("CANCELED");
      expect(response.body.data.canceledAt).not.toBeNull();
      expect(response.body.data.cancelReason).toBe("Customer request");
    });

    it("should return 400 when trying to set status to DRAFT", async () => {
      // Create new invoice
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);
      const invoiceNumber = createResponse.body.data.invoiceNumber;

      const response = await request(app)
        .patch(`/api/invoices/${invoiceNumber}/status`)
        .send({ status: "DRAFT" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.message).toBe("Status can not be changed to Draft");
    });

    it("should return 400 when trying to cancel a DRAFT invoice", async () => {
      // Create new invoice (stays DRAFT)
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);
      const invoiceNumber = createResponse.body.data.invoiceNumber;

      const response = await request(app)
        .patch(`/api/invoices/${invoiceNumber}/status`)
        .send({ status: "CANCELED", reason: "Test" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.message).toBe("Only ISSUED invoice can be canceled");
    });

    it("should return 400 when trying to issue an already ISSUED invoice", async () => {
      // First issue
      await request(app)
        .patch(`/api/invoices/${createdInvoiceNumber}/status`)
        .send({ status: "ISSUED" });

      // Try to issue again
      const response = await request(app)
        .patch(`/api/invoices/${createdInvoiceNumber}/status`)
        .send({ status: "ISSUED" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.message).toBe("Only DRAFT invoice can be issued");
    });

    it("should return 404 for non-existent invoice", async () => {
      const response = await request(app)
        .patch("/api/invoices/INV-9999-NOTEXIST/status")
        .send({ status: "ISSUED" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("NOT_FOUND");
    });

    it("should return 400 for invalid status", async () => {
      const response = await request(app)
        .patch(`/api/invoices/${createdInvoiceNumber}/status`)
        .send({ status: "INVALID_STATUS" as any });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("VALIDATION_ERROR");
    });
  });
});
