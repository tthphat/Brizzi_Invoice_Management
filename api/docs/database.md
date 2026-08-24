# Database Schema

PostgreSQL, quản lý bằng Prisma ORM (`api/prisma/schema.prisma`). Migration SQL nằm tại `api/prisma/migrations/`.

## Bảng Invoice

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | SERIAL | PK | Khóa chính |
| invoiceNumber | TEXT | **UNIQUE** | Số hóa đơn, định dạng `INV-{year}-{uuid}` |
| status | InvoiceStatus | default `DRAFT` | Trạng thái hiện tại |
| customerName | TEXT | NOT NULL | Tên khách hàng |
| customerEmail | TEXT | nullable | Email khách hàng |
| customerAddress | TEXT | nullable | Địa chỉ |
| customerTaxCode | TEXT | nullable | Mã số thuế |
| currency | Currency | default `VND` | Đơn vị tiền |
| subtotal | DECIMAL(15,2) | NOT NULL | Tổng tiền trước thuế |
| taxAmount | DECIMAL(15,2) | NOT NULL | Tổng tiền thuế |
| total | DECIMAL(15,2) | NOT NULL | subtotal + taxAmount |
| replacedInvoiceId | INTEGER | **UNIQUE**, nullable, FK → Invoice.id | Hóa đơn gốc mà hóa đơn này thay thế |
| issuedAt | TIMESTAMP(3) | nullable | Thời điểm phát hành |
| canceledAt | TIMESTAMP(3) | nullable | Thời điểm hủy |
| cancelReason | TEXT | nullable | Lý do hủy / lý do thay thế |
| deletedAt | TIMESTAMP(3) | nullable | Soft delete (`NULL` = chưa xóa) |
| createdAt | TIMESTAMP(3) | default now() | Thời điểm tạo |
| updatedAt | TIMESTAMP(3) | @updatedAt | Tự cập nhật khi sửa |

### Các cột tiền — vì sao DECIMAL(15,2)

Không dùng FLOAT/DOUBLE cho tiền vì lỗi làm tròn nhị phân. `DECIMAL(15,2)` lưu chính xác, tối đa 13 chữ số nguyên + 2 chữ số lẻ.

### Cột replacedInvoiceId — cơ chế "thay thế"

- Khi hóa đơn A (ISSUED, sai thông tin) được thay bằng hóa đơn B: B.replacedInvoiceId = A.id, đồng thời A bị đánh dấu CANCELED.
- **UNIQUE** trên cột này = mỗi hóa đơn gốc chỉ được thay thế đúng **một lần**, chặn race condition ngay ở mức DB nếu 2 request cùng replace song song.
- Nullable vì đa số hóa đơn không phải bản thay thế.
- Self-relation (`InvoiceReplacement`) cho phép truy ngược: từ hóa đơn mới tìm ra hóa đơn cũ và ngược lại.

## Bảng InvoiceItem

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | SERIAL | PK | Khóa chính |
| invoiceId | INTEGER | NOT NULL, FK → Invoice.id | Hóa đơn cha, **xóa cascade** theo invoice |
| description | TEXT | NOT NULL | Mô tả mặt hàng |
| quantity | INTEGER | NOT NULL | Số lượng |
| unitPrice | DECIMAL(15,2) | NOT NULL | Đơn giá |
| amount | DECIMAL(15,2) | NOT NULL | quantity × unitPrice |
| taxRate | DECIMAL(5,2) | NOT NULL | % thuế (0–100) |
| taxAmount | DECIMAL(15,2) | NOT NULL | amount × taxRate / 100 |

Các cột amount/taxAmount được **lưu sẵn** (denormalized) thay vì tính lúc đọc: giữ nguyên giá trị tại thời điểm xuất hóa đơn — hóa đơn là chứng từ pháp lý, không được "tự thay đổi" khi công thức sau này khác đi.

## Enums

```prisma
enum InvoiceStatus { DRAFT  ISSUED  CANCELED }
enum Currency      { VND    USD     JPY      }
```

## Indexes

| Bảng | Index | Mục đích |
|---|---|---|
| Invoice | `@@index([createdAt])` | Sắp xếp danh sách mặc định (mới nhất trước) |
| Invoice | `@@index([status, createdAt])` | Filter theo trạng thái + sort (GET /invoices?status=...) |
| InvoiceItem | `@@index([invoiceId])` | Join/lấy items theo invoice |

Ngoài ra `invoiceNumber` và `replacedInvoiceId` có unique index tự động từ ràng buộc UNIQUE.

## Soft delete

Không có dòng nào bị DELETE thật. Xóa = set `deletedAt`, mọi truy vấn đọc đều kèm điều kiện `deletedAt IS NULL`. Giúp giữ lịch sử chứng từ và có thể khôi phục.
