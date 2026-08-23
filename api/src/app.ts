import express from "express";
import invoiceRoutes from "./modules/invoice/invoice.routes.js";

const app = express();

app.use(express.json());

// routes
app.use("/api/invoices", invoiceRoutes);

export default app;
