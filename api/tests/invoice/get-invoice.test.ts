import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

// Skip integration tests if no database
const shouldSkip = !process.env.DATABASE_URL;

(shouldSkip ? describe.skip : describe)("GET /api/invoices/:invoiceNumber", () => {
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

  let createdInvoiceNumber: string;

  it("should create invoice first for testing", async () => {
    const response = await request(app)
      .post("/api/invoices")
      .send(validInvoiceData);

    expect(response.status).toBe(201);
    createdInvoiceNumber = response.body.data.invoiceNumber;
  });

  it("should return 200 and invoice data for valid invoice number", async () => {
    const response = await request(app)
      .get(`/api/invoices/${createdInvoiceNumber}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.invoiceNumber).toBe(createdInvoiceNumber);
    expect(response.body.data.customerName).toBe("Test Company");
    expect(response.body.data.status).toBe("DRAFT");
  });

  it("should return 404 for non-existent invoice", async () => {
    const response = await request(app)
      .get("/api/invoices/INV-9999-NOTEXIST");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error?.code).toBe("NOT_FOUND");
  });
});
