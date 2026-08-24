# API Documentation — Invoice Management API

Base URL: `http://localhost:3000`
Tất cả request/response body dùng JSON, trừ endpoint PDF trả binary.

## Response Envelope

Thành công:

```json
{
  "success": true,
  "data": { ... }
}
```

Lỗi:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [ { "path": ["items"], "message": "Invoice must contain at least one item" } ]
  }
}
```

## Mã trạng thái HTTP

| Code | Khi nào |
|---|---|
| 200 | Thành công (get/list/update/issue/cancel/delete) |
| 201 | Tạo mới thành công (create, replace) |
| 400 | Body/query không hợp lệ, hoặc hành động trái với trạng thái hóa đơn |
| 403 | Hành động bị cấm về nghiệp vụ (xóa hóa đơn ISSUED) |
| 404 | Hóa đơn không tồn tại hoặc đã bị xóa mềm |
| 409 | Conflict — hóa đơn đã bị thay thế |
| 500 / 503 | Lỗi hệ thống / mất kết nối database |

## Error Codes

| Code | Ý nghĩa |
|---|---|
| VALIDATION_ERROR | Dữ liệu không đạt schema |
| NOT_FOUND | Không tìm thấy hóa đơn |
| BAD_REQUEST | Hành động trái quy tắc nghiệp vụ |
| FORBIDDEN | Bị cấm (xóa hóa đơn đã phát hành) |
| CONFLICT | Hóa đơn đã bị thay thế bởi hóa đơn khác |
| DUPLICATE_ERROR | Vi phạm unique constraint |
| DATABASE_ERROR | Lỗi kết nối DB |
| INTERNAL_ERROR | Lỗi không xác định |

## Đối tượng Invoice

```json
{
  "id": 1,
  "invoiceNumber": "INV-2026-A1B2C3D4",
  "status": "ISSUED",
  "customerName": "Cong ty TNHH ABC",
  "customerEmail": "abc@example.com",
  "customerAddress": "123 Nguyen Trai, Quan 1, TP.HCM",
  "customerTaxCode": "0123456789",
  "currency": "VND",
  "subtotal": 220000,
  "taxAmount": 20000,
  "total": 240000,
  "replacedInvoiceId": null,
  "issuedAt": "2026-08-24T10:00:00.000Z",
  "canceledAt": null,
  "cancelReason": null,
  "deletedAt": null,
  "createdAt": "2026-08-24T09:00:00.000Z",
  "updatedAt": "2026-08-24T10:00:00.000Z",
  "items": [
    {
      "id": 1,
      "description": "Dich vu tu van thue",
      "quantity": 2,
      "unitPrice": 100000,
      "amount": 200000,
      "taxRate": 10,
      "taxAmount": 20000
    }
  ]
}
```

Công thức tính: `amount = quantity × unitPrice`, `taxAmount = amount × taxRate / 100`, `subtotal = Σ amount`, `total = subtotal + taxAmount`. Làm tròn 2 chữ số thập phân.

---

## 1. Tạo hóa đơn nháp

```
POST /api/invoices
```

Tạo hóa đơn mới ở trạng thái **DRAFT**. Số hóa đơn tự sinh (`INV-{year}-{uuid}`).

### Request body

| Field | Kiểu | Bắt buộc | Quy tắc |
|---|---|---|---|
| customerName | string | ✅ | 1–255 ký tự |
| customerEmail | string | ❌ | Định dạng email |
| customerAddress | string | ❌ | Tối đa 500 ký tự |
| customerTaxCode | string | ❌ | Tối đa 50 ký tự |
| currency | string | ❌ | `VND` (mặc định) \| `USD` \| `JPY` |
| items | array | ✅ | Tối thiểu 1 phần tử |
| items[].description | string | ✅ | 1–500 ký tự |
| items[].quantity | number | ✅ | Số nguyên dương |
| items[].unitPrice | string | ✅ | Số, tối đa 2 chữ số thập phân (`"100000"`, `"99.5"`) |
| items[].taxRate | string | ✅ | Như unitPrice, và ≤ 100 |

```json
{
  "customerName": "Cong ty TNHH ABC",
  "customerEmail": "abc@example.com",
  "currency": "VND",
  "items": [
    { "description": "Dich vu tu van thue", "quantity": 2, "unitPrice": "100000", "taxRate": "10" }
  ]
}
```

### Response `201 Created`

Trả về đối tượng Invoice đầy đủ (trạng thái `DRAFT`, các trường tiền đã được server tự tính).

### Errors

| Code | Nguyên nhân |
|---|---|
| 400 VALIDATION_ERROR | Thiếu field bắt buộc, sai format... |

---

## 2. Danh sách hóa đơn

```
GET /api/invoices?page=1&limit=20&status=ISSUED
```

### Query parameters

| Param | Mặc định | Quy tắc |
|---|---|---|
| page | 1 | Số nguyên dương |
| limit | 20 | Số nguyên dương, tối đa 100 |
| status | — | `DRAFT` \| `ISSUED` \| `CANCELED` (tùy chọn) |

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "items": [ /* mảng Invoice */ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3
    }
  }
}
```

