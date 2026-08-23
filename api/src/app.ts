import express from "express";
import invoiceRoutes from "./modules/invoice/invoice.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

app.use(express.json());

// routes
app.use("/api/invoices", invoiceRoutes);

// error handler (must be last)
app.use(errorHandler);

export default app;
