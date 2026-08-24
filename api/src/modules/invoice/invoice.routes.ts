import { Router } from "express";

import { invoiceController } from "../../container.js";
import {
  validate,
  validateParams,
  validateQuery,
} from "../../middlewares/validate.middleware.js";
import {
  createInvoiceSchema,
  invoiceNumberParamSchema,
  listInvoiceSchema,
  updateInvoiceSchema,
  cancelInvoiceSchema,
  replaceInvoiceSchema,
} from "./invoice.validation.js";

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

// issue invoice
router.post(
  "/:invoiceNumber/issue",
  validateParams(invoiceNumberParamSchema),
  invoiceController.issue.bind(invoiceController),
);

// cancel invoice
router.post(
  "/:invoiceNumber/cancel",
  validateParams(invoiceNumberParamSchema),
  validate(cancelInvoiceSchema),
  invoiceController.cancel.bind(invoiceController),
);

// replace invoice (ISSUED only) => creates new invoice, cancels original
router.post(
  "/:invoiceNumber/replace",
  validateParams(invoiceNumberParamSchema),
  validate(replaceInvoiceSchema),
  invoiceController.replace.bind(invoiceController),
);

// get invoice by invoice Number
router.get(
  "/:invoiceNumber",
  validateParams(invoiceNumberParamSchema),
  invoiceController.getByInvoiceNumber.bind(invoiceController),
);

// delete invoice(only draft, canceled) => soft delete
router.delete(
  "/:invoiceNumber",
  validateParams(invoiceNumberParamSchema),
  invoiceController.deleteInvoice.bind(invoiceController),
);

export default router;
