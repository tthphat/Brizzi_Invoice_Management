import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

// Skip integration tests if no database
const shouldSkip = !process.env.DATABASE_URL;

(shouldSkip ? describe.skip : describe)("POST /api/invoices/:invoiceNumber/cancel", () => {
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

  const createAndIssueInvoice = async () => {
    const createResponse = await request(app)
      .post("/api/invoices")
      .send(validInvoiceData);

    expect(createResponse.status).toBe(201);
    const invoiceNumber = createResponse.body.data.invoiceNumber;

    const issueResponse = await request(app)
      .post(`/api/invoices/${invoiceNumber}/issue`);

    expect(issueResponse.status).toBe(200);

    return invoiceNumber;
  };

  describe("when database is available", () => {
    it("should cancel ISSUED invoice successfully (ISSUED → CANCELED)", async () => {
      const invoiceNumber = await createAndIssueInvoice();

      const response = await request(app)
        .post(`/api/invoices/${invoiceNumber}/cancel`)
        .send({ cancelReason: "Customer requested cancellation" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invoiceNumber).toBe(invoiceNumber);
      expect(response.body.data.status).toBe("CANCELED");
      expect(response.body.data.canceledAt).not.toBeNull();
      expect(response.body.data.cancelReason).toBe(
        "Customer requested cancellation"
      );
      // issuedAt must be preserved after canceling
      expect(response.body.data.issuedAt).not.toBeNull();
    });

    it("should return 400 when trying to cancel a DRAFT invoice", async () => {
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      const invoiceNumber = createResponse.body.data.invoiceNumber;

      const response = await request(app)
        .post(`/api/invoices/${invoiceNumber}/cancel`)
        .send({ cancelReason: "Test cancel" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.message).toBe(
        "Only ISSUED invoice can be canceled"
      );
    });

    it("should return 400 when trying to cancel an already CANCELED invoice", async () => {
      const invoiceNumber = await createAndIssueInvoice();

      // Cancel first time - should succeed
      await request(app)
        .post(`/api/invoices/${invoiceNumber}/cancel`)
        .send({ cancelReason: "First cancel" });

      // Cancel second time - should fail
      const response = await request(app)
        .post(`/api/invoices/${invoiceNumber}/cancel`)
        .send({ cancelReason: "Second cancel" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.message).toBe(
        "Only ISSUED invoice can be canceled"
      );
    });

    it("should return 400 when cancelReason is missing", async () => {
      const invoiceNumber = await createAndIssueInvoice();

      const response = await request(app)
        .post(`/api/invoices/${invoiceNumber}/cancel`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when cancelReason exceeds 500 characters", async () => {
      const invoiceNumber = await createAndIssueInvoice();

      const response = await request(app)
        .post(`/api/invoices/${invoiceNumber}/cancel`)
        .send({ cancelReason: "a".repeat(501) });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("should return 404 for non-existent invoice", async () => {
      const response = await request(app)
        .post("/api/invoices/INV-9999-NOTEXIST/cancel")
        .send({ cancelReason: "Test cancel" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("NOT_FOUND");
    });
  });
});
