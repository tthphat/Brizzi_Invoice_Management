# Invoice Management API

API quản lý hóa đơn điện tử xây dựng cho bài tập kỹ thuật (Intern Technical Test).

Hỗ trợ đầy đủ vòng đời hóa đơn: tạo nháp → phát hành → hủy / thay thế, kèm xuất hóa đơn ra file PDF và bộ test tự động.

## Tech Stack

- **Runtime:** Node.js + TypeScript (ESM)
- **Framework:** Express 5
- **Database:** PostgreSQL + Prisma ORM (migration SQL)
- **Validation:** Zod
- **Tính toán tiền:** decimal.js (tránh lỗi số học float)
- **PDF export:** pdfmake
- **Testing:** Vitest + Supertest

## Tính năng

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/invoices` | Tạo hóa đơn nháp (DRAFT), tự tính subtotal/tax/total |
| GET | `/api/invoices` | Danh sách hóa đơn (phân trang `page`, `limit`, lọc `status`) |
| GET | `/api/invoices/:invoiceNumber` | Chi tiết một hóa đơn |
| PATCH | `/api/invoices/:invoiceNumber` | Cập nhật hóa đơn nháp (chỉ DRAFT) |
| POST | `/api/invoices/:invoiceNumber/issue` | Phát hành hóa đơn (DRAFT → ISSUED) |
| POST | `/api/invoices/:invoiceNumber/cancel` | Hủy hóa đơn (ISSUED → CANCELED), bắt buộc `cancelReason` |
| POST | `/api/invoices/:invoiceNumber/replace` | Thay thế hóa đơn đã phát hành bằng hóa đơn mới |
| GET | `/api/invoices/:invoiceNumber/pdf` | Tải hóa đơn dạng PDF |
| DELETE | `/api/invoices/:invoiceNumber` | Soft delete — chỉ DRAFT/CANCELED |

### Luồng trạng thái

```
            issue                replace (tạo mới + hủy gốc)
DRAFT ────────────► ISSUED ────────────────┐
  │                   │                    ▼
  │ delete            | cancel           CANCELED (gốc)
  ▼                   ▼
DELETED           CANCELED
```

Quy tắc chuyển trạng thái được validate ở service layer:

- Chỉ `DRAFT` được phát hành (`issue`)
- Chỉ `ISSUED` bị hủy (`cancel`)
- Chỉ `ISSUED` được thay thế (`replace`); mỗi hóa đơn chỉ thay thế đúng 1 lần (unique constraint trên `replacedInvoiceId`)
- Hóa đơn đã `ISSUED` không được sửa nội dung hay xóa

### Replace hoạt động thế nào

Khi gọi `POST .../replace`, server thực hiện trong **một transaction**:

1. Re-check trạng thái gốc bên trong transaction (chống race condition)
2. Tạo hóa đơn mới với dữ liệu sửa lại, trạng thái `ISSUED`, `replacedInvoiceId` trỏ về hóa đơn gốc
3. Đánh dấu hóa đơn gốc thành `CANCELED` với lý do tương ứng

Unique constraint ở DB đảm bảo không bao giờ có 2 hóa đơn cùng thay thế một hóa đơn gốc.

### PDF Export

- Hóa đơn `ISSUED`: xuất bình thường
- Hóa đơn `CANCELED`: xuất kèm stamp đỏ "ĐÃ HỦY" + lý do/ngày hủy (hóa đơn hủy vẫn cần lưu chứng từ)
- Hóa đơn `DRAFT`: không cho phép xuất (400)

## Cài đặt & Chạy

**Yêu cầu:** Node.js ≥ 20, Docker Desktop.

### 1. Dựng PostgreSQL bằng Docker

Project có sẵn `api/docker-compose.yml` (Postgres 16):

```bash
cd api

# Khởi động container (chạy nền)
docker compose up -d

# Kiểm tra container đã chạy
docker compose ps
```

Thông tin kết nối của container:

| Tham số | Giá trị |
|---|---|
| Host | `localhost:5432` |
| User / Password | `postgres` / `postgres` |
| Database | `brizzi_postgres` |

### 2. Cấu hình biến môi trường

Tạo file `.env` trong thư mục `api/` với nội dung sau (đã khớp với docker-compose):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brizzi_postgres?schema=public"
PORT=3000
```

### 3. Cài package + migration

```bash
npm install

# Tạo bảng từ migration SQL
npx prisma migrate dev

# Sinh Prisma client (thường migrate dev tự chạy sẵn)
npx prisma generate

# Seed DB
npx tsx prisma/seed.ts
```

Project có sẵn script seed tại `api/prisma/seed.ts`, tạo 3 hóa đơn mẫu đại diện đủ 3 trạng thái:

| invoiceNumber | Trạng thái | Ghi chú |
|---|---|---|
| `INV-2026-000001` | DRAFT | Có thể sửa/xóa/issue |
| `INV-2026-000002` | ISSUED | Có thể tải PDF, cancel, replace |
| `INV-2026-000003` | CANCELED | Có PDF kèm stamp hủy + lý do |

### 5. Chạy server

```bash
# Dev mode (auto reload)
npm run dev
# -> Server running on port 3000
```

Các script khác:

```bash
npm run build      # compile TypeScript -> dist/
npm start          # chạy bản build
npm run test:run   # chạy toàn bộ test

# Dừng/xóa database khi không dùng nữa
docker compose down            # giữ data (volume)
docker compose down -v         # xóa cả data
```

> Lưu ý: integration test cần `.env` có `DATABASE_URL` trỏ đến DB đang chạy; nếu không có biến này test sẽ tự skip phần tích hợp DB.

## Test API bằng Postman

