import {
  PrismaClient,
  InvoiceStatus,
  Currency,
} from "../src/generated/prisma/client.js";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();

  // ========================================
  // 1. DRAFT INVOICE
  // ========================================

  const draftInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-000001",
      status: InvoiceStatus.DRAFT,

      customerName: "Nguyen Van A",
      customerEmail: "nguyenvana@example.com",
      customerAddress: "123 Nguyen Hue, District 1, Ho Chi Minh City",
      customerTaxCode: "0312345678",

      currency: Currency.VND,

      subtotal: 26000000,
      taxAmount: 2600000,
      total: 28600000,

      items: {
        create: [
          {
            description: "MacBook Air M4",
            quantity: 1,
            unitPrice: 25000000,
            amount: 25000000,
            taxRate: 10,
            taxAmount: 2500000,
          },
          {
            description: "Wireless Mouse",
            quantity: 2,
            unitPrice: 500000,
            amount: 1000000,
            taxRate: 10,
            taxAmount: 100000,
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });

  // ========================================
  // 2. ISSUED INVOICE
  // ========================================

  const issuedInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-000002",
      status: InvoiceStatus.ISSUED,

      customerName: "Tran Thi B",
      customerEmail: "tranthib@example.com",
      customerAddress: "456 Le Loi, District 1, Ho Chi Minh City",
      customerTaxCode: "0398765432",

      currency: Currency.VND,

      subtotal: 15000000,
      taxAmount: 1500000,
      total: 16500000,

      issuedAt: new Date("2026-08-20T10:00:00Z"),

      items: {
        create: [
          {
            description: "Mechanical Keyboard",
            quantity: 1,
            unitPrice: 5000000,
            amount: 5000000,
            taxRate: 10,
            taxAmount: 500000,
          },
          {
            description: "27-inch Monitor",
            quantity: 1,
            unitPrice: 10000000,
            amount: 10000000,
            taxRate: 10,
            taxAmount: 1000000,
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });

  // ========================================
  // 3. CANCELED INVOICE
  // ========================================

  const canceledInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-000003",
      status: InvoiceStatus.CANCELED,

      customerName: "Le Van C",
      customerEmail: "levanc@example.com",
      customerAddress: "789 Dien Bien Phu, Binh Thanh, Ho Chi Minh City",
      customerTaxCode: "0456789123",

      currency: Currency.VND,

      subtotal: 8000000,
      taxAmount: 800000,
      total: 8800000,

      issuedAt: new Date("2026-08-18T09:00:00Z"),
      canceledAt: new Date("2026-08-19T14:30:00Z"),
      cancelReason: "Incorrect customer information",

      items: {
        create: [
          {
            description: "Office Chair",
            quantity: 2,
            unitPrice: 4000000,
            amount: 8000000,
            taxRate: 10,
            taxAmount: 800000,
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });

  console.log("Created invoices:");
  console.log(`- ${draftInvoice.invoiceNumber} (${draftInvoice.status})`);
  console.log(`- ${issuedInvoice.invoiceNumber} (${issuedInvoice.status})`);
  console.log(`- ${canceledInvoice.invoiceNumber} (${canceledInvoice.status})`);

  console.log("Seeding completed.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
