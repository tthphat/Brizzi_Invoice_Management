import { prisma } from "./lib/prisma.js"; 
import { PrismaInvoiceRepository } from "./modules/invoice/prisma-invoice.repository.js"; 
import { InvoiceService } from "./modules/invoice/invoice.service.js";
import { InvoiceController } from "./modules/invoice/invoice.controller.js";

const invoiceRepository = new PrismaInvoiceRepository(prisma);
const invoiceService = new InvoiceService(invoiceRepository);
const invoiceController = new InvoiceController(invoiceService);

export {
  invoiceController
};