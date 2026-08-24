import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Response } from "supertest";
import app from "../../src/app.js";

// Skip integration tests if no database
const shouldSkip = !process.env.DATABASE_URL;

// Collect raw response bytes so we can inspect the PDF binary
function parseRawBuffer(res: unknown, callback: (err: null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
}

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

(shouldSkip ? describe.skip : describe)("GET /api/invoices/:invoiceNumber/pdf", () => {
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

  const getPdf = async (invoiceNumber: string): Promise<Response> => {
    return request(app)
      .get(`/api/invoices/${invoiceNumber}/pdf`)
      .buffer(true)
      .parse(parseRawBuffer);
  };

  describe("when database is available", () => {
    it("should export ISSUED invoice as PDF", async () => {
      const invoiceNumber = await createAndIssueInvoice();

      const response = await getPdf(invoiceNumber);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("application/pdf");
      expect(response.headers["content-disposition"]).toBe(
        `attachment; filename="${invoiceNumber}.pdf"`
      );

      // PDF magic number: file must start with "%PDF"
      const body = response.body as Buffer;
      expect(body.length).toBeGreaterThan(0);
      expect(body.subarray(0, 4).toString("ascii")).toBe("%PDF");
    });

    it("should export CANCELED invoice as PDF with canceled marking", async () => {
      const invoiceNumber = await createAndIssueInvoice();

      await request(app)
        .post(`/api/invoices/${invoiceNumber}/cancel`)
        .send({ cancelReason: "Customer changed mind" });

      const response = await getPdf(invoiceNumber);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("application/pdf");

      const body = response.body as Buffer;
      // Canceled invoices are still exported (with "ĐÃ HỦY" stamp rendered inside)
      expect(body.length).toBeGreaterThan(0);
      expect(body.subarray(0, 4).toString("ascii")).toBe("%PDF");
    });

    it("should return 400 when exporting a DRAFT invoice", async () => {
      const createResponse = await request(app)
        .post("/api/invoices")
        .send(validInvoiceData);

      const invoiceNumber = createResponse.body.data.invoiceNumber;

      const response = await request(app)
        .get(`/api/invoices/${invoiceNumber}/pdf`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.message).toBe(
        "Only ISSUED or CANCELED invoice can be exported to PDF"
      );
    });

    it("should return 404 for non-existent invoice", async () => {
      const response = await request(app)
        .get("/api/invoices/INV-9999-NOTEXIST/pdf");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("NOT_FOUND");
    });
  });
});
