import path from "node:path";
import { createRequire } from "node:module";
import pdfmake from "pdfmake";

import type { Invoice } from "./invoice.type.js";

const require = createRequire(import.meta.url);

// pdfmake 0.3.x ships fonts at <pkg>/fonts/Roboto/*.ttf
const fontDir = path.join(
  path.dirname(require.resolve("pdfmake/package.json")),
  "fonts",
  "Roboto",
);

pdfmake.setFonts({
  Roboto: {
    normal: path.join(fontDir, "Roboto-Regular.ttf"),
    bold: path.join(fontDir, "Roboto-Medium.ttf"),
    italics: path.join(fontDir, "Roboto-Italic.ttf"),
    bolditalics: path.join(fontDir, "Roboto-MediumItalic.ttf"),
  },
});

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("vi-VN", { hour12: false });
}

type ContentNode = Record<string, unknown>;

function buildCustomerSection(invoice: Invoice): ContentNode[] {
  const lines = [
    invoice.customerTaxCode ? `MST: ${invoice.customerTaxCode}` : null,
    invoice.customerAddress ?? null,
    invoice.customerEmail ?? null,
  ].filter((line): line is string => line !== null);

  return [
    { text: "THÔNG TIN KHÁCH HÀNG", style: "sectionTitle" },
    { text: invoice.customerName, bold: true },
    ...lines.map((line) => ({ text: line })),
  ];
}

function buildItemsTable(invoice: Invoice): ContentNode[] {
  const header = ["Mô tả", "SL", "Đơn giá", "Thành tiền", "VAT (%)", "Tiền thuế"]
    .map((text) => ({
      text,
      bold: true,
      fillColor: "#f0f0f0",
      alignment: text === "Mô tả" ? "left" : "right",
    }));

  const rows = invoice.items.map((item) => [
    { text: item.description, alignment: "left" },
    { text: String(item.quantity), alignment: "right" },
    { text: formatMoney(item.unitPrice), alignment: "right" },
    { text: formatMoney(item.amount), alignment: "right" },
    { text: String(item.taxRate), alignment: "right" },
    { text: formatMoney(item.taxAmount), alignment: "right" },
  ]);

  return [
    {
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "auto", "auto", "auto"],
        body: [header, ...rows],
      },
      fontSize: 10,
    },
  ];
}

function buildTotalsSection(invoice: Invoice): ContentNode {
  return {
    margin: [0, 12, 0, 0],
    table: {
      widths: ["*", "auto"],
      body: [
        [
          { text: "Tổng tiền hàng (Subtotal)", alignment: "right" },
          { text: formatMoney(invoice.subtotal), alignment: "right" },
        ],
        [
          { text: "Tiền thuế (VAT)", alignment: "right" },
          { text: formatMoney(invoice.taxAmount), alignment: "right" },
        ],
        [
          {
            text: `TỔNG CỘNG (${invoice.currency})`,
            bold: true,
            alignment: "right",
          },
          {
            text: formatMoney(invoice.total),
            bold: true,
            alignment: "right",
            fillColor: "#f7f7f7",
          },
        ],
      ],
    },
  };
}

function buildCanceledStamp(): ContentNode {
  return {
    text: "ĐÃ HỦY",
    absolutePosition: { x: 120, y: 280 },
    rotate: 40,
    fontSize: 64,
    bold: true,
    color: "#ff9999",
  };
}

function buildCanceledSection(invoice: Invoice): ContentNode[] {
  return [
    {
      text: "HÓA ĐƠN NÀY ĐÃ BỊ HỦY - KHÔNG CÓ GIÁ TRỊ SỬ DỤNG",
      color: "red",
      bold: true,
      margin: [0, 20, 0, 4],
    },
    { text: `Lý do hủy: ${invoice.cancelReason ?? "-"}`, color: "red" },
    { text: `Ngày hủy: ${formatDate(invoice.canceledAt)}`, color: "red" },
  ];
}

function buildDocDefinition(invoice: Invoice): Record<string, unknown> {
  const isCanceled = invoice.status === "CANCELED";

  const content: ContentNode[] = [
    { text: "HÓA ĐƠN", style: "title" },
    { text: `Số hóa đơn: ${invoice.invoiceNumber}`, style: "subTitle" },
    {
      columns: [
        {
          text: `Trạng thái: ${invoice.status}`,
          bold: true,
          color: isCanceled ? "red" : undefined,
        },
        {
          text: `Ngày phát hành: ${formatDate(invoice.issuedAt)}`,
          alignment: "right",
        },
      ],
      margin: [0, 4, 0, 16],
    },

    ...buildCustomerSection(invoice),
    { text: "CHI TIẾT HÓA ĐƠN", style: "sectionTitle", margin: [0, 16, 0, 4] },
    ...buildItemsTable(invoice),
    buildTotalsSection(invoice),
  ];

  if (isCanceled) {
    // Stamp rendered behind/before other content so it sits in the middle of the page
    content.unshift(buildCanceledStamp());
    content.push(...buildCanceledSection(invoice));
  }

  return {
    pageSize: "A4",
    content,
    defaultStyle: {
      font: "Roboto",
      fontSize: 11,
    },
    styles: {
      title: {
        fontSize: 22,
        bold: true,
        alignment: "center",
      },
      subTitle: {
        fontSize: 13,
        alignment: "center",
        margin: [0, 2, 0, 0],
      },
      sectionTitle: {
        fontSize: 12,
        bold: true,
        margin: [0, 8, 0, 4],
      },
    },
  };
}

export async function renderInvoicePdf(invoice: Invoice): Promise<Buffer> {
  const document = pdfmake.createPdf(buildDocDefinition(invoice));

  return document.getBuffer();
}
