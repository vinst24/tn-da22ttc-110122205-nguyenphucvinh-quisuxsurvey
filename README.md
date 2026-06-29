<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-5.1-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-14-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-6.15-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Material_UI-9-007FFF?logo=mui&logoColor=white" alt="MUI" />
  <br />
  <img src="https://img.shields.io/badge/status-thesis-important" alt="Status: Thesis" />
  <img src="https://img.shields.io/badge/coverage-85%25-brightgreen" alt="Coverage" />
</p>

<h1 align="center">
  🧪 QUIS UX Survey
</h1>

<p align="center">
  <strong>Xây dựng hệ thống khảo sát và đánh giá trải nghiệm người dùng đối với giao diện web theo tiêu chuẩn QUIS</strong>
  <br />
  <em>Khóa luận tốt nghiệp — Đại học Trà Vinh</em>
</p>

<p align="center">
  <a href="https://kltn-quis.vercel.app/" target="_blank">🌐 Frontend Demo</a>
  ·
  <a href="https://kltn-quis.onrender.com" target="_blank">⚙️ Backend API</a>
  ·
  <a href="https://github.com/vinst24/tn-da22ttc-110122205-nguyenphucvinh-quisuxsurvey" target="_blank">📦 GitHub Repository</a>
</p>

---

<details>
<summary><strong>📑 Table of Contents</strong></summary>

