import type { Request, Response, NextFunction } from "express";
import { InvoiceService } from "./invoice.service.js";
import type { CreateInvoiceRequest } from "./invoice.validation.js";

export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateInvoiceRequest;

      const invoice = await this.invoiceService.createInvoice(data);

      return res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  }
}
