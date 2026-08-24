import { Router } from "express";

import { invoiceController } from "../../container.js";
import { validate, validateParams, validateQuery } from "../../middlewares/validate.middleware.js";
import { createInvoiceSchema, invoiceNumberParamSchema, listInvoiceSchema, updateInvoiceSchema, updateStatusSchema } from "./invoice.validation.js";

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

// update invoice (draft only)
router.patch(
  "/:invoiceNumber",
  validateParams(invoiceNumberParamSchema),
  validate(updateInvoiceSchema),
  invoiceController.updateDraft.bind(invoiceController),
);

// update invoice status
router.patch(
  "/:invoiceNumber/status",
  validateParams(invoiceNumberParamSchema),
  validate(updateStatusSchema),
  invoiceController.updateStatus.bind(invoiceController),
);

// get invoice by invoice Number
router.get(
  "/:invoiceNumber",
  validateParams(invoiceNumberParamSchema),
  invoiceController.getByInvoiceNumber.bind(invoiceController),
);

export default router;