- [Giới thiệu](#-giới-thiệu)
- [Mục tiêu](#-mục-tiêu)
- [Tính năng](#-tính-năng)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Database](#-database)
- [API Overview](#-api-overview)
- [Hướng dẫn cài đặt](#-hướng-dẫn-cài-đặt)
- [Chạy dự án](#-chạy-dự-án)
- [Seed Database](#-seed-database)
- [Demo](#-demo)
- [Tác giả](#-tác-giả)
- [Giảng viên hướng dẫn](#-giảng-viên-hướng-dẫn)
- [Lời cảm ơn](#-lời-cảm-ơn)

</details>

---

## 📖 Giới thiệu

**QUIS UX Survey** là một hệ thống khảo sát trực tuyến được xây dựng nhằm đánh giá mức độ hài lòng của người dùng đối với giao diện web dựa trên tiêu chuẩn **QUIS (Questionnaire for User Interface Satisfaction)**.

QUIS là một công cụ đo lường được phát triển bởi nhóm nghiên cứu tại **University of Maryland** (1988), sử dụng thang đo **semantic differential scale 1–9** để đánh giá 5 khía cạnh chính của giao diện:

- **Overall Reaction** — Phản ứng tổng thể
- **Screen** — Thiết kế màn hình
- **Terminology** — Thuật ngữ và thông báo
- **Learning** — Khả năng học và ghi nhớ
- **System Capabilities** — Khả năng hệ thống

Hệ thống hỗ trợ đầy đủ quy trình khảo sát: tạo bảng khảo sát, quản lý người tham gia, thu thập phản hồi, phân tích dữ liệu trực quan qua biểu đồ và xuất báo cáo.

---

## 🎯 Mục tiêu

| Mục tiêu | Mô tả |
|----------|-------|
| **Nghiên cứu** | Xây dựng hệ thống khảo sát UX tuân thủ tiêu chuẩn QUIS |
| **Đo lường** | Cung cấp công cụ đánh giá trải nghiệm người dùng một cách khoa học |
| **Phân tích** | Tự động phân tích và trực quan hóa kết quả khảo sát |
| **Đa đối tượng** | Hỗ trợ admin, user đã đăng ký và guest tham gia khảo sát |

---

## ✨ Tính năng

| Tính năng | Mô tả | Quyền truy cập |
|-----------|-------|----------------|
| **Quản lý khảo sát** | CRUD surveys, cấu hình thời gian, trạng thái hoạt động | Admin |
| **Quản lý danh mục QUIS** | Quản lý 5 nhóm tiêu chí QUIS | Admin |
| **Quản lý câu hỏi** | Tạo, sửa, xóa câu hỏi theo từng danh mục | Admin |
| **Survey Token** | Tạo mã truy cập cho guest, giới hạn số lần sử dụng | Admin |
| **Khảo sát Guest** | Tham gia khảo sát không cần tài khoản, dùng token | Guest |
| **Khảo sát User** | Tham gia khảo sát sau khi đăng nhập | User |
| **Autosave** | Tự động lưu tiến độ khảo sát | Guest / User |
| **Resume Survey** | Tiếp tục khảo sát từ lần cuối | Guest / User |
| **Dashboard thống kê** | Tổng quan số liệu khảo sát | Admin |
| **Radar Chart** | Biểu đồ radar so sánh điểm theo danh mục | Admin |
| **Bar Chart** | Biểu đồ cột phân tích chi tiết | Admin |
| **Pie Chart** | Biểu đồ tròn phân bố điểm | Admin |
| **Line Chart** | Biểu đồ đường xu hướng theo thời gian | Admin |
| **Doughnut Chart** | Biểu đồ donut tỷ lệ hoàn thành | Admin |
| **Quản lý người tham gia** | Xem, xóa, xuất danh sách participant | Admin |
| **Authentication** | Đăng ký, đăng nhập, đăng xuất | Public |
| **Refresh Token Rotation** | Xoay vòng refresh token, phát hiện đánh cắp | System |
| **Role-based Access Control** | Phân quyền Admin / User | System |
| **Xuất báo cáo** | Export Excel, PDF | Admin |

---

## 🏗️ Kiến trúc hệ thống

```mermaid
graph TB
    subgraph Client["Frontend (React 19 + Vite)"]
        A[React App] --> B[React Router DOM]
        A --> C[Material UI / TailwindCSS]
        A --> D[Chart.js / Recharts]
        A --> E[React Hook Form + Zod]
        A --> F[Axios HTTP Client]
        B --> G[Pages & Components]
        F --> H[API Service Layer]
    end

    subgraph Server["Backend (Node.js + Express 5)"]
        I[Express Server] --> J[Middlewares]
        J --> K[Auth / Rate Limit / Validation]
        I --> L[Controllers]
        L --> M[Services]
        M --> N[Repositories]
        N --> O[Prisma ORM]
        O --> P[(PostgreSQL)]
        M --> Q[Analytics Engine]
        Q --> R[PDF / Excel Export]
    end

    subgraph Auth["Authentication Flow"]
        S[JWT Access Token] --> T[HTTP-only Cookie]
        U[Refresh Token] --> V[Rotation Strategy]
        V --> W[Theft Detection]
    end

    Client -->|HTTP / JSON| Server
    Server --> Auth
```

### Luồng xác thực

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database

    U->>F: Đăng nhập
    F->>B: POST /auth/login
    B->>DB: Verify credentials
    B-->>F: Set HTTP-only cookie + access token
    F->>B: Request with access token
    B->>B: Verify JWT
    B-->>F: Response data
    Note over B: Access token expires → use refresh token
    F->>B: POST /auth/refresh
    B->>DB: Rotate refresh token
    B-->>F: New access token + new cookie
```

---

## 🛠️ Công nghệ sử dụng

### Frontend

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| [React](https://react.dev/) | 19.2.6 | UI Library |
| [TypeScript](https://www.typescriptlang.org/) | 6.0 | Type safety |
| [Vite](https://vite.dev/) | 8.0 | Build tool & dev server |
| [Material UI](https://mui.com/) | 9.0 | Component library |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Utility-first styling |
| [Emotion](https://emotion.sh/) | 11.14 | CSS-in-JS |
| [React Router DOM](https://reactrouter.com/) | 7.15 | Client-side routing |
| [React Hook Form](https://react-hook-form.com/) | 7.76 | Form management |
| [Chart.js](https://www.chartjs.org/) | 4.5 | Canvas-based charts |
| [Recharts](https://recharts.org/) | 3.8 | React charting library |
| [Axios](https://axios-http.com/) | 1.16 | HTTP client |
| [Zod](https://zod.dev/) | 4.4 | Schema validation |
| [Lucide React](https://lucide.dev/) | 1.16 | Icon library |
| [xlsx](https://sheetjs.com/) | 0.18 | Excel export |

### Backend

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| [Node.js](https://nodejs.org/) | ≥20 | Runtime |
| [Express](https://expressjs.com/) | 5.1 | Web framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.9 | Type safety |
| [Prisma](https://www.prisma.io/) | 6.15 | ORM & migrations |
| [PostgreSQL](https://www.postgresql.org/) | ≥14 | Relational database |
| [JWT](https://jwt.io/) | — | Access token |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | 6.0 | Password hashing |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | 8.1 | Rate limiting |
| [PDFKit](https://pdfkit.org/) | 0.19 | PDF generation |
| [simple-statistics](https://simplestatistics.org/) | 7.9 | Statistical analysis |
| [Zod](https://zod.dev/) | 4.0 | Request validation |

### Testing & DevOps

| Công cụ | Mục đích |
|---------|----------|
| [Vitest](https://vitest.dev/) | Unit & integration testing |
| [Playwright](https://playwright.dev/) | End-to-end testing |
| [ESLint](https://eslint.org/) | Code linting |
| [Prettier](https://prettier.io/) | Code formatting |
| [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces) | Monorepo management |

---

## 📁 Cấu trúc thư mục

```
tn-da22ttc-110122205-nguyenphucvinh-quisuxsurvey/
├── docs/                               # Tài liệu khóa luận
│   ├── 110122205_NguyenPhucVinh_DeCuongChiTiet/
│   ├── 110122205_NguyenPhucVinh_KhoaLuanTotNghiep/
│   ├── 110122205_NguyenPhucVinh_Poster/
│   └── 110122205_NguyenPhucVinh_Slide/
│
├── src/                                # Mã nguồn chính (monorepo)
│   ├── client/                         # Frontend React application
│   │   ├── public/                     # Static assets
│   │   ├── e2e/                        # Playwright E2E tests
│   │   └── src/
│   │       ├── api/                    # Axios instance & interceptors
│   │       ├── assets/                 # Images, icons
│   │       ├── charts/                 # Chart.js & Recharts wrappers
│   │       ├── components/             # Reusable UI components
│   │       ├── constants/              # App constants, QUIS categories
│   │       ├── contexts/               # React Context (Auth, Notification)
│   │       ├── data/                   # Static data & repository patterns
│   │       ├── domain/                 # Domain models & interfaces
│   │       ├── hooks/                  # Custom React hooks
│   │       ├── layouts/                # Layout components (Admin, Public)
│   │       ├── pages/                  # Page components
│   │       │   └── admin/              # Admin pages (Dashboard, Analytics, ...)
│   │       ├── routes/                 # React Router configuration
│   │       ├── services/               # API service layer
│   │       ├── store/                  # State management
│   │       ├── theme/                  # MUI theme & design tokens
│   │       ├── types/                  # TypeScript type definitions
│   │       ├── usecases/               # Business logic use cases
│   │       ├── utils/                  # Utility functions
│   │       └── validators/             # Zod validation schemas
│   │
│   ├── server/                         # Backend Express API
│   │   ├── prisma/
│   │   │   ├── schema.prisma           # Database schema
│   │   │   ├── seed.ts                 # Main seed script
│   │   │   ├── seed-surveys.ts         # Seed surveys
│   │   │   ├── seed-participants.ts    # Seed participants
│   │   │   ├── seed-responses.ts       # Seed responses
│   │   │   ├── seed-tokens.ts          # Seed tokens
│   │   │   └── migrations/             # Prisma migration files
│   │   └── src/
│   │       ├── configs/                # App configuration (env, cors, cookies)
│   │       ├── constants/              # Server constants
│   │       ├── controllers/            # Route handlers
│   │       ├── jobs/                   # Background jobs (cleanup drafts)
│   │       ├── middlewares/            # Auth, validation, error handling
│   │       ├── prisma/                 # Prisma client singleton
│   │       ├── repositories/           # Data access layer
│   │       ├── routes/                 # Express route definitions
│   │       ├── services/               # Business logic layer
│   │       ├── types/                  # TypeScript types
│   │       ├── utils/                  # Utility functions
│   │       ├── validations/            # Zod request validation schemas
│   │       └── app.ts                  # Application entry point
│   │
│   ├── package.json                    # Root monorepo config
│   ├── .env.example                    # Environment template
│   └── README.md                       # Source-level README
│
└── README.md                           # This file
```

---

## 🗄️ Database

### Mô hình quan hệ

```mermaid
erDiagram
    User ||--o{ RefreshToken : has
    User ||--o| Participant : maps_to
    Participant ||--o{ Response : submits
    Survey ||--o{ SurveyCategory : contains
    Survey ||--o{ SurveyToken : has
    Survey ||--o{ Response : receives
    Category ||--o{ SurveyCategory : included_in
    Category ||--o{ Question : has
    Question ||--o{ ResponseDetail : answered_in
    Response ||--o{ ResponseDetail : consists_of
    Response ||--o| Participant : belongs_to
```

### Danh sách bảng

| Bảng | Mô tả |
|------|-------|
| `users` | Tài khoản hệ thống (ADMIN / USER) |
| `refresh_tokens` | Quản lý phiên đăng nhập, hỗ trợ rotation & theft detection |
| `participants` | Người tham gia khảo sát (guest hoặc user có tài khoản) |
| `surveys` | Khảo sát QUIS với slug, trạng thái, thời hạn |
| `survey_tokens` | Mã truy cập khảo sát dành cho guest |
| `categories` | Nhóm tiêu chí QUIS (Overall, Screen, Terminology, Learning, System Capabilities) |
| `survey_categories` | Bảng nối Survey ↔ Category, có thứ tự hiển thị |
| `questions` | Câu hỏi thuộc category, thang đo 1–9 |
| `responses` | Lần submit khảo sát, lưu tiến độ & autosave |
| `response_details` | Điểm trả lời cho từng câu hỏi |

---

## 📡 API Overview

Base URL: `/api`

### Health

| Method | Endpoint | Mô tả | Auth |
|--------|----------|------|------|
| `GET` | `/health` | Kiểm tra server | — |

### Authentication

| Method | Endpoint | Mô tả | Auth |
|--------|----------|------|------|
| `POST` | `/auth/register` | Đăng ký tài khoản | — |
| `POST` | `/auth/login` | Đăng nhập | — |
| `POST` | `/auth/refresh` | Làm mới access token | Cookie |
| `POST` | `/auth/logout` | Đăng xuất | Optional |
| `GET` | `/auth/me` | Lấy thông tin user hiện tại | Optional |
| `PATCH` | `/auth/me` | Cập nhật hồ sơ | Required |
| `POST` | `/auth/me/password` | Đổi mật khẩu | Required |

### Surveys

| Method | Endpoint | Mô tả | Auth |
|--------|----------|------|------|
| `GET` | `/surveys` | Danh sách khảo sát (có phân trang, filter) | — |
| `GET` | `/surveys/:slug` | Chi tiết khảo sát theo slug | — |
| `GET` | `/surveys/:slug/take` | Lấy khảo sát để làm (kèm token validation) | — |
| `GET` | `/surveys/admin/:id` | Chi tiết khảo sát (Admin) | Admin |
| `POST` | `/surveys` | Tạo khảo sát mới | Admin |
| `PUT` | `/surveys/:id` | Cập nhật khảo sát | Admin |
| `DELETE` | `/surveys/:id` | Xóa khảo sát | Admin |

### Survey Tokens

| Method | Endpoint | Mô tả | Auth |
|--------|----------|------|------|
| `GET` | `/survey-tokens/:code` | Kiểm tra token hợp lệ | — |
| `POST` | `/surveys/:id/tokens` | Tạo token cho survey | Admin |
| `GET` | `/surveys/:id/tokens` | Danh sách token của survey | Admin |
| `DELETE` | `/tokens/:id` | Xóa token | Admin |

### Categories

| Method | Endpoint | Mô tả | Auth |
|--------|----------|------|------|
| `GET` | `/categories` | Danh sách categories (filter theo survey) | — |
| `GET` | `/categories/:id` | Chi tiết category | — |
| `POST` | `/categories` | Tạo category mới | Admin |
| `PUT` | `/categories/:id` | Cập nhật category | Admin |
| `DELETE` | `/categories/:id` | Xóa category | Admin |

### Questions

| Method | Endpoint | Mô tả | Auth |
|--------|----------|------|------|
| `GET` | `/questions` | Danh sách câu hỏi (filter theo category) | — |
| `GET` | `/questions/:id` | Chi tiết câu hỏi | — |
| `POST` | `/questions` | Tạo câu hỏi mới | Admin |
| `PUT` | `/questions/:id` | Cập nhật câu hỏi | Admin |
| `DELETE` | `/questions/:id` | Xóa câu hỏi | Admin |

### Responses

| Method | Endpoint | Mô tả | Auth |
|--------|----------|------|------|
| `POST` | `/responses` | Submit response hoàn chỉnh | Optional |
| `GET` | `/responses/draft` | Lấy bản nháp | Optional |
| `POST` | `/responses/draft` | Lưu bản nháp (autosave) | Optional |
| `DELETE` | `/responses/draft` | Xóa bản nháp | Optional |
| `POST` | `/responses/complete` | Đánh dấu hoàn thành khảo sát | Optional |
| `GET` | `/responses/me` | Danh sách response của user | Required |
| `GET` | `/responses/me/:surveyId/history` | Lịch sử làm survey | Required |
| `GET` | `/responses` | Danh sách tất cả responses | Admin |
| `DELETE` | `/admin/responses/drafts/cleanup` | Dọn dẹp draft cũ | Admin |

### Participants

| Method | Endpoint | Mô tả | Auth |
|--------|----------|------|------|
| `GET` | `/participants/guest/info` | Lấy thông tin guest từ cookie | — |
| `GET` | `/admin/participants` | Danh sách participants | Admin |
| `GET` | `/admin/participants/export` | Xuất Excel participants | Admin |
| `GET` | `/admin/participants/specialty-stats` | Thống kê theo chuyên ngành | Admin |
| `GET` | `/admin/participants/:id` | Chi tiết participant | Admin |
| `DELETE` | `/admin/participants/:id` | Xóa participant | Admin |

### Dashboard & Analytics

| Method | Endpoint | Mô tả | Auth |
|--------|----------|------|------|
| `GET` | `/dashboard/surveys` | Tổng quan số liệu surveys | Admin |
| `GET` | `/dashboard/analytics` | Phân tích UX chi tiết theo survey | Admin |
| `GET` | `/dashboard/analytics/compare` | So sánh analytics giữa các survey | Admin |
| `GET` | `/admin/analytics/export` | Xuất báo cáo PDF/Excel | Admin |

---

## 🚀 Hướng dẫn cài đặt

### Yêu cầu hệ thống

- **Node.js** ≥ 20
- **PostgreSQL** ≥ 14
- **npm** ≥ 10

### Bước 1: Clone repository

```bash
git clone https://github.com/vinst24/tn-da22ttc-110122205-nguyenphucvinh-quisuxsurvey.git
cd tn-da22ttc-110122205-nguyenphucvinh-quisuxsurvey
```

### Bước 2: Di chuyển vào thư mục mã nguồn

```bash
cd src
```

### Bước 3: Cài dependencies

```bash
npm install
```

### Bước 4: Cấu hình môi trường

```bash
# Backend
cp server/.env.example server/.env

# Frontend (nếu cần)
cp client/.env.example client/.env
```

### Bước 5: Cấu hình database

Chỉnh sửa file `server/.env`:

```env
NODE_ENV=development
PORT=4000

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/KLTN_QUIS?schema=public"

CORS_ORIGIN=http://localhost:5173

JWT_ACCESS_SECRET=your_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars

COOKIE_SECURE=false

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe_12345678
ADMIN_FULL_NAME=System Admin
```

### Bước 6: Khởi tạo database

```bash
# Generate Prisma client
npm -w server run prisma:generate

# Chạy migrations
npm -w server run prisma:migrate
```

---

## 💻 Chạy dự án

> **Lưu ý:** Các lệnh dưới đây được thực thi từ thư mục `src/`.

### Development

```bash
# Chạy đồng thời cả client & server
npm run dev

# Hoặc chạy riêng từng service
npm -w server run dev    # Backend → http://localhost:4000
npm -w client run dev    # Frontend → http://localhost:5173
```

### Production build

```bash
npm run build
```

### Testing

```bash
# Backend tests
npm -w server run test

# Frontend tests
npm -w client run test

# E2E tests
npm -w client run e2e
```

### Code quality

```bash
# Lint
npm run lint

# Format
npm run format

# Check format
npm run format:check
```

---

## 🌱 Seed Database

Hệ thống cung cấp các script seed để tạo dữ liệu mẫu:

```bash
# Seed tài khoản admin (cấu hình trong .env)
npm -w server run prisma:seed

# Seed surveys mẫu
npm -w server run prisma:seed:surveys

# Seed participants mẫu
npm -w server run prisma:seed:participants

# Seed responses mẫu
npm -w server run prisma:seed:responses

# Seed tokens mẫu
npm -w server run prisma:seed:tokens
```

> **Lưu ý:** Chạy theo thứ tự trên để đảm bảo dữ liệu tham chiếu hợp lệ.

---

## 🎬 Demo

### URL triển khai

| Service | URL |
|---------|-----|
| **Frontend** | [https://kltn-quis.vercel.app/](https://kltn-quis.vercel.app/) |
| **Backend API** | [https://kltn-quis.onrender.com](https://kltn-quis.onrender.com) |

---

## 👤 Tác giả

**Nguyễn Phúc Vinh**

- 📧 Email: [vinh24122004@gmail.com](mailto:vinh24122004@gmail.com)
- 📧 Email sinh viên: [110122205@st.tvu.edu.vn](mailto:110122205@st.tvu.edu.vn)
- 🐙 GitHub: [@vinst24](https://github.com/vinst24)
- 🏫 Trường Kỹ thuật và Công nghệ — Đại học Trà Vinh

---

## 👩‍🏫 Giảng viên hướng dẫn

**ThS. Phan Thị Phương Nam**

- Khoa Công nghệ thông tin
- Trường Kỹ thuật và Công nghệ — Đại học Trà Vinh

---

## 🙏 Lời cảm ơn

Đề tài khóa luận này được hoàn thành với sự hướng dẫn tận tình của **ThS. Phan Thị Phương Nam**. Em xin gửi lời cảm ơn chân thành đến cô đã định hướng, hỗ trợ và đồng hành trong suốt quá trình thực hiện.

Em cũng xin cảm ơn:

- Quý thầy cô Khoa Công nghệ thông tin, Trường Kỹ thuật và Công nghệ — Đại học Trà Vinh đã truyền đạt kiến thức quý báu trong suốt những năm học.
- Gia đình và bạn bè đã luôn động viên, hỗ trợ trong suốt thời gian học tập và nghiên cứu.

---

<p align="center">
  <strong>Trường Kỹ thuật và Công nghệ — Đại học Trà Vinh</strong>
  <br />
  <em>© 2026 Nguyễn Phúc Vinh</em>
</p>