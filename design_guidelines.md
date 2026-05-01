# HomeMe — Design Guidelines (Unified UI System v1)

> **Goal:** A single visual language across every HomeMe dashboard/page so
> residents, security, admins, company admins, super admins and the app owner
> experience a consistent, branded product — while each role retains a distinct
> **theme color** for quick visual recognition.

---

## 1 — Brand Tokens

### Role Themes (used by `<PageHeader theme="…" />`)

| Theme      | Used by                                   | Hero gradient                               |
|------------|-------------------------------------------|---------------------------------------------|
| `indigo`   | company_admin, admin (default)             | gray-900 → indigo-950 → gray-900            |
| `rose`     | app_owner — top-level financial views      | gray-900 → rose-950 → gray-900              |
| `emerald`  | compound admin, finance-green sections     | gray-900 → emerald-950 → gray-900           |
| `blue`     | resident, security                         | gray-900 → blue-950 → gray-900              |
| `amber`    | alerts, security-incident flows            | gray-900 → amber-950 → gray-900             |
| `slate`    | super_admin, system-level tools            | gray-900 → slate-800 → gray-900             |

Same six themes also drive `<StatCard color="…" />`.

### Spacing scale
- Dashboard wrapper: `min-h-screen p-6`
- Vertical rhythm between sections: **`space-y-6`**
- Inside a section (card): **`space-y-3`**
- Max container width: **`max-w-7xl mx-auto`**

### Corner radius
- Page-level containers: `rounded-2xl`
- Cards / sections: `rounded-2xl`
- Buttons / pills / chips: `rounded-lg` (medium) / `rounded-full` (small)

### Shadows
- Cards: `shadow-sm` (light surface) / `shadow-lg` (dark hero)
- CTA buttons: `shadow-lg hover:shadow-<color>-500/30`

### Typography (RTL-first, Tahoma/Arial fallback)
- Page title: `text-2xl md:text-3xl font-extrabold`
- Section title: `text-base font-extrabold`
- KPI number: `text-2xl md:text-3xl font-extrabold`
- Label: `text-[10px] font-bold tracking-wider uppercase`
- Body: `text-sm`
- Micro / hint: `text-xs` or `text-[11px]`

---

## 2 — Shared Components (import from `components/shared/…`)

### `<PageHeader>`
Props: `theme`, `icon | iconEmoji`, `badge`, `title`, `subtitle`, `actions`, `meta`.

```jsx
<PageHeader
  theme="indigo"
  iconEmoji="🏢"
  badge="Co./Admin — شركة إدارة"
  title={company.name}
  subtitle={company.description}
  meta={<><span>📧 {company.contact_email}</span></>}
  actions={<button>+ جديد</button>}
/>
```

### `<StatCard>`
Props: `icon`, `label`, `value`, `hint`, `color`, `variant` ('dark' | 'light'), `onClick`.

```jsx
<StatCard icon="👥" label="سكان" value={230} color="indigo" hint="+12 هذا الشهر" />
```

### `<SectionCard>`
Props: `title`, `icon`, `subtitle`, `actions`, `variant` ('dark' | 'light'), `padded`.

```jsx
<SectionCard title="🏘️ مجمعاتي" actions={<button>+ جديد</button>} variant="dark">
  …content…
</SectionCard>
```

### `<EmptyState>`
Props: `icon`, `title`, `subtitle`, `cta`, `variant`.

```jsx
<EmptyState icon="🏗️" title="لا توجد مجمعات بعد"
            subtitle="ابدأ بإضافة أول مجمع" cta={<button>+ إنشاء</button>} />
```

---

## 3 — Role-Dashboard Theme Mapping (applied)

| Dashboard              | File                                              | Theme     | Status     |
|------------------------|---------------------------------------------------|-----------|------------|
| Company Admin          | `pages/CompanyAdminDashboard.js`                  | `indigo`  | ✅ unified |
| Resident               | `components/ResidentDashboard.js`                 | `blue`    | ✅ unified |
| Security               | `components/SecurityDashboard.js`                 | `blue`    | ✅ unified |
| App Owner              | `components/OwnerDashboard.js`                    | `rose`    | (legacy — keep) |
| Super Admin            | `components/AdminDashboard.js`                    | `slate`   | (scheduled) |

OwnerDashboard uses the existing `OwnerPageHeader` component which maps to the
`rose` theme. Both should eventually converge on `<PageHeader theme="rose" />`
once we remove `OwnerPageHeader`.

---

## 4 — Data-TestID Convention (accessibility + testing)

- Every interactive element: `data-testid="<scope>-<element>-<action>"`.
  Examples: `cad-create-compound-btn`, `crm-vip-card`, `crm-drilldown-close`.
- Every section card: `data-testid="<scope>-section"`.
- Every empty-state: `data-testid="<scope>-empty-state"`.
- Use **kebab-case**, no spaces, describe *function* not style.

---

## 5 — Future Work

1. Migrate `OwnerDashboard` to `<PageHeader theme="rose" />`, then delete `OwnerPageHeader.js`.
2. Migrate `AdminDashboard` to `<PageHeader theme="slate" />`.
3. Build one more shared primitive: `<Button variant="primary|secondary|ghost" color="…">`.
4. Extract stat grids across `OwnerDashboard`, `ResidentDashboard`, `SecurityDashboard` into `<StatCard color="…" variant="light" />`.
5. Storybook-like preview page at `/design-system` to showcase all tokens + components.
