# Prep before filming

Nothing in this file is a secret. Passwords stay in a password manager.

## 1. Accounts and logins

| # | What | Needed for | Ready |
| --- | --- | --- | --- |
| 1 | <sandbox or test account> | <scenes> | [ ] |

- [ ] Logged in to every site in the Playwright MCP browser (or each demo window via open-window.sh)
- [ ] A dedicated demo user, not a personal or real customer account

## 2. Seed data

- [ ] Seed script written (`tools/seed.*`): realistic mock data, idempotent, touches only the demo user
- [ ] Numbers consistent across scenes (the same amount in the chat, the page and the dashboard)
- [ ] Reset script for re-shoots (`tools/reset.*`)
- [ ] After re-seeding, re-shoot every scene that shows the changed data

## 3. Rig

- [ ] `scripts/doctor.sh` passes
- [ ] At least 10 GB free disk
- [ ] Frame receiver running from `recordings/`
- [ ] Timezone and locale chosen so time-sensitive UI looks right (DEMO_TIMEZONE, DEMO_LOCALE)
- [ ] Only one instance of any bot or server running
- [ ] Clutter list in `recordings/scenes/_project.js` (cookie bars, toasts, tours)
- [ ] Secret patterns and labels in `_project.js` before the first take

## 4. Smoke run

- [ ] Whole hero flow run once off camera; data and code bugs fixed
- [ ] Data reset so the first take starts clean