Sắp xếp theo `createdAt` giảm dần. Không bao gồm hóa đơn đã xóa mềm.

---

## 3. Chi tiết hóa đơn

```
GET /api/invoices/:invoiceNumber
```

### Response `200 OK` — đối tượng Invoice.

### Errors: `404 NOT_FOUND`

---

## 4. Cập nhật hóa đơn nháp

```
PATCH /api/invoices/:invoiceNumber
```

Chỉ áp dụng cho hóa đơn **DRAFT**. Các field gửi lên sẽ được ghi đè; nếu gửi `items` thì **thay thế toàn bộ** items cũ và tự tính lại tổng tiền.

### Request body

Giống endpoint tạo hóa đơn nhưng **tất cả field đều tùy chọn** (chỉ gửi phần cần sửa).

### Response `200 OK` — Invoice sau cập nhật.

### Errors

| Code | Nguyên nhân |
|---|---|
| 400 BAD_REQUEST | `"Invoice is not a draft"` — hóa đơn đã phát hành/hủy |
| 404 NOT_FOUND | Không tồn tại |
| 400 VALIDATION_ERROR | Body sai định dạng |

---

## 5. Phát hành hóa đơn

```
POST /api/invoices/:invoiceNumber/issue
```

Chuyển **DRAFT → ISSUED**, gắn `issuedAt`. Body có thể rỗng `{}` hoặc bỏ hẳn.

### Response `200 OK` — Invoice trạng thái `ISSUED`.

### Errors

| Code | Message |
|---|---|
| 400 BAD_REQUEST | `Only DRAFT invoice can be issued` |
| 404 NOT_FOUND | Không tồn tại |

---

## 6. Hủy hóa đơn

```
POST /api/invoices/:invoiceNumber/cancel
```

Chuyển **ISSUED → CANCELED**, gắn `canceledAt`. Giữ nguyên `issuedAt`.

### Request body

| Field | Kiểu | Bắt buộc | Quy tắc |
|---|---|---|---|
| cancelReason | string | ✅ | Tối đa 500 ký tự |

```json
{ "cancelReason": "Khach yeu cau huy" }
```

### Response `200 OK` — Invoice trạng thái `CANCELED`.

### Errors

| Code | Message |
|---|---|
| 400 BAD_REQUEST | `Only ISSUED invoice can be canceled` |
| 400 VALIDATION_ERROR | Thiếu `cancelReason` |
| 404 NOT_FOUND | Không tồn tại |

---

## 7. Thay thế hóa đơn

```
POST /api/invoices/:invoiceNumber/replace
```

Dùng khi hóađơn đã phát hành (**ISSUED**) có sai sót nội dung. Server thực hiện trong một transaction:

