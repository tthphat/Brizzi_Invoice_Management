import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

// Skip integration tests if no database
const shouldSkip = !process.env.DATABASE_URL;

(shouldSkip ? describe.skip : describe)("POST /api/invoices/:invoiceNumber/replace", () => {
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

  const replacementData = {
    customerName: "Test Company (Corrected)",
    customerEmail: "corrected@example.com",
    currency: "VND",
    items: [
      {
        description: "Test Item 1 (Corrected)",
        quantity: 3,
        unitPrice: "120000",
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
    it("should replace ISSUED invoice successfully", async () => {
      const originalNumber = await createAndIssueInvoice();

      // Get original id + issuedAt for later assertions
      const getOriginal = await request(app)
        .get(`/api/invoices/${originalNumber}`);
      const originalId = getOriginal.body.data.id;
      const originalIssuedAt = getOriginal.body.data.issuedAt;

      // Replace with corrected data
      const response = await request(app)
        .post(`/api/invoices/${originalNumber}/replace`)
        .send({ ...replacementData, reason: "Wrong quantity" });

      expect(response.status).toBe(201);

      const newInvoice = response.body.data;
      expect(newInvoice.invoiceNumber).not.toBe(originalNumber);
      expect(newInvoice.status).toBe("ISSUED");
      expect(newInvoice.issuedAt).not.toBeNull();
      expect(newInvoice.replacedInvoiceId).toBe(originalId);
      expect(newInvoice.customerName).toBe("Test Company (Corrected)");

      // Totals recalculated: 3 * 120000 = 360000 subtotal, tax 10% = 36000, total 396000
      expect(newInvoice.subtotal).toBe(360000);
      expect(newInvoice.taxAmount).toBe(36000);
      expect(newInvoice.total).toBe(396000);

      // Original invoice must now be CANCELED with reason referencing replacement
      const afterReplace = await request(app)
        .get(`/api/invoices/${originalNumber}`);

      expect(afterReplace.status).toBe(200);
      expect(afterReplace.body.data.status).toBe("CANCELED");
      expect(afterReplace.body.data.canceledAt).not.toBeNull();
      expect(afterReplace.body.data.cancelReason).toBe("Wrong quantity");
      // issuedAt of the original must be untouched
      expect(afterReplace.body.data.issuedAt).toBe(originalIssuedAt);
    });

    it("should use default cancelReason when no reason provided", async () => {
      const originalNumber = await createAndIssueInvoice();

      const response = await request(app)
        .post(`/api/invoices/${originalNumber}/replace`)
        .send(replacementData);

      expect(response.status).toBe(201);
      const newInvoiceNumber = response.body.data.invoiceNumber;

      const afterReplace = await request(app)
        .get(`/api/invoices/${originalNumber}`);

      expect(afterReplace.body.data.status).toBe("CANCELED");
      expect(afterReplace.body.data.cancelReason).toBe(
        `Replaced by ${newInvoiceNumber}`
      );
    });

    it("should return 400 when trying to replace a DRAFT invoice", async () => {
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      const invoiceNumber = createResponse.body.data.invoiceNumber;

      const response = await request(app)
        .post(`/api/invoices/${invoiceNumber}/replace`)
        .send(replacementData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.message).toBe(
        "Only ISSUED invoice can be replaced"
      );
    });

    it("should return 400 when trying to replace a CANCELED invoice", async () => {
      const invoiceNumber = await createAndIssueInvoice();

      await request(app)
        .post(`/api/invoices/${invoiceNumber}/cancel`)
        .send({ cancelReason: "Test cancel" });

      const response = await request(app)
        .post(`/api/invoices/${invoiceNumber}/replace`)
        .send(replacementData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.message).toBe(
        "Only ISSUED invoice can be replaced"
      );
    });

    it("should return 409 when trying to replace an already replaced invoice", async () => {
      const originalNumber = await createAndIssueInvoice();

      // First replace - should succeed
      const firstReplace = await request(app)
        .post(`/api/invoices/${originalNumber}/replace`)
        .send(replacementData);

      expect(firstReplace.status).toBe(201);

      // Second replace on the same original - should conflict
      const secondReplace = await request(app)
        .post(`/api/invoices/${originalNumber}/replace`)
        .send(replacementData);

      expect(secondReplace.status).toBe(409);
      expect(secondReplace.body.success).toBe(false);
      expect(secondReplace.body.error?.code).toBe("CONFLICT");
    });

    it("should return 400 for invalid body (missing items)", async () => {
      const invoiceNumber = await createAndIssueInvoice();

      const response = await request(app)
        .post(`/api/invoices/${invoiceNumber}/replace`)
        .send({ customerName: "No items here" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("should return 404 for non-existent invoice", async () => {
      const response = await request(app)
        .post("/api/invoices/INV-9999-NOTEXIST/replace")
        .send(replacementData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("NOT_FOUND");
    });
  });
});