1. Import file `api/postman/invoice-management.postman_collection.json` vào Postman
2. Chạy thư mục **Full Lifecycle Flow** theo thứ tự từ trên xuống — biến `{{invoiceNumber}}` / `{{replacementInvoiceNumber}}` được tự động chain giữa các request, kèm test script assert kết quả từng bước
3. Thư mục **Validation & Not Found** chứa các case lỗi chạy độc lập
4. Với request Export PDF: bấm mũi tên cạnh nút **Send** → chọn **Send and Download** để lưu file PDF ra máy (PDF của hóa đơn CANCELED phải có stamp "ĐÃ HỦY")

## Cấu trúc thư mục

```
api/
├── prisma/
│   ├── schema.prisma           # ORM schema
│   └── migrations/             # Migration SQL
├── src/
│   ├── modules/invoice/        # Feature module chính
│   │   ├── invoice.routes.ts       # Định nghĩa routes + validation middleware
│   │   ├── invoice.controller.ts   # HTTP layer (request/response)
│   │   ├── invoice.service.ts      # Business logic + validate transition
│   │   ├── invoice.repository.ts   # Interface repository
│   │   ├── prisma-invoice.repository.ts # Implement Prisma (transaction...)
│   │   ├── invoice.calculator.ts   # Tính tiền bằng Decimal
│   │   ├── invoice.pdf.ts          # Render PDF bằng pdfmake
│   │   ├── invoice.validation.ts   # Zod schemas
│   │   └── invoice.type.ts         # Types domain
│   ├── lib/                    # Response helper, error codes, prisma client
│   ├── middlewares/            # Validate, error handler
│   └── app.ts                  # Express app
└── tests/                      # Unit + integration tests (Vitest)
```

Kiến trúc phân lớp: `routes → controller → service → repository`. Service không biết gì về HTTP; repository giấu chi tiết Prisma — giúp test và thay đổi DB dễ hơn.

## Kiến thức học được

- **Xử lý tiền tệ với Decimal:** không dùng số float cho tiền vì lỗi làm tròn binary (`0.1 + 0.2 ≠ 0.3`). Dùng `decimal.js` tính amount/tax/totals rồi mới convert sang number khi lưu.
- **State machine cho nghiệp vụ hóa đơn:** hóa đơn là tài liệu pháp lý nên việc sửa/xóa phải chặt theo trạng thái. Validate transition tập trung ở service layer thay vì rải rác.
- **Transaction chống race condition:** API replace có nguy cơ 2 request song song cùng thay thế một hóa đơn. Giải pháp: re-check điều kiện bên trong transaction + unique constraint ở DB làm "lưới an toàn" cuối cùng.
- **Soft delete:** xóa = set `deletedAt`, mọi query phải nhớ filter. Giúp giữ lịch sử chứng từ.
- **Layered architecture + dependency injection qua container:** service nhận repository qua constructor, dễ mock khi test.
- **Zod validation middleware:** schema vừa validate vừa transform (string tiền → number), type được infer tự động.
- **PDF generation:** pdfmake khai báo layout bằng JSON; font Roboto hỗ trợ tiếng Việt; watermark/stamp chỉ là text element đặt `absolutePosition`.
- **RESTful design:** tách action rõ nghĩa (`/issue`, `/cancel`, `/replace`) thay vì một endpoint `PATCH /status` chung chung — mỗi action có body/validation riêng.

## Khó khăn gặp phải

- **Xử lý tiền tệ giữa Prisma Decimal và number của JavaScript:** Javascript chỉ có kiểu number mà nếu dùng number để tính bằng toán tử `+`/`*` thì dễ dính lỗi làm tròn float (`0.1 + 0.2 = 0.30000000000000004`). Cuối cùng sữa lỗi bằng cách tính toán ở service dùng `decimal.js`, chỉ convert `.toNumber()` tại mapper khi trả response từ DB, DB giữ nguyên `DECIMAL(15,2)`.
- **Font tiếng Việt trong PDF:** font mặc định của PDF không hiển thị đủ dấu tiếng Việt; phải resolve đường dẫn font Roboto ship kèm package qua `createRequire` (vì project dùng ESM).
- **Phân biệt lỗi khi hóa đơn đã bị thay thế:** ban đầu replace lần 2 trả 400 chung chung ("Only ISSUED..."), gây hiểu nhầm cho client. Sửa thành query xem hóa đơn có con trỏ về nó không để trả 409 CONFLICT kèm số hóa đơn thay thế.
- **Thiết kế replace atomic:** nếu tạo hóa đơn mới xong mà update hóa đơn gốc thất bại sẽ có 2 hóa đơn hợp lệ cho cùng một giao dịch. Bắt buộc gói cả hai thao tác vào một transaction.

## Estimate thời gian

| Hạng mục | Estimate | Thực tế | Chênh lệch & nguyên nhân |
|---|---|---|---|
| Setup project + Prisma + Docker DB + migration | 4h | 3h | -1h — docker-compose có sẵn, migrate chạy lần đầu thuận lợi |
| CRUD cơ bản + validation (Zod) | 8h | 10h | +2h — các case biên của validation tiền tệ (unitPrice tối đa 2 chữ số thập phân, taxRate 0-100...) mất thời gian hơn dự tính |
| State machine (issue/cancel) | 4h | 3h | -1h — logic transition đơn giản hơn nghĩ ban đầu khi đã tập trung validate ở service layer |
| Replace hóa đơn + transaction | 6h | 8h | +2h — phát sinh xử lý race condition, phân biệt lỗi 400/409 khi hóa đơn đã bị replace |
| Viết test (unit + integration) | 8h | 9h | |
| Postman collection + README | 4h | 5h | |