1. Tạo hóa đơn **mới** với dữ liệu sửa lại — trạng thái `ISSUED` ngay lập tức, `replacedInvoiceId` trỏ về hóa đơn gốc
2. Hóa đơn gốc chuyển thành **CANCELED** với `cancelReason` = reason gửi lên (hoặc mặc định `"Replaced by {số hóa đơn mới}"`)
3. Mỗi hóa đơn chỉ được thay thế **một lần** (unique constraint ở DB)

### Request body

Giống endpoint tạo hóa đơn (bắt buộc đủ dữ liệu mới) + thêm:

| Field | Kiểu | Bắt buộc | Quy tắc |
|---|---|---|---|
| reason | string | ❌ | Tối đa 500 ký tự — lý do thay thế |

### Response `201 Created` — **hóa đơn mới** (không phải hóa đơn gốc).

### Errors

| Code | Message |
|---|---|
| 400 BAD_REQUEST | `Only ISSUED invoice can be replaced` |
| 409 CONFLICT | `Invoice already replaced by INV-xxxx` |
| 404 NOT_FOUND | Không tồn tại |

---

## 8. Xuất PDF

```
GET /api/invoices/:invoiceNumber/pdf
```

Trả về **file PDF binary** (không phải JSON envelope).

### Headers response

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="INV-2026-XXXX.pdf"
```

### Nội dung theo trạng thái

| Trạng thái | Kết quả |
|---|---|
| ISSUED | Hóa đơn bình thường |
| CANCELED | Kèm stamp đỏ "ĐÃ HỦY" xoay chéo + lý do/ngày hủy |
| DRAFT | Không cho phép xuất |

> Với Postman: dùng **Send and Download** để lưu file. Browser: dán URL là tự tải xuống.

### Errors

| Code | Message |
|---|---|
| 400 BAD_REQUEST | `Only ISSUED or CANCELED invoice can be exported to PDF` |
| 404 NOT_FOUND | Không tồn tại |

---

## 9. Xóa hóa đơn

```
DELETE /api/invoices/:invoiceNumber
```

**Soft delete** — chỉ set `deletedAt`, dữ liệu vẫn nằm trong DB. Chỉ cho phép xóa hóa đơn **DRAFT** hoặc **CANCELED**; hóa đơn ISSUED là chứng từ pháp lý nên bị chặn.

### Response `200 OK`

```json
{ "success": true, "data": null }
```

### Errors

| Code | Message |
|---|---|
| 403 FORBIDDEN | `Can not delete issued invoice` |
| 404 NOT_FOUND | Không tồn tại hoặc đã xóa trước đó |

---

## Luồng trạng thái tổng hợp

```
              issue                  replace
   ┌───────────────────► ISSUED ─────────────────┐
   │                    │    │                   ▼
DRAFT                cancel  │            gốc → CANCELED
   │                    ▼    │            (mới ISSUED,
   │                 CANCELED◄┘             replacedInvoiceId → gốc)
   │ delete              │
   ▼                     ▼ delete
DELETED ◄────────────────┘
(soft delete)
```

| Từ → Đến | API | Điều kiện |
|---|---|---|
| — → DRAFT | POST /api/invoices | — |
| DRAFT → ISSUED | POST .../issue | — |
| DRAFT → DRAFT | PATCH /api/invoices/:no | Chỉnh nội dung |
| ISSUED → CANCELED | POST .../cancel | Bắt buộc cancelReason |
| ISSUED → ISSUED (mới) + gốc CANCELED | POST .../replace | Gốc chưa từng bị replace |
| DRAFT/CANCELED → DELETED | DELETE /api/invoices/:no | Soft delete |
| ISSUED → bất kỳ sửa/xóa | — | Bị chặn 400/403 |

## Seed data mẫu

Sau khi chạy `npx tsx prisma/seed.ts`, DB có sẵn:

| invoiceNumber | Status | Dùng để thử |
|---|---|---|
| INV-2026-000001 | DRAFT | update, issue, delete |
| INV-2026-000002 | ISSUED | pdf, cancel, replace |
| INV-2026-000003 | CANCELED | pdf (stamp hủy), delete |
