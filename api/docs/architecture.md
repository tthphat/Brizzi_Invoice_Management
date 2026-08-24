# Kiến trúc dự án — Invoice Management API

## Tổng quan

API theo mô hình **layered architecture** (phân lớp) kết hợp **repository pattern** và **dependency injection** đơn giản qua container. Mỗi tầng chỉ giao tiếp với tầng kề dưới, giúp tách biệt HTTP — business logic — data access.

```
┌─────────────────────────────────────────────────────────┐
│                      HTTP Client                        │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  server.ts → app.ts                                     │
│  express.json() → routes → error handler (cuối cùng)    │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Middlewares                                            │
│  validateParams / validate / validateQuery (Zod)        │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Controller (invoice.controller.ts)                     │
│  Parse request → gọi service → wrap response            │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Service (invoice.service.ts)                           │
│  Business logic: state machine, tính tiền (Decimal),    │
│  validate nghiệp vụ, sinh mã hóa đơn                    │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Repository (invoice.repository.ts - interface          │
│              prisma-invoice.repository.ts - implement)   │
│  Truy cập dữ liệu, transaction, soft-delete filter      │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Prisma ORM → PostgreSQL                                │
└─────────────────────────────────────────────────────────┘
```

## Cấu trúc thư mục

```
api/src/
├── server.ts                        # Entry point, listen PORT
├── app.ts                           # Express app, mount routes + error handler
├── container.ts                     # DI: wiring repository → service → controller
│
├── lib/
│   ├── prisma.ts                    # PrismaClient + adapter pg, đọc DATABASE_URL
│   ├── response.ts                  # successResponse / createdResponse / errorResponse
│   ├── app-error.ts                 # AppError, NotFoundError
│   └── error-code.ts                # Danh mục error codes + message mặc định
│
├── middlewares/
│   ├── validate.middleware.ts       # validate / validateParams / validateQuery (Zod)
│   └── error.middleware.ts          # Bắt lỗi tập trung: ZodError, Prisma P2002/P2025, AppError
│
└── modules/invoice/                 # Feature module hóa đơn
    ├── invoice.routes.ts            # Định nghĩa route + gắn middleware validation
    ├── invoice.controller.ts        # Tầng HTTP
    ├── invoice.service.ts           # Business logic
    ├── invoice.repository.ts        # Interface repository
    ├── prisma-invoice.repository.ts # Implement bằng Prisma ($transaction...)
    ├── invoice.calculator.ts        # Hàm tính amount/tax/totals + sinh số hóa đơn
    ├── invoice.pdf.ts               # Render PDF bằng pdfmake
    ├── invoice.validation.ts        # Zod schemas cho body/params/query
    ├── invoice.type.ts              # Domain types (Invoice, CreateInvoiceData...)
    └── invoice.mapper.ts            # Prisma model → domain DTO (Decimal → number)
```

## Luồng xử lý một request

Ví dụ `POST /api/invoices/:invoiceNumber/replace`:

```
1. express.json()                parse body JSON
2. invoice.routes.ts             match POST /:invoiceNumber/replace
3. validateParams(...)           Zod kiểm tra invoiceNumber trong URL
4. validate(replaceInvoiceSchema) Zod kiểm tra body (đồng thời transform
                                 unitPrice/taxRate từ string → number)
5. controller.replace()          lấy params/body, gọi service.replace()
6. service.replace()
   ├── repository.findByInvoiceNumber()  → 404 nếu không có
   ├── check status ISSUED       → 400 nếu sai trạng thái
   ├── query hóa đơn thay thế    → 409 CONFLICT nếu đã bị replace
   ├── calculator + decimal.js   tính lại amount/tax/subtotal/total
   └── repository.replaceInvoice()  ← TRANSACTION ở đây
       ├── re-check status + replaced bên trong transaction
       ├── create hóa đơn mới (ISSUED, replacedInvoiceId = gốc.id)
       ├── update hóa đơn gốc (CANCELED + cancelReason)
       └── unique constraint replacedInvoiceId chặn race condition
7. mapper                        Prisma model → DTO (Decimal.toNumber())
8. controller                    createdResponse → 201 { success, data }
9. Nếu có lỗi ở bất kỳ bước nào → next(error)
   → error.middleware.ts map về JSON lỗi thống nhất
```

## Các quyết định thiết kế chính

### 1. Phân lớp + Repository pattern

- Controller **không chứa business logic** — chỉ dịch HTTP ↔ service call.
- Service phụ thuộc **interface** `InvoiceRepository`, không biết gì về Prisma.
- Lợi ích: test service có thể mock repository; đổi ORM/DB chỉ cần viết lại class implement mới.

### 2. Dependency Injection qua container

```ts
// container.ts — wiring thủ công, một dòng mỗi tầng
const invoiceRepository = new PrismaInvoiceRepository(prisma);
const invoiceService = new InvoiceService(invoiceRepository);
const invoiceController = new InvoiceController(invoiceService);
```

### 3. Xử lý lỗi tập trung

Mọi lỗi đều `next(error)` về `error.middleware.ts`, map thống nhất:

| Loại lỗi | HTTP | Code |
|---|---|---|
| `ZodError` | 400 | VALIDATION_ERROR (+ details từng field) |
| `AppError` | theo statusCode | BAD_REQUEST / FORBIDDEN / CONFLICT... |
| Prisma P2002 (unique) | 409 | DUPLICATE_ERROR |
| Prisma P2025 (not found) | 404 | NOT_FOUND |
| Prisma connection | 503 | DATABASE_ERROR |
| Không xác định | 500 | INTERNAL_ERROR |

Envelope thống nhất: `{ success, data }` hoặc `{ success: false, error: { code, message, details? } }`.
