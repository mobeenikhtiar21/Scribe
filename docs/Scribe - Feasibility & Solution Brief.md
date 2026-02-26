# Scribe - Bringing Full Order Actions to Draft Orders

## The Problem Today

In BigCommerce, when your team works with **regular orders**, they have access to a full set of actions:

- Edit Order
- Print Invoice
- Print Packing Slip
- Resend Invoice
- Send Message
- View Notes
- Refund
- View Order Timeline

However, when working with **Draft Orders**, the available actions are limited to just:

- Edit
- Delete

This means your team **cannot print, send, message customers, or view notes** on draft orders, forcing manual workarounds and slowing down day-to-day operations.

---

## Can This Be Fixed?

**Yes, and without modifying BigCommerce itself.**

Scribe gives your team two ways to access these missing actions, depending on the order type:

### Draft Orders → App Page (Apps → Scribe)

BigCommerce's App Extensions system only supports the `ORDERS` model — there is no `DRAFT_ORDERS` model. This means we cannot add a "Scribe Actions" button to the draft order "..." menu. Instead, Scribe provides a **standalone app page** accessible from **Apps → Scribe** in the BigCommerce admin. This page lists all draft orders in a table. Clicking any row opens the full actions panel with Print, Send, Message, and Notes.

### Regular Orders → Side Panel ("..." Menu)

For regular orders, BigCommerce App Extensions work perfectly. Your team clicks the "..." menu on any order and selects **"Scribe Actions"**, which opens a **side panel** right on the same page.

### Available Actions (Both Entry Points)

| Action | What It Does |
|--------|-------------|
| **Print** | Generate and download a branded PDF of the order, ready to print or share |
| **Send** | Email the order to the customer with a link to complete their purchase |
| **Message** | Send a direct message to the customer about their order |
| **Notes** | View and add internal staff notes, keeps your team aligned |
| **Edit** | Jump straight to BigCommerce's native order editor |

All of this works **within the BigCommerce admin** - no separate app to switch to, no extra tabs, no new login.

---

## How It Looks

### Draft Orders (App Page)

```
Apps → Scribe
┌───────────────────────────────────────────────────────┐
│  Scribe                                               │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Draft orders (Incomplete)                      │  │
│  │                                                 │  │
│  │  Order #   Customer       Total     Status      │  │
│  │  #1042     Jane Smith     $250.00   Incomplete  │  │
│  │  #1043     Bob Lee        $180.00   Incomplete  │  │
│  │  #1044     Amy Chen       $320.00   Incomplete  │  │
│  └─────────────────────────────────────────────────┘  │
│                        │ click row                     │
│                        ▼                               │
│  ┌─────────────────────────────────────────────────┐  │
│  │  ← Back to Draft Orders                         │  │
│  │  Scribe Actions - Order #1042                   │  │
│  │  [Print]  [Send]  [Message]  [Notes]  [Edit]    │  │
│  │  (action content loads here)                    │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### Regular Orders (Side Panel)

```
Orders Page
┌─────────────────────────────────────────────────────┐
│  Orders                                             │
│  ┌────────────────────────────────────┐             │
│  │ Order #1050  │ $500.00 │ ••• ──┐  │             │
│  └──────────────────────────┼──────┘  │             │
│                             │ Edit          │       │
│                             │ Scribe Actions│ ◄── "..." menu
│                             └───────────────┘       │
│                                                     │
│  ┌─── Side Panel (iframe) ──────────────────────┐   │
│  │  Scribe Actions - Order #1050                │   │
│  │  [Print]  [Send]  [Message]  [Notes]  [Edit] │   │
│  │  (action content loads here)                 │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## What About Regular Orders?

Scribe Actions also appear on regular orders via the "..." menu (App Extensions). This means your team gets a **unified experience** - the same actions panel, the same workflow - regardless of order type. The only difference is how they get there:

- **Draft orders**: Navigate to **Apps → Scribe**, find the order in the list, click it
- **Regular orders**: Click the "..." menu on any order, select **"Scribe Actions"**

Once in the actions panel, the experience is identical.

---

## What We Need From You

1. **BigCommerce sandbox/dev store** - for building and testing (confirmed ready)
2. **API credentials** - OAuth app credentials with Orders access
3. **Branding assets** - logo and color preferences for PDF templates
4. **Email preferences** - preferred sender address and any email branding requirements

---

## Frequently Asked Questions

**Q: Does this require BigCommerce to make any changes on their end?**
No. This uses BigCommerce's official App Extensions system, the standard supported way to add functionality to the admin panel. No special permissions or BigCommerce involvement needed.

**Q: Will this break if BigCommerce updates their admin?**
The App Extensions system is BigCommerce's official extensibility path. It is designed to survive admin updates. We also use BigCommerce's own design components so the look and feel stays consistent.

**Q: Is customer data safe?**
Yes. All data stays within your BigCommerce store and our secure backend. We use encrypted connections, scoped API access (only what's needed), and full audit logging of every action taken.

**Q: Can this work across multiple storefronts?**
Yes. Scribe is built with multi-storefront isolation, each storefront's data, branding, and actions are completely separate.

**Q: What happens when a team member clicks "Send"?**
The customer receives a professional email with the draft order details and a link to complete their purchase. Your team can customize the email template and sender information.

---

## Summary

| Item | Detail |
|------|--------|
| **Problem** | Draft orders only have Edit and Delete - no print, send, message, or notes |
| **Solution** | Scribe provides a standalone app page (Apps → Scribe) for draft orders, and a side panel via "..." menu for regular orders |
| **How** | App page for draft orders (App Extensions don't support `DRAFT_ORDERS` model), side panel via App Extensions for regular orders |
| **Risk** | Low - uses supported, official BigCommerce integration methods |
| **Result** | Draft orders get the same rich action set as regular orders, via two complementary entry points |
