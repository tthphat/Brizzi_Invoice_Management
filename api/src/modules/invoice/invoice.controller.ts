import type { Request, Response, NextFunction } from "express";
import { InvoiceService } from "./invoice.service.js";
import type {
  CreateInvoiceRequest,
  ListInvoiceRequest,
  UpdateInvoiceRequest,
  CancelInvoiceRequest,
  ReplaceInvoiceRequest,
} from "./invoice.validation.js";
import { createdResponse, successResponse } from "../../lib/response.js";
import { AppError } from "../../lib/app-error.js";
import { ErrorCode } from "../../lib/error-code.js";

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

      const invoice =
        await this.invoiceService.getInvoiceByNumber(invoiceNumber);

      return successResponse(res, invoice);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req as Request & { validatedQuery: ListInvoiceRequest })
        .validatedQuery;

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

      const invoice = await this.invoiceService.updateDraft(
        invoiceNumber,
        data,
      );

      return successResponse(res, invoice);
    } catch (error) {
      next(error);
    }
  }

  async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const invoiceNumber = req.params.invoiceNumber as string;
      const invoice = await this.invoiceService.issue(invoiceNumber);

      return successResponse(res, invoice);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const invoiceNumber = req.params.invoiceNumber as string;
      const data = req.body as CancelInvoiceRequest;

      const invoice = await this.invoiceService.cancel(invoiceNumber, data);

      return successResponse(res, invoice);
    } catch (error) {
      next(error);
    }
  }

  async replace(req: Request, res: Response, next: NextFunction) {
    try {
      const invoiceNumber = req.params.invoiceNumber as string;
      const data = req.body as ReplaceInvoiceRequest;

      const invoice = await this.invoiceService.replace(invoiceNumber, data);

      // 201: a new replacement invoice is created
      return createdResponse(res, invoice);
    } catch (error) {
      next(error);
    }
  }

  async exportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const invoiceNumber = req.params.invoiceNumber as string;
      const { buffer, fileName } =
        await this.invoiceService.exportInvoicePdf(invoiceNumber);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.status(200).end(buffer);
    } catch (error) {
      next(error);
    }
  }

  async deleteInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoiceNumber = req.params.invoiceNumber as string;
      await this.invoiceService.deleteInvoice(invoiceNumber);
      return successResponse(res, null);
    } catch (error) {
      next(error);
    }
  }
}
