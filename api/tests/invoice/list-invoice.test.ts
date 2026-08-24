import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

// Skip integration tests if no database
const shouldSkip = !process.env.DATABASE_URL;

(shouldSkip ? describe.skip : describe)("GET /api/invoices (list)", () => {
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
    it("should create invoice first for testing", async () => {
      const response = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      expect(response.status).toBe(201);
    });

    it("should return 200 with pagination for valid query", async () => {
      const response = await request(app)
        .get("/api/invoices?page=1&limit=10");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("items");
      expect(response.body.data).toHaveProperty("pagination");
      expect(response.body.data.pagination).toHaveProperty("page", 1);
      expect(response.body.data.pagination).toHaveProperty("limit", 10);
      expect(response.body.data.pagination).toHaveProperty("total");
      expect(response.body.data.pagination).toHaveProperty("totalPages");
    });

    it("should filter by status", async () => {
      const response = await request(app)
        .get("/api/invoices?page=1&limit=10&status=DRAFT");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // All items should have DRAFT status
      response.body.data.items.forEach((invoice: { status: string }) => {
        expect(invoice.status).toBe("DRAFT");
      });
    });

    it("should return 400 for invalid page", async () => {
      const response = await request(app)
        .get("/api/invoices?page=-1&limit=10");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for limit > 100", async () => {
      const response = await request(app)
        .get("/api/invoices?page=1&limit=200");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for invalid status", async () => {
      const response = await request(app)
        .get("/api/invoices?page=1&limit=10&status=INVALID");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("VALIDATION_ERROR");
    });
  });
});
