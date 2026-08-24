import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

// Skip integration tests if no database
const shouldSkip = !process.env.DATABASE_URL;

(shouldSkip ? describe.skip : describe)("POST /api/invoices/:invoiceNumber/issue", () => {
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
    it("should issue DRAFT invoice successfully (DRAFT → ISSUED)", async () => {
      // Create invoice (DRAFT by default)
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      expect(createResponse.status).toBe(201);
      const invoiceNumber = createResponse.body.data.invoiceNumber;
      expect(createResponse.body.data.status).toBe("DRAFT");

      // Issue invoice
      const response = await request(app)
        .post(`/api/invoices/${invoiceNumber}/issue`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invoiceNumber).toBe(invoiceNumber);
      expect(response.body.data.status).toBe("ISSUED");
      expect(response.body.data.issuedAt).not.toBeNull();
    });

    it("should issue invoice without body", async () => {
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      const invoiceNumber = createResponse.body.data.invoiceNumber;

      const response = await request(app)
        .post(`/api/invoices/${invoiceNumber}/issue`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("ISSUED");
    });

    it("should return 400 when trying to issue an already ISSUED invoice", async () => {
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      const invoiceNumber = createResponse.body.data.invoiceNumber;

      // Issue first time - should succeed
      await request(app).post(`/api/invoices/${invoiceNumber}/issue`);

      // Issue second time - should fail
      const response = await request(app)
        .post(`/api/invoices/${invoiceNumber}/issue`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.message).toBe(
        "Only DRAFT invoice can be issued"
      );
    });

    it("should return 400 when trying to issue a CANCELED invoice", async () => {
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      const invoiceNumber = createResponse.body.data.invoiceNumber;

      // Issue then cancel
      await request(app).post(`/api/invoices/${invoiceNumber}/issue`);
      await request(app)
        .post(`/api/invoices/${invoiceNumber}/cancel`)
        .send({ cancelReason: "Test cancel" });

      // Try to issue a canceled invoice
      const response = await request(app)
        .post(`/api/invoices/${invoiceNumber}/issue`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.message).toBe(
        "Only DRAFT invoice can be issued"
      );
    });

    it("should return 404 for non-existent invoice", async () => {
      const response = await request(app)
        .post("/api/invoices/INV-9999-NOTEXIST/issue");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("NOT_FOUND");
    });
  });
});
