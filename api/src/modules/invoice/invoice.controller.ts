import type { Request, Response, NextFunction } from "express";
import { InvoiceService } from "./invoice.service.js";
import type { CreateInvoiceRequest, ListInvoiceRequest, UpdateInvoiceRequest, UpdateStatusRequest } from "./invoice.validation.js";
import { createdResponse, successResponse } from "../../lib/response.js";

export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateInvoiceRequest;

      const invoice = await this.invoiceService.createInvoice(data);

      return createdResponse(res, invoice);
    } catch (error) {
      next(error);
    }
  }

  async getByInvoiceNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const invoiceNumber = req.params.invoiceNumber as string;

      const invoice = await this.invoiceService.getInvoiceByNumber(invoiceNumber);

      return successResponse(res, invoice);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req as Request & { validatedQuery: ListInvoiceRequest }).validatedQuery;

      const result = await this.invoiceService.listInvoices(query);

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const invoiceNumber = req.params.invoiceNumber as string;
      const data = req.body as UpdateInvoiceRequest;

      const invoice = await this.invoiceService.updateDraft(invoiceNumber, data);

      return successResponse(res, invoice);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const invoiceNumber = req.params.invoiceNumber as string;
      const data = req.body as UpdateStatusRequest;

      const invoice = await this.invoiceService.updateStatus(invoiceNumber, data);

      return successResponse(res, invoice);
    } catch (error) {
      next(error);
    }
  }
}
