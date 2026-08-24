import { Router } from "express";

import { invoiceController } from "../../container.js";
import { validate, validateParams, validateQuery } from "../../middlewares/validate.middleware.js";
import { createInvoiceSchema, invoiceNumberParamSchema, listInvoiceSchema } from "./invoice.validation.js";

const router = Router();

// create invoice(draft)
router.post(
  "/",
  validate(createInvoiceSchema),
  invoiceController.create.bind(invoiceController),
);

// list invoices
router.get(
  "/",
  validateQuery(listInvoiceSchema),
  invoiceController.list.bind(invoiceController),
);

// get invoice by invoice Number
router.get(
  "/:invoiceNumber",
  validateParams(invoiceNumberParamSchema),
  invoiceController.getByInvoiceNumber.bind(invoiceController),
);

export default router;
