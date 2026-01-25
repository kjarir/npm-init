# BobPay Platform

BobPay is a secure freelance marketplace built with **Flutter**, **Supabase**, **IPFS** (Pinata), and **Hyperledger Fabric**. It combines device-bound certificates, encrypted messaging, immutable audit logs, blockchain anchoring, AI-powered project drafting, code review integration, milestone-based deliverables, multi-factor device approval, and **AI Auditing** for bill verification to protect users and transactions end to end.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Core Features](#core-features)
  - [AI Auditing (Bill Verification)](#ai-auditing-bill-verification)
  - [Reputation Token](#reputation-token)
- [User Flows](#user-flows)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Environment & Configuration](#environment--configuration)
- [Setup](#setup)
- [Services & APIs](#services--apis)
- [Database Schema](#database-schema)
- [External Integrations](#external-integrations)
- [Typography](#typography)
- [Related Docs](#related-docs)

---

## Overview

BobPay supports **clients** and **freelancers**. Clients create projects (with optional AI-generated descriptions and milestones), receive proposals, accept them to form contracts, and manage escrow. Freelancers browse projects, submit proposals (with required code zip + code review), work on milestones, and submit deliverables. **AI Auditing** automatically verifies uploaded bills: the AI extracts items and amounts, contacts the store (call/message) to confirm authenticity, reports verified / mismatch / no response, and the user approves or rejects the payment. Contracts use **secure channels** (ECDH-derived encryption) for messaging; certificates and audit data are stored on **IPFS** and anchored on a **private Hyperledger Fabric** network.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Mobile app** | Flutter 3.x, Dart 3.6+ |
| **Backend / Auth / DB** | Supabase (PostgreSQL, Auth, RLS, Realtime) |
| **IPFS** | Pinata via Node.js proxy (`backend/`) |
| **Blockchain** | Hyperledger Fabric (REST API on port 3001) |
| **AI (Escrow)** | OpenAI-compatible API (optional, for description/milestone generation) |
| **Code review** | External API (e.g. `POST /api/submission/upload`) |
| **Deep links** | `bobpay://auth-callback` (email verification, app_links) |

**Key packages:** `supabase_flutter`, `flutter_secure_storage`, `device_info_plus`, `file_picker`, `http`, `pdf`, `uuid`, `app_links`, `google_fonts`, `connectivity_plus`, `agora_rtc_engine`.

---

## Core Features

### Authentication & Security

- **Registration / Login** — Email + password via Supabase Auth.
- **Email verification** — Confirmation emails with redirect to `bobpay://auth-callback`; app uses `app_links` + `getSessionFromUrl` for deep-link callback.
- **Device approval (2FA-style)** — New device login shows a 2-digit code; user must approve (or deny) on a trusted device. Uses `device_login_challenges` and `trusted_devices` tables; real-time + polling for approval UI.
- **Device-bound certificates (DAC)** — ECDSA keypairs and certificates tied to device fingerprint; private keys in `flutter_secure_storage`.
- **Secure channels** — ECDH (X25519) key exchange, AES-256-GCM encryption, ECDSA signatures for messages between contract parties.

### Projects & Escrow

- **Create project** — Title, description, category, budget, deadline, skills, milestones. Optional **AI-generated description** (Escrow API) and **AI-generated milestones** (with user-chosen count).
- **IPFS group per project** — Created on project creation; project + contract + milestone certificates (PDFs) are pinned and added to the group.
- **Blockchain anchoring** — Project registration, contract certificates, and milestone certificates recorded on Fabric (certificate-registry chaincode).

### Proposals & Contracts

- **Submit proposal** — Cover letter, bid amount, **required code zip**. Code is sent to **Code Review API** (`/api/submission/upload`); submission fails if review fails.
- **View proposals (client)** — List per project; view details, **accept** to create contract.
- **Contract creation** — On accept: contract record, contract certificate (PDF → IPFS + chain), **secure channel** between client and freelancer.

### Deliverables & Escrow Release

- **Milestone-based deliverables** — Freelancer selects a milestone, uploads zip (and optional repo link). Code review API is called; output is embedded in **milestone completion certificate** (PDF) and stored in the project’s IPFS group.
- **Escrow release** — If code review score ≥ 90%, milestone marked completed and funds released from escrow (wallet balance updates).
- **Update / delete** — Existing deliverable for a milestone can be updated or deleted (no resubmit without update/delete first).

### Messaging & Audit

- **Encrypted messaging** — Via secure channel; ciphertext stored in DB; keys never leave devices.
- **Audit logs** — Actions logged with metadata; hashes on IPFS and optionally on blockchain.

### AI Auditing (Bill Verification)

- **Automatic bill verification** — AI Auditing automatically verifies submitted bills.
- **Upload** — A user uploads a bill (e.g. receipt or invoice).
- **AI extraction** — The AI reads the items and amounts from the bill.
- **Store contact** — The system contacts the store (via call or message) to confirm whether the bill is genuine.
- **Verification outcome** — Based on the store’s response, the system reports **verified**, **mismatch**, or **no response**.
- **User decision** — The user decides whether to **approve** or **reject** the payment.

### Reputation Token

- **Reputation** — Each user (client and freelancer) has a **reputation** value 0–100. New profiles start at **50%**. Higher reputation improves **ranking** and **trust** (e.g. freelancers sorted by reputation in Browse Freelancers). Reputation is shown on Profile, Edit Profile, freelancer cards, and freelancer profile view.
- **Reputation API** — `POST /api/reputation/calculate` computes score changes from: **milestoneCompletion** (+5), **speedBonus** (+3), **highValueContract** (+3), **streakBonus** (+2), **missedDeadline** (-5), **contractAbandonment** (-10). **Only after the final milestone** is submitted (all milestones completed), the app calls this API for both freelancer and client, then updates `profiles.reputation`. Inputs used: `currentReputation`, `milestoneCompletion`, `speedBonus`, `highValueContract`, `missedDeadline`, `contractAbandonment`. Speed bonus = delivered before milestone deadline; high value = contract amount ≥ 500.

### Wallet, Disputes, UI

- **Wallets** — Balances, escrow, locked/available.
- **Disputes** — Client/freelancer dispute flows.
- **Real-time updates** — Supabase realtime for dashboard, proposals, contracts, etc.
- **Progress bar** — Shown during deliverable zip upload.
- **Deep links** — `bobpay://auth-callback` for email verification.

---

## User Flows

### Registration → Login → Logout

1. **Register** — Email, password, role (client/freelancer). Supabase may require email confirmation.
2. **Email verification** — User clicks link in email → redirect to `bobpay://auth-callback` → app opens, `getSessionFromUrl` → navigates to app home.
3. **Login** — Email + password. If **new device**: device approval flow (2-digit code, approve on trusted device). If **trusted device**: optional approval dialog for *other* new devices.
4. **Dashboard** — Role-based: client (create project, browse freelancers, proposals, contracts) or freelancer (browse projects, proposals, active contracts, submit deliverables).
5. **Logout** — Sign out via Supabase; return to login.

### Client Flow

- Create project (optionally use **AI** for description + milestones).
- Browse freelancers, view project proposals.
- Accept a proposal → contract + secure channel created.
- View **Active Contracts** → **View details** (project, contract, milestones).
- Messaging via secure channel; manage disputes/wallet as applicable.

### Freelancer Flow

- Browse projects → **View details** → **Submit proposal** (cover letter, bid, **code zip**; code review required).
- **My proposals** — View, update, or delete proposals.
- **Active contracts** → **View details** or **Submit deliverable**.
- **Submit deliverable** — Choose milestone, upload zip (and optional repo link), optional description. Progress bar during upload. Code review → certificate → IPFS; if score ≥ 90%, escrow released. Update/delete existing deliverable as allowed.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Flutter App (BobPay)                             │
│  Auth • Dashboard • Projects • Proposals • Contracts • Deliverables      │
│  Secure Channel UI • Device Approval • AI Auditing • Deep Links          │
└──────────────┬──────────────┬──────────────┬────────────────────────────┘
               │              │              │
       ┌───────▼───────┐ ┌────▼────┐ ┌──────▼──────┐
       │   Supabase    │ │ Backend │ │  Blockchain │
       │ Auth, DB, RLS │ │ (Node)  │ │ Fabric API  │
       │ Realtime      │ │ IPFS    │ │ (port 3001) │
       │               │ │ Escrow  │ │             │
       └───────┬───────┘ └────┬────┘ └──────┬──────┘
               │              │              │
               │         Pinata IPFS    Hyperledger
               │         (groups, PDFs)    Fabric
               │
       ┌───────▼───────────────────────────────────┐
       │  External: Escrow AI, Code Review API,     │
       │  Email (SMTP via Supabase), Deep Links     │
       └───────────────────────────────────────────┘
```

- **Supabase**: Auth, `profiles`, `projects`, `milestones`, `proposals`, `contracts`, `secure_channels`, `encrypted_messages`, `audit_logs`, `wallets`, `disputes`, `certificates`, `devices`, `trusted_devices`, `device_login_challenges`, `project_attachments`, etc.
- **Backend (Node)**: IPFS proxy (Pinata), Escrow AI (description/milestones). Runs e.g. port 3002/3003; see `backend/.env`.
- **Fabric API**: Separate service (port 3001); project/contract/milestone certificate registration.
- **Escrow AI / Code Review**: Configurable URLs (e.g. ngrok); see [External Integrations](#external-integrations).

---

## Directory Structure

```
bobpay/
├── lib/
│   ├── main.dart                 # Entry, deep links, theme (Space Grotesk)
│   ├── auth/                     # Login, Register, DeviceApprovalPending, EmailVerificationPending
│   ├── client/                   # Client screens (dashboard, create/edit project, proposals, etc.)
│   ├── freelancer/               # Browse projects, submit proposal, submit deliverable, view proposal
│   ├── common/                   # Profile, ActiveContracts, ContractDetails, RoleBasedNavigation, etc.
│   ├── config/                   # EnvConfig (.env)
│   ├── services/                 # Supabase, IPFS, Blockchain, Escrow, CodeReview, Deliverable, etc.
│   └── theme/                    # App colors
├── backend/                      # Node IPFS + Escrow API
│   ├── server.js
│   ├── .env / .env.example
│   └── package.json
├── android/                      # Android app, deep-link intent bobpay://auth-callback
├── ios/                          # iOS app
├── web/                          # Web assets
├── .env                          # Flutter app config (Supabase, IPFS, Fabric, etc.)
├── pubspec.yaml
├── supabase_*.sql                # RLS, tables (contracts, proposals, devices, trusted_devices, etc.)
├── BLOCKCHAIN_SERVER_SETUP.md    # Fabric REST API setup
└── DEPLOYMENT_HYBRID.md          # Hybrid deployment guide
```

---

## Environment & Configuration

### Flutter app (`.env` in project root)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_PINATA_*` / `VITE_PINATA_JWT` | Pinata (used via backend proxy) |
| `VITE_PINATA_GATEWAY` | IPFS gateway base URL |
| `VITE_IPFS_API_URL` | Backend IPFS base (e.g. `http://localhost:3002/api/ipfs` or ngrok) |
| `VITE_HL_API_URL` | Fabric REST API base (e.g. `http://localhost:3001/api/fabric`) |
| `VITE_HL_API_URL_ANDROID` | Optional override for Android (e.g. `http://10.0.2.2:3001/api/fabric`) |
| `VITE_HL_CHANNEL`, `VITE_HL_*_CHAINCODE`, `VITE_HL_VERSION`, `VITE_HL_USER_ID` | Fabric channel, chaincodes, user |
| `VITE_AUTH_REDIRECT_URL` | Redirect for email verification (default `bobpay://auth-callback`) |

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `IPFS_PORT` | Server port (default 3002) |
| `PINATA_JWT` | Pinata JWT |
| `OPENAI_API_KEY` | Optional; for Escrow AI |
| `OPENAI_MODEL`, `OPENAI_BASE_URL`, `ESCROW_TIMEOUT_MS` | Optional Escrow AI tuning |

### Supabase Auth

- Add `bobpay://auth-callback` to **Redirect URLs** (and allowlisted origins if applicable) so email verification links work.

---

## Setup

1. **Clone and install**
   - `cd bobpay && flutter pub get`
   - `cd backend && npm install`

2. **Supabase**
   - Create project; run `supabase_*.sql` migrations (tables, RLS, triggers).
   - Configure Auth redirect URLs and SMTP if you use custom email.

3. **Env**
   - Copy `backend/.env.example` → `backend/.env`; set `PINATA_JWT`, optionally `OPENAI_*`.
   - Create `bobpay/.env` with Supabase, IPFS, Fabric, and `VITE_AUTH_REDIRECT_URL` as above.

4. **Backend**
   - `cd backend && node server.js` (or `npm start`). Default port 3002; ensure `VITE_IPFS_API_URL` matches.

5. **Blockchain**
   - Run Fabric network + certificate-registry chaincode. Expose REST API on port 3001 (or your chosen URL). See `BLOCKCHAIN_SERVER_SETUP.md`.

6. **Flutter**
   - `flutter run` (or target device). For Android emulator, use `VITE_HL_API_URL_ANDROID` / `VITE_IPFS_API_URL` pointing to host (e.g. `10.0.2.2`) if needed.

7. **Deep links**
   - Android: `AndroidManifest.xml` already contains `bobpay://auth-callback` intent. iOS: configure associated domains / URL scheme as needed.

---

## Services & APIs

### In-app services (`lib/services/`)

| Service | Purpose |
|---------|---------|
| `SupabaseService` | Client init, Auth, DB |
| `RegistrationService` | Sign up, resend verification, redirect URL |
| `LoginService` | Login, device trust check |
| `DeviceApprovalService` | Trusted devices, challenges, approve/deny |
| `ProjectService` | Projects, milestones |
| `ProposalService` | Proposals CRUD |
| `ContractService` | Contracts, certificates |
| `DeliverableService` | Milestone deliverables, code review, certificates, escrow release |
| `IPFSService` | Groups, pin JSON/file via backend |
| `BlockchainService` | Fabric invoke (projects, certificates) |
| `EscrowService` | AI description/milestones (backend) |
| `CodeReviewService` | Submit zip + metadata to Code Review API |
| `ReputationService` | `POST /api/reputation/calculate`; used after final milestone to update freelancer/client reputation |
| `SecureChannelService` | ECDH, encrypt/decrypt, signatures |
| `MessageService` | Encrypted messaging |
| `AuditLogService` | Audit trail, IPFS/blockchain |
| `CertificatePdfService` | PDF generation |
| `WalletService`, `DisputeService` | Wallets, disputes |

### Backend HTTP API (`backend/server.js`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ipfs/health` | Health check |
| POST | `/api/ipfs/groups` | Create Pinata group |
| PUT | `/api/ipfs/groups/:id/cids` | Add CIDs to group |
| POST | `/api/ipfs/pinJSON` | Pin JSON to IPFS |
| POST | `/api/ipfs/pinFile` | Pin file (optional `groupId`) |
| GET | `/api/escrow/health` | Escrow health |
| POST | `/api/escrow/generate-description` | AI description from title |
| POST | `/api/escrow/generate-milestones` | AI milestones (title, description, count, budget) |
| GET | `/api/reputation/health` | Reputation API health |
| POST | `/api/reputation/calculate` | Compute reputation change (milestoneCompletion, speedBonus, highValueContract, etc.); used after final milestone |

### External APIs (configurable)

- **Escrow AI** — Base URL e.g. `https://superpolitely-edificatory-lucille.ngrok-free.dev/api/escrow`; used for description and milestones.
- **Code Review** — `POST /api/submission/upload` (e.g. same ngrok base); fields: `title`, `description`, `amount`, `projectZip`, `milestones`. Used on proposal submit and deliverable submit.

---

## Database Schema (High-Level)

- **profiles** — Users, roles (client/freelancer), **reputation** (0–100, default 50).
- **projects** — Title, description, budget, status, IPFS/blockchain refs.
- **milestones** — Per project; amount, status, due dates.
- **proposals** — Freelancer bids; link to project.
- **contracts** — Client + freelancer + project; certificate, secure channel refs.
- **secure_channels** — Channel metadata, participant fingerprints.
- **encrypted_messages** — Encrypted payloads per channel.
- **certificates** — Device certs; public part stored.
- **project_attachments** — Deliverables (zip, link); optional `milestone_id`.
- **audit_logs** — Action metadata, IPFS hashes.
- **wallets** — Balances, escrow.
- **disputes** — Dispute records.
- **devices** — Device fingerprints.
- **trusted_devices** — Allowed device fingerprints per user.
- **device_login_challenges** — Pending new-device approval (code, status, etc.).

See `supabase_*.sql` for exact definitions and RLS.

---

## External Integrations

- **Pinata** — IPFS pinning, groups. Keys in backend only.
- **Hyperledger Fabric** — Project/contract/milestone registration. Separate REST service.
- **Escrow AI** — Optional OpenAI-compatible API for description/milestones. Backend calls it; Flutter uses `EscrowService` → backend.
- **Code Review API** — External `POST /api/submission/upload`. Used by proposal submit and deliverable submit; response influences certificates and escrow release.
- **Email** — Supabase Auth SMTP. Configure in Dashboard for verification emails.
- **Deep links** — `bobpay://auth-callback` for email verification. Supabase redirect URL must match.

---

## Typography

The app uses **Space Grotesk** (Google Fonts) for the global `TextTheme`. Configured in `main.dart` via `GoogleFonts.spaceGrotesk`.

---

## Related Docs

- **`BLOCKCHAIN_SERVER_SETUP.md`** — Fabric REST API, chaincode, and connectivity.
- **`DEPLOYMENT_HYBRID.md`** — Hybrid deployment model for cost, efficiency, and security.
