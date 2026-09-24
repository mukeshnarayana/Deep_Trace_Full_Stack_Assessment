# AegisGuard | Multi-Tenant Security Management Platform (Frontend)

A modern, accessible, and responsive frontend built with **React 19, Vite, Tailwind CSS, React Router v7, and Axios**. The application interfaces directly with the Multi-Tenant Security Platform REST API, adhering strictly to multi-tenant isolation boundaries, granular Role-Based Access Control (RBAC), and server-side state persistence.

---

## 🛠 Tech Stack & Architecture

- **Framework**: React 19 + Vite (Fast HMR)
- **Styling**: Tailwind CSS (Clean white & slate/gray theme with indigo accent; semantic muted badges for severities and statuses)
- **Routing**: React Router v7 with `ProtectedRoute` and `RoleRoute` guards
- **HTTP Client**: Axios with centralized request/response interceptors for Bearer token injection and automatic 401 session revocation
- **Icons**: Lucide React
- **State & Data Flow**: Context API (`AuthContext`, `ToastContext`), Custom Hooks (`useAuth`, `useToast`, `useDebounce`, `useQueryParams`)

---

## 🚀 Quick Start & Setup

### 1. Prerequisites
Ensure the backend server is running on `http://localhost:5000` (refer to `../Backend/README.md`).

### 2. Environment Variables
Configuration is defined in `.env` (a template is provided in `.env.example`):

```bash
VITE_API_URL=http://localhost:5000/api
```

### 3. Install Dependencies
From the `Frontend` directory:
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to the local Vite URL (typically `http://localhost:5173`).

---

## 👥 Verified Seed Credentials

> **Default Password for all seed accounts:** `Password123!`
>
> *Tip: The login screen also features single-click quick-fill buttons for these accounts.*

| Tenant | Role | Email | Password | Permissions Summary |
| :--- | :--- | :--- | :--- | :--- |
| **Acme Bank** | `ADMIN` | `admin@acmebank.com` | `Password123!` | Complete tenant authority, user CRUD, audit logs |
| **Acme Bank** | `MANAGER` | `manager@acmebank.com` | `Password123!` | Campaigns & Events CRUD, view users, user assignments |
| **Acme Bank** | `USER` | `user1@acmebank.com` | `Password123!` | Read-only view of assigned campaigns & security events |
| **Acme Bank** | `USER` | `user2@acmebank.com` | `Password123!` | Read-only view of assigned campaigns & security events |
| **Zen Retail** | `ADMIN` | `admin@zenretail.io` | `Password123!` | Full control within Zen Retail tenant |
| **Zen Retail** | `MANAGER` | `manager@zenretail.io` | `Password123!` | Manager permissions within Zen Retail |
| **Zen Retail** | `USER` | `user1@zenretail.io` | `Password123!` | Assigned view within Zen Retail |

---

## 🛡 How Role-Based UI (RBAC) Works

The platform uses client-side RBAC guards for a seamless user experience, while treating the backend REST API as the authoritative enforcer:

| Feature / Screen | ADMIN | MANAGER | USER | Implementation Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Dashboard** | ✅ | ✅ | ✅ | Scoped metrics; recent activity audit list shown to ADMIN/MANAGER |
| **Campaigns List** | ✅ (All) | ✅ (All) | 👁 (Assigned only) | USER role sees only assigned campaigns via server query |
| **Campaign Create / Edit** | ✅ | ✅ | ❌ | Hidden buttons for USER; backend rejects non-admin/manager |
| **Campaign Lifecycle Transitions** | ✅ | ✅ | ❌ | State machine enforces valid next statuses (`DRAFT` &rarr; `ACTIVE` / `CANCELLED`; `ACTIVE` &rarr; `COMPLETED` / `CANCELLED`) |
| **Campaign Assign / Remove Users** | ✅ | ✅ | ❌ | Candidate users verified within the authenticated tenant |
| **Campaign Delete** | ✅ | ❌ | ❌ | ADMIN only; guarded with destructive `ConfirmDialog` |
| **Security Events List** | ✅ | ✅ | ✅ | Severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), status, and date filters |
| **Security Events Create / Edit** | ✅ | ✅ | ❌ | ADMIN & MANAGER can log incidents and transition triage status |
| **Users Directory** | ✅ (Full CRUD) | 👁 (Read-only) | 🚫 (Hidden & Guarded) | Menu item hidden for USER; protected via `RoleRoute` |
| **Audit Logs** | ✅ | 🚫 (Hidden & Guarded) | 🚫 (Hidden & Guarded) | Visible strictly to ADMIN; append-only audit trail with metadata JSON inspector |

