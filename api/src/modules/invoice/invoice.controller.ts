import type { Request, Response, NextFunction } from "express";
import { InvoiceService } from "./invoice.service.js";
import type {
  CreateInvoiceRequest,
  ListInvoiceRequest,
  UpdateInvoiceRequest,
  UpdateStatusRequest,
} from "./invoice.validation.js";
import { createdResponse, successResponse } from "../../lib/response.js";
import { INVOICE_STATUS } from "./invoice.type.js";
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

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const invoiceNumber = req.params.invoiceNumber as string;
      const data = req.body as UpdateStatusRequest;

      if (data.status === INVOICE_STATUS.DRAFT) {
        throw new AppError(
          "Status can not be changed to Draft",
          400,
          ErrorCode.BAD_REQUEST,
        );
      }

      const invoice = await this.invoiceService.updateStatus(
        invoiceNumber,
        data,
      );

      return successResponse(res, invoice);
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
