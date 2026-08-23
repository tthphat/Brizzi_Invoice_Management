import { Router } from "express";

import { invoiceController } from "../../container.js";
import { validateCreateInvoice } from "../../middlewares/validate.middleware.js";
import { createInvoiceSchema } from "./invoice.validation.js";

const router = Router();

router.post(
  "/",
  validateCreateInvoice(createInvoiceSchema),
  invoiceController.create.bind(invoiceController),
);

export default router;