---

## 🔒 Security & Multi-Tenant Isolation

1. **No Client-Supplied Tenant or Role Payloads**:
   - `tenantId` is **never** sent in request bodies or query strings.
   - The backend extracts `tenantId` directly from the authenticated JWT token.
2. **JWT Storage & Automatic Revocation**:
   - JWT tokens are stored in `localStorage` under `auth_token` and automatically attached via Axios interceptors.
   - If an account is deactivated or logged out, the backend bumps `tokenVersion`. On any subsequent `401 Unauthorized` response, the client clears credentials and redirects to `/login`.
3. **No Unsanitized HTML**:
   - All text outputs and JSON metadata are rendered as standard React text nodes (no `dangerouslySetInnerHTML`), preventing XSS vulnerabilities.
4. **URL Query String State Sync**:
   - Pagination, search terms, and filters persist in the URL query string (`?page=1&status=ACTIVE&search=...`) so bookmarking and page reloads maintain identical state without client-side data leaks.

---

## 📂 Project Structure

```text
Frontend/
├── .env                  # Environment configuration
├── .env.example          # Environment template
├── index.html            # App entry HTML & metadata
├── package.json          # Dependencies & scripts
├── tailwind.config.js    # Tailwind theme configuration
├── postcss.config.js     # PostCSS setup
└── src/
    ├── api/              # Axios instance & domain API modules
    │   ├── axiosClient.js       # Interceptor, 401 handler, error parsing
    │   ├── authApi.js           # Login, logout, getMe
    │   ├── campaignsApi.js      # Campaign CRUD, transitions, assignments
    │   ├── securityEventsApi.js # Incidents and triage
    │   ├── usersApi.js          # Tenant user directory & deactivations
    │   ├── auditLogsApi.js      # Append-only audit trail
    │   └── dashboardApi.js      # Aggregated metrics & activity
    ├── components/       # Reusable UI components
    │   ├── layout/       # Layout, Topbar, Sidebar
    │   ├── Badge.jsx            # Muted semantic badges (severities, statuses)
    │   ├── Button.jsx           # Accessible button with loading spinner
    │   ├── ConfirmDialog.jsx    # Destructive action modal
    │   ├── EmptyState.jsx       # Empty list fallback
    │   ├── Input.jsx            # Form input with accessible labels & errors
    │   ├── Modal.jsx            # Accessible keyboard-friendly modal (Esc, backdrop)
    │   ├── Pagination.jsx       # Server-side pagination controls
    │   ├── Select.jsx           # Accessible select dropdown
    │   ├── Spinner.jsx          # Consistent SVG loading spinner
    │   ├── Table.jsx            # Responsive table container
    │   └── Toast.jsx            # Notification items
    ├── context/          # React contexts
    │   ├── AuthContext.jsx      # User profile, session, role helpers
    │   └── ToastContext.jsx     # Global notification emitter
    ├── hooks/            # Custom hooks
    │   ├── useAuth.js           # Auth context consumer
    │   ├── useDebounce.js       # Debounced search inputs
    │   ├── useQueryParams.js    # URL search param synchronization
    │   └── useToast.js          # Toast trigger helper
    ├── pages/            # View components
    │   ├── LoginPage.jsx        # Login & seed quick-fill card
    │   ├── DashboardPage.jsx    # Metric cards & recent telemetry
    │   ├── CampaignsPage.jsx    # Campaigns table, transitions & assignments
    │   ├── SecurityEventsPage.jsx # Threat logs & triage status
    │   ├── UsersPage.jsx        # User directory & privilege management
    │   ├── AuditLogsPage.jsx    # Admin-only audit trail
    │   ├── ForbiddenPage.jsx    # 403 Access Denied view
    │   └── NotFoundPage.jsx     # 404 Not Found view
    ├── routes/           # Route guards & definition
    │   ├── AppRoutes.jsx        # Route mapping
    │   ├── ProtectedRoute.jsx   # Authentication guard
    │   └── RoleRoute.jsx        # RBAC role guard
    ├── utils/            # Shared constants & formatters
    │   ├── constants.js         # Roles, transitions, severities, seed accounts
    │   └── formatters.js        # Date, time, enum, and text formatters
    ├── App.jsx           # Root providers setup
    ├── index.css         # Tailwind base & custom scrollbar styles
    └── main.jsx          # React DOM entry
```
#   D e e p _ T r a c e _ F u l l _ S t a c k _ A s s e s s m e n t  
 