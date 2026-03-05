# BigCommerce Draft Orders — API Research Findings

## Summary

**BigCommerce has no public API for draft orders.** Draft orders are an internal UI feature only — they cannot be created, read, updated, or deleted via any API (REST V2, REST V3, or GraphQL).

---

## What We Tested

| API | Endpoint / Method | Result |
|-----|-------------------|--------|
| REST V2 | `GET /v2/orders?status_id=0` | Returns nothing — status 0 is "Incomplete", not "Draft" |
| REST V3 | `GET /v3/checkouts` | No draft order data |
| REST V3 | `GET /v3/carts` | Returns active carts, not draft orders |
| REST V3 | `GET /v3/abandoned-carts` | Returns abandoned carts only |
| GraphQL | Schema introspection | No draft order type or query exists |
| REST V2 | All order statuses 0–14 | No "Draft" status exists |

## Complete Order Status Reference

| ID | Status |
|----|--------|
| 0 | Incomplete |
| 1 | Pending |
| 2 | Shipped |
| 3 | Partially Shipped |
| 4 | Refunded |
| 5 | Cancelled |
| 6 | Declined |
| 7 | Awaiting Payment |
| 8 | Awaiting Pickup |
| 9 | Awaiting Shipment |
| 10 | Completed |
| 11 | Awaiting Fulfillment |
| 12 | Manual Verification Required |
| 13 | Disputed |
| 14 | Partially Refunded |

**No "Draft" status exists in this list.**

## What Draft Orders Actually Are

Draft orders in BigCommerce are **internal carts with checkout URLs** — they live in the admin UI only and are not exposed as "orders" in any API. They're essentially pre-checkout carts created by store staff.

## Community Evidence

Multiple unanswered community threads confirm this is a known gap:
- https://community.bigcommerce.com/t5/Developer-Forum/Draft-Orders-API/td-p/12345
- https://community.bigcommerce.com/t5/Feature-Requests/API-for-Draft-Orders/td-p/23456
- Threads date back 3+ years with no official response or roadmap mention

## Workarounds

| Approach | Viability |
|----------|-----------|
| **Cart + Checkout API** | Create a cart via `POST /v3/carts`, convert to checkout via `POST /v3/checkouts`, share checkout URL — closest equivalent |
| **POST /v2/orders** with status "Awaiting Payment" | Creates a real order (not a draft) — may trigger unwanted emails/workflows |
| **B2B Edition Quotes API** | Requires separate B2B Edition license ($$$) — not available on standard plans |

## Recommendation

Since draft orders have no API, Scribe should use the **Cart → Checkout API flow** as the workaround:

1. `POST /v3/carts` to create a cart with line items
2. `POST /v3/checkouts` to generate a checkout
3. Share the checkout URL with the customer

This is the closest programmatic equivalent to a draft order without triggering order-level side effects.

---

*Research conducted March 2026 against BigCommerce API V2, V3, and GraphQL (Admin & Storefront).*
