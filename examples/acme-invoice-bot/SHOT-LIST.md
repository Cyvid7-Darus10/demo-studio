# Shot list: Acme Invoice Bot (fictional example)

Goal: viewers believe they can invoice from a chat thread in one click, safely.
Audience: agency owners and sales staff who live in team chat.

| # | Part | Scene | What's on screen | Caption | Length | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | why | 01-the-thread | Thread: Northwind signs off, USD 5,000 flat, due in two weeks | The deal is agreed in chat. | 10s | seed |
| 02 | setup | 02-install-bot | App directory: search Acme, Install, pick #deals | Install it once. | 12s | |
| 03 | setup | 03-add-key | Bot settings: paste the test key (masked), Save | Your key stays private. | 12s | |
| 04 | use | 04-ask-bot | Riley: "@Acme send an invoice to @Jordan"; draft card appears | It drafts first. | 12s | 01 |
| 05 | use | 05-approve | Approve; card shows INV-0006 and a payment link | Approve. The invoice is created. | 10s | 04 |
| 06 | proof | 06-invoice-in-billing | Acme Billing, Invoices: INV-0006, USD 5,000.00 | Same invoice, in Acme Billing. | 10s | 05 |
| 07 | edge | 07-missing-amount | No amount: the bot asks; Riley replies "$1,200" | It asks instead of guessing. | 12s | seed |

Scenes 04 to 06 share one invoice number. If you re-seed, re-shoot all three in one pass.

## Accounts and state needed before recording

- [ ] Chat sandbox workspace, Riley logged in (window "riley", port 9333)
- [ ] Acme Billing test mode, admin logged in (window "admin", port 9334)
- [ ] Seed: client Northwind Trading (jordan@northwind.example), no open invoices, next number INV-0006
