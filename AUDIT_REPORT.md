# Comprehensive Bug & Error Audit Report — Guild Monorepo

**Audit Date:** 2026-09-01  
**Orchestration:** Monorepo Diagnostic & Verification Pipeline  
**Target Scope:** `apps/guild-web`, `apps/admin-web`, `apps/landing-web`, `packages/config`, `packages/firebase`, `packages/types`, `packages/ui`, `packages/utils`  
**Execution Mode:** Strictly Non-Destructive & Read-Only (0 source files modified)

---

## Executive Summary

A comprehensive automated testing, static typecheck, production build, and logic verification analysis was executed across the entire Guild monorepo.

### High-Level Outcomes:
1. **Client Web Applications Build Status**: All three client applications (`apps/guild-web`, `apps/admin-web`, `apps/landing-web`) successfully produce production bundles with exit code `0`.
2. **Shared Package Compilation Status**: `packages/types`, `packages/utils`, and `packages/firebase` pass TypeScript typechecking cleanly (`0` errors). However, `packages/ui` and `packages/config` fail direct typechecking (`TS2307` and `TS18003`).
3. **Monorepo Script Configuration**: Monorepo root `npm run typecheck` silently skips all packages in `packages/*` because `packages/*/package.json` lack `"typecheck"` scripts.
4. **Logic & Runtime Verification**: Deep logic execution revealed **2 Critical**, **6 High**, **6 Medium**, and **7 Low** severity bugs across business logic, state machines, runtime helpers, and bundler configurations.

### Severity Summary Table

| Severity | Count | Summary of Key Issues |
| :--- | :---: | :--- |
| **CRITICAL** | **2** | DM notification routing corruption with underscore UIDs; Inverted permission logic in task review rejection. |
| **HIGH** | **6** | Broken UI package path aliases; Missing `react-day-picker` dependency; Incompatible serverless `crypto` import; Runtime circular dependency between `chat.ts` and `firestore.ts`; Validation helper `TypeError` crashes on null/undefined; Top-level `import.meta.env` crash in Node/SSR/test environments. |
| **MEDIUM** | **6** | Markdown link regex attribute corruption & SSR crash; Unchecked `updateDoc` on deleted tasks; Unsafe `.toDate()` in reports; Search highlight single-match & null crash; Unmemoized `URL.createObjectURL` memory leak; Oversized vendor bundle chunks (>880 kB). |
| **LOW** | **7** | Monorepo root typecheck skips packages; Legacy `@types/react-router-dom` conflict; Serverless routes omitted from app tsconfig; Empty `packages/config` tsconfig; Dynamic `import.meta.env` bracket indexing; Onboarding static circular type dependencies; Insecure `Math.random()` UUID generator. |
| **TOTAL** | **21** | **All findings categorized with root causes, exact logs, and recommended patches.** |

---

## Workspace Health Matrix

| Workspace / Package | Typecheck | Build | Unit/Logic | Health Status | Key Issue Summary |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`packages/types`** | ✅ PASS | N/A | ✅ PASS | 🟢 Healthy | Clean. Needs `"typecheck": "tsc --noEmit"` in package.json. |
| **`packages/utils`** | ✅ PASS | N/A | ✅ PASS | 🟢 Healthy | Clean. Needs `"typecheck": "tsc --noEmit"` in package.json. |
| **`packages/firebase`** | ✅ PASS | N/A | ⚠️ FAIL | 🟡 At Risk | `chat.ts` UID parsing flaw, `tasks.ts` review rejection logic, `chat.ts`<->`firestore.ts` circular dependency, `validation.ts` null crashes. |
| **`packages/ui`** | ❌ FAIL | N/A | ⚠️ FAIL | 🔴 Broken | TS2307: Invalid `@/components/ui/button` imports in `calendar.tsx` and `sheet.tsx`; undeclared `react-day-picker`. |
| **`packages/config`** | ❌ FAIL | N/A | ℹ️ N/A | 🟡 At Risk | TS18003: Empty `include: []` without files in tsconfig.json. |
| **`apps/guild-web`** | ✅ PASS* | ✅ PASS (⚠️ Chunks) | ⚠️ FAIL | 🟡 At Risk | Serverless route `razorpay.ts` TS1192 error; `billing.ts` top-level env access; Markdown converter regex bug; `vendor-core` >880 kB chunk. |
| **`apps/admin-web`** | ✅ PASS | ✅ PASS | ✅ PASS | 🟢 Healthy | Clean build (5.3s). Missing `types: ["vite/client"]` in tsconfig. |
| **`apps/landing-web`** | ✅ PASS | ✅ PASS | ✅ PASS | 🟢 Healthy | Clean build (2.9s). |
| **Root Monorepo** | ⚠️ Partial | ✅ PASS | ℹ️ No Runner | 🟡 At Risk | No automated test runner (`vitest`/`jest`) configured; root `typecheck` skips packages. |

---

## Detailed Findings by Severity

---

### 🚨 Critical Severity Findings

#### Issue C-01: Direct Message Notification & Reaction Task Routing Corruption via `dmId.split('_')`
- **Affected Workspace**: `packages/firebase`
- **File Paths**:
  - `packages/firebase/src/chat.ts` (lines 306–307)
  - `packages/firebase/src/replies.ts` (lines 72–78)
- **Error / Failure Description**:
  The chat and reply notification handlers attempt to deduce the DM recipient's UID by splitting `dmId` with `'_'`:
  ```ts
  // chat.ts:306
  const [uid1, uid2] = params.dmId.split('_');
  const recipientId = uid1 === params.senderId ? uid2 : uid1;
  ```
  ```ts
  // replies.ts:73
  const parts = dmId.split('_');
  const otherId = parts.find((p) => p !== userId);
  ```
  When user IDs contain underscores (common with Firebase Auth custom UIDs, Auth0 IDs e.g. `auth0_123456`, Google provider UIDs e.g. `google_1029384756`, or internal IDs e.g. `user_alice_456`):
  `dmId.split('_')` produces an array of >2 elements (`['google', '1029384756', 'user', 'alice', '456']`). Destructuring `[uid1, uid2]` extracts `'google'` and `'1029384756'`. Because `'google' !== 'google_1029384756'`, `recipientId` is set to `'google'`.
- **Impact**: Push notifications, unread badges, and reaction-generated tasks are routed to corrupted/truncated non-existent user IDs, causing silent message loss and broken notifications.
- **Root Cause**: Hardcoded assumption that user IDs never contain underscore characters.
- **Recommended Fix**:
  Retrieve participant list directly from the `directMessages` thread document:
  ```ts
  // In packages/firebase/src/replies.ts
  const dmSnap = await getDoc(doc(db, 'directMessages', dmId));
  const participants: string[] = dmSnap.data()?.participants ?? [];
  const otherId = participants.find((id) => id !== userId);
  ```
  And in `chat.ts`, pass `recipientId` explicitly or query the DM document participants.

---

#### Issue C-02: Inverted Status Transition Condition in `moveTask` Blocks Review Rejections by Managers
- **Affected Workspace**: `packages/firebase`
- **File Path**: `packages/firebase/src/tasks.ts` (lines 268–275)
- **Error / Failure Description**:
  The `moveTask` function enforces backward status transitions with the following check:
  ```ts
  if (newStatusVal < oldStatusVal) {
    // Backward status transition
    const isRejection = oldStatus === 'review' && newStatus === 'in_progress' && taskData.creatorId === actor.uid;
    if (!isRejection) {
      throw new Error("Backward status transitions are not allowed unless the creator rejects a review.");
    }
  }
  ```
  In standard workflows:
  1. A member (`taskData.creatorId`) submits a task for review (`status = 'review'`).
  2. A manager / lead (`actor.uid`) reviews the work and decides to reject it back to `in_progress`.
  3. Because `taskData.creatorId !== actor.uid`, `isRejection` evaluates to `false`, throwing:
     `"Backward status transitions are not allowed unless the creator rejects a review."`
  Furthermore, reopening completed tasks (`done` -> `in_progress` or `todo`) is completely blocked for all users including admins.
- **Impact**: Managers, leads, and reviewers cannot reject tasks submitted for review. Only the task creator can reject their own task, completely inverting role-based approval controls.
- **Root Cause**: Condition erroneously checked that the actor rejecting the task must be the creator, rather than allowing reviewers/managers/admins to reject tasks.
- **Recommended Fix**:
  Update `moveTask` to allow valid backward transitions:
  ```ts
  if (newStatusVal < oldStatusVal) {
    const isRejection = oldStatus === 'review' && newStatus === 'in_progress';
    const isReopen = oldStatus === 'done' && (newStatus === 'in_progress' || newStatus === 'todo');
    if (!isRejection && !isReopen) {
      throw new Error("Backward status transitions are not allowed except when rejecting a review or reopening a task.");
    }
  }
  ```

---

### ⚠️ High Severity Findings

#### Issue H-01: Broken Import Path Aliases in Shared `packages/ui` Components
- **Affected Workspace**: `packages/ui`
- **File Paths**:
  - `packages/ui/src/components/calendar.tsx` (line 12)
  - `packages/ui/src/components/sheet.tsx` (line 5)
- **Compiler Error Output**:
  ```
  packages/ui/src/components/calendar.tsx:12:40 - error TS2307: Cannot find module '@/components/ui/button' or its corresponding type declarations.
  12 import { Button, buttonVariants } from "@/components/ui/button"
                                            ~~~~~~~~~~~~~~~~~~~~~~~~
  packages/ui/src/components/sheet.tsx:5:24 - error TS2307: Cannot find module '@/components/ui/button' or its corresponding type declarations.
  5 import { Button } from "@/components/ui/button"
                           ~~~~~~~~~~~~~~~~~~~~~~~~
  Found 2 errors in 2 files.
  ```
- **Impact**: `packages/ui` cannot be compiled independently. Any external package or consumer importing `@guild/ui` fails compilation unless the consumer's tsconfig maps `@/components/ui/button`.
- **Root Cause**: Components were copied from `apps/guild-web` without updating path aliases to relative package imports (`./button`).
- **Recommended Fix**:
  ```diff
  --- a/packages/ui/src/components/calendar.tsx
  +++ b/packages/ui/src/components/calendar.tsx
  @@ -12,1 +12,1 @@
  -import { Button, buttonVariants } from "@/components/ui/button"
  +import { Button, buttonVariants } from "./button"

  --- a/packages/ui/src/components/sheet.tsx
  +++ b/packages/ui/src/components/sheet.tsx
  @@ -5,1 +5,1 @@
  -import { Button } from "@/components/ui/button"
  +import { Button } from "./button"
  ```

---

#### Issue H-02: Undeclared `react-day-picker` Dependency in `packages/ui`
- **Affected Workspace**: `packages/ui`
- **File Path**: `packages/ui/package.json`
- **Error / Failure Description**:
  `packages/ui/src/components/calendar.tsx` imports `DayPicker` from `react-day-picker`:
  ```ts
  import { DayPicker, getDefaultClassNames, type DayButton, type Locale } from "react-day-picker"
  ```
  However, `packages/ui/package.json` does not declare `react-day-picker` in `dependencies` or `peerDependencies`.
- **Impact**: In isolated package installations, CI containers, or pnpm/strict package hoisting environments, importing `@guild/ui` will fail with missing module `react-day-picker`.
- **Root Cause**: Missing dependency declaration during package extraction.
- **Recommended Fix**:
  Add `"react-day-picker": "^9.0.0 || ^10.0.0"` to `packages/ui/package.json` under `dependencies` or `peerDependencies`.

---

#### Issue H-03: Incompatible Default `crypto` Import in Serverless API Route
- **Affected Workspace**: `apps/guild-web`
- **File Path**: `apps/guild-web/api/razorpay.ts` (line 1)
- **Compiler Error Output**:
  ```
  apps/guild-web/api/razorpay.ts:1:8 - error TS1192: Module '"crypto"' has no default export.
  1 import crypto from 'crypto';
           ~~~~~~
  Found 1 error in apps/guild-web/api/razorpay.ts:1
  ```
- **Impact**: Fails TypeScript typecheck when building Vercel serverless functions in strict Node environments.
- **Root Cause**: Node's built-in `crypto` type definitions in `@types/node` do not provide a default export under `moduleResolution: bundler` without `esModuleInterop: true`.
- **Recommended Fix**:
  ```diff
  --- a/apps/guild-web/api/razorpay.ts
  +++ b/apps/guild-web/api/razorpay.ts
  @@ -1,1 +1,1 @@
  -import crypto from 'crypto';
  +import { createHmac } from 'crypto';
  ```

---

#### Issue H-04: Runtime Circular Dependency Between `chat.ts` and `firestore.ts` in `@guild/firebase`
- **Affected Workspace**: `packages/firebase`
- **File Paths**:
  - `packages/firebase/src/chat.ts` (line 9)
  - `packages/firebase/src/firestore.ts` (line 20)
- **Diagnostic Output**:
  ```
  ✖ Found circular dependency:
  packages/firebase/src/chat.ts -> packages/firebase/src/firestore.ts -> packages/firebase/src/chat.ts
  ```
  - `chat.ts:9` imports `deleteCollectionByQuery` from `./firestore`.
  - `firestore.ts:20` imports `seedDefaultChannels` from `./chat`.
- **Impact**: In ES module runtimes, circular dependencies can result in `undefined` imports during module evaluation, leading to runtime `TypeError: (0, _firestore.deleteCollectionByQuery) is not a function` during workspace initialization or channel deletion.
- **Root Cause**: Firestore collection utilities and chat domain seed logic were cross-imported rather than isolated in helper modules.
- **Recommended Fix**:
  Extract `deleteCollectionByQuery` into `packages/firebase/src/firestore-helpers.ts` and import it into both `chat.ts` and `firestore.ts`.

---

#### Issue H-05: Unhandled `null` / `undefined` Runtime TypeErrors in Validation Helpers
- **Affected Workspace**: `packages/firebase`
- **File Path**: `packages/firebase/src/validation.ts` (lines 12–14, 33–36)
- **Runtime Error Output**:
  ```
  TypeError: Cannot read properties of null (reading 'trim')
      at isValidEmployeeId (packages/firebase/src/validation.ts:13:13)

  TypeError: Cannot read properties of undefined (reading 'trim')
      at isValidPhoneNumber (packages/firebase/src/validation.ts:34:14)
  ```
- **Impact**: Submitting forms with optional or empty employee ID / phone number fields throws unhandled JavaScript errors, freezing onboarding and profile edit flows.
- **Root Cause**: `id.trim()` and `phone.trim()` assume non-nullable string inputs without defensive type guards.
- **Recommended Fix**:
  ```ts
  export function isValidEmployeeId(id?: string | null): boolean {
    if (!id || typeof id !== 'string') return false;
    return id.trim().length > 0 && id.trim().length <= 50;
  }

  export function isValidPhoneNumber(phone?: string | null): boolean {
    if (!phone || typeof phone !== 'string' || !phone.trim()) return true;
    return /^\+?[0-9\s\-()]{7,20}$/.test(phone.trim()) && phone.replace(/\D/g, '').length >= 7;
  }
  ```

---

#### Issue H-06: Unprotected Top-Level `import.meta.env` Module Access Crashing Node/SSR/Tests
- **Affected Workspace**: `apps/guild-web`
- **File Path**: `apps/guild-web/src/lib/billing.ts` (lines 48–53)
- **Runtime Error Output**:
  ```
  TypeError: Cannot read properties of undefined (reading 'VITE_ANNUAL_OFFER_END_DATE')
      at apps/guild-web/src/lib/billing.ts:49:19
  ```
- **Impact**: Importing `@/lib/billing` in any non-Vite context (Node.js test runners, serverless routes, SSR engines) immediately crashes on module load.
- **Root Cause**: Top-level constants directly access `import.meta.env.VITE_ANNUAL_OFFER_END_DATE` without checking if `import.meta.env` exists.
- **Recommended Fix**:
  ```ts
  export const ANNUAL_OFFER_END = new Date(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANNUAL_OFFER_END_DATE) || '2026-09-30'
  );
  export const ENTERPRISE_CONTACT_URL =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENTERPRISE_CONTACT_URL) || 'mailto:enterprise@guildhq.com';
  ```

---

### ⚠️ Medium Severity Findings

#### Issue M-01: Markdown Converter Regex HTML Attribute Corruption & `DOMParser` SSR Crash
- **Affected Workspace**: `apps/guild-web`
- **File Path**: `apps/guild-web/src/utils/markdownConverter.ts` (lines 21, 30, 160)
- **Error Description**:
  1. `markdownConverter.ts` converts links first (`[text](url)` -> `<a href="url">text</a>`), then applies italic regex:
     `html.replace(/(?:^|[^*])\*([^*]+)\*/g, ...)`
     If a URL contains asterisks or underscores (e.g. `[Doc](https://api.com/v1/query*test*)`), the italic regex replaces the substring inside `href="..."`, resulting in corrupted HTML: `<a href="https://api.com/v1/query<em>test</em>">Doc</a>`.
  2. `exportHtmlToMarkdown` calls `new DOMParser()`, which does not exist in Node.js / SSR runtimes and throws `ReferenceError: DOMParser is not defined`.
- **Recommended Fix**: Tokenize links prior to formatting replacements, and guard `DOMParser` with `typeof window !== 'undefined'`.

---

#### Issue M-02: Unchecked `updateDoc` on Deleted Task During Request Status Approval
- **Affected Workspace**: `packages/firebase`
- **File Path**: `packages/firebase/src/requests.ts` (lines 90–98)
- **Error Description**:
  When approving a request linked to a task, `requests.ts` fetches `taskSnap = await getDoc(taskRef)`. However, it unconditionally executes:
  ```ts
  if (status === 'approved') {
    await updateDoc(taskRef, { approved: true, updatedAt: serverTimestamp() });
  }
  ```
  If the task was previously deleted, `updateDoc` throws `FirebaseError: No document to update`, aborting the approval and preventing the request document update and notification dispatch.
- **Recommended Fix**: Add `taskSnap.exists()` guard:
  ```ts
  if (status === 'approved' && taskSnap.exists()) {
    await updateDoc(taskRef, { approved: true, updatedAt: serverTimestamp() });
  }
  ```

---

#### Issue M-03: Unsafe `.toDate()` Call in `reports.ts` `isOverdue` Function
- **Affected Workspace**: `packages/firebase`
- **File Path**: `packages/firebase/src/reports.ts` (line 41)
- **Error Description**:
  `isOverdue(task: Task)` calls `task.dueDate.toDate() < new Date()`. If `dueDate` is an ISO string, a standard JS `Date`, or a serialized timestamp from local cache / API, it lacks `.toDate()` and throws `TypeError: task.dueDate.toDate is not a function`.
- **Recommended Fix**: Safely unwrap Timestamp, Date, and string values:
  ```ts
  function isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'done') return false;
    const due = typeof (task.dueDate as any)?.toDate === 'function'
      ? (task.dueDate as any).toDate()
      : new Date(task.dueDate as any);
    return due < new Date();
  }
  ```

---

#### Issue M-04: Search `highlightSegments` Single-Match Limitation & Null Crash
- **Affected Workspace**: `packages/firebase`
- **File Path**: `packages/firebase/src/search.ts` (lines 104–112)
- **Error Description**:
  1. `text.indexOf(query)` is used once without looping, causing search highlight rendering to highlight only the first occurrence of a search keyword in long text.
  2. If `text` or `query` is null/empty, `text.toLowerCase()` throws a `TypeError`.
- **Recommended Fix**: Add a `while` loop for global segment extraction and add null guards.

---

#### Issue M-05: Unmemoized `URL.createObjectURL` Causing Memory Leaks in Chat
- **Affected Workspace**: `apps/guild-web`
- **File Path**: `apps/guild-web/src/pages/chat/MessageInput.tsx` (line 244)
- **Error Description**:
  ```tsx
  <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
  ```
  `URL.createObjectURL(file)` creates a new DOM blob URL on **every single component re-render** (e.g. typing each character into the message input). These URLs remain allocated in browser memory until the page is reloaded.
- **Recommended Fix**: Store created blob URLs in React state or `useMemo`, and invoke `URL.revokeObjectURL(url)` in a `useEffect` cleanup hook.

---

#### Issue M-06: Oversized Vendor Chunks in `apps/guild-web` Production Bundle
- **Affected Workspace**: `apps/guild-web`
- **File Path**: `apps/guild-web/vite.config.ts` (lines 43–57)
- **Bundler Warning**:
  ```
  (!) Some chunks are larger than 500 kB after minification:
  dist/assets/vendor-core-DBX6zm18.js    880.65 kB │ gzip: 284.86 kB
  dist/assets/vendor-firebase-BuVFHOEf.js 518.96 kB │ gzip: 121.06 kB
  ```
- **Impact**: Degrades initial page load time, Core Web Vitals (LCP), and mobile performance.
- **Root Cause**: `apps/guild-web/vite.config.ts` lumps `@tiptap`, `prosemirror`, `@base-ui/react`, `@dnd-kit`, and `date-fns` into a single `vendor-core` chunk.
- **Recommended Fix**: Split `manualChunks` in `vite.config.ts` into granular vendor chunks: `vendor-editor` (`@tiptap`, `prosemirror`), `vendor-dnd` (`@dnd-kit`), `vendor-base-ui`, and `vendor-react`.

---

### ℹ️ Low Severity & Configuration Findings

#### Issue L-01: Monorepo Root `npm run typecheck` Skips All 5 Workspaces in `packages/*`
- **Affected Workspace**: Monorepo Root & `packages/*`
- **File Path**: `package.json` (line 17) & `packages/*/package.json`
- **Description**: Root `package.json` executes `npm run typecheck --workspaces --if-present`. Because none of `packages/types`, `packages/utils`, `packages/firebase`, `packages/ui`, or `packages/config` define a `"typecheck"` script in their `package.json`, root typecheck runs only on the 3 apps and ignores packages.
- **Recommended Fix**: Add `"scripts": { "typecheck": "tsc --noEmit" }` to all `packages/*/package.json`.

---

#### Issue L-02: Conflicting Legacy `@types/react-router-dom@5.3.3` in `apps/guild-web`
- **Affected Workspace**: `apps/guild-web`
- **File Path**: `apps/guild-web/package.json` (lines 23, 36)
- **Description**: `apps/guild-web` uses `react-router-dom@7.15.1` (which provides native TypeScript definitions), but also has legacy `@types/react-router-dom@^5.3.3` in `dependencies`. Without `skipLibCheck: true`, this generates 14 TypeScript errors due to conflicting v5/v7 declarations.
- **Recommended Fix**: Remove `@types/react-router-dom` from `apps/guild-web/package.json`.

---

#### Issue L-03: Serverless API Routes and `vite.config.ts` Excluded from `apps/guild-web/tsconfig.json`
- **Affected Workspace**: `apps/guild-web`
- **File Path**: `apps/guild-web/tsconfig.json` (line 6)
- **Description**: `apps/guild-web/tsconfig.json` specifies `"include": ["src", "components", "lib"]`, which omits `apps/guild-web/api/*.ts` and `vite.config.ts` from normal typechecking passes.
- **Recommended Fix**: Update `include` to `["src", "components", "lib", "api", "vite.config.ts"]`.

---

#### Issue L-04: Empty `include: []` in `packages/config/tsconfig.json` Causing TS18003
- **Affected Workspace**: `packages/config`
- **File Path**: `packages/config/tsconfig.json`
- **Compiler Output**: `error TS18003: No inputs were found in config file '.../packages/config/tsconfig.json'. Specified 'include' paths were '[]'`
- **Recommended Fix**: Replace `"include": []` with `"files": []`.

---

#### Issue L-05: Dynamic `import.meta.env[...]` Property Indexing in `packages/firebase/src/firebase.ts`
- **Affected Workspace**: `packages/firebase`
- **File Path**: `packages/firebase/src/firebase.ts` (lines 11–19)
- **Description**: Accessing environment variables dynamically via `import.meta.env[\`VITE_\${key}\`]` prevents bundlers (Vite/Rollup) from performing static dead-code elimination and string literal replacements at compile time.
- **Recommended Fix**: Use direct static property accesses (`import.meta.env.VITE_FIREBASE_API_KEY`) or define an explicit mapping object.

---

#### Issue L-06: Static Circular Type Dependencies in `apps/guild-web` Onboarding Flow
- **Affected Workspace**: `apps/guild-web`
- **File Paths**:
  - `apps/guild-web/src/pages/onboarding/OnboardingRoot.tsx`
  - `apps/guild-web/src/pages/onboarding/StepChoose.tsx`
  - `apps/guild-web/src/pages/onboarding/create/StepOrgDetails.tsx`
  - `apps/guild-web/src/pages/onboarding/create/StepOwnerProfile.tsx`
  - `apps/guild-web/src/pages/onboarding/join/StepJoinOrg.tsx`
  - `apps/guild-web/src/pages/onboarding/join/StepMemberProfile.tsx`
- **Description**: `OnboardingRoot.tsx` imports child step components, while child step components import `type { OnboardingData }` from `OnboardingRoot.tsx`.
- **Recommended Fix**: Extract `OnboardingData` into a shared types file `apps/guild-web/src/types/onboarding.ts`.

---

#### Issue L-07: Insecure Pseudo-Random UUID Generator in `validation.ts`
- **Affected Workspace**: `packages/firebase`
- **File Path**: `packages/firebase/src/validation.ts` (line 49)
- **Description**: Uses `Math.random().toString(36)` to generate invite codes and tokens, which is cryptographically predictable.
- **Recommended Fix**: Use `crypto.randomUUID()` or `globalThis.crypto.getRandomValues()`.

---

## Actionable Patch Recipes

### 1. Fix `packages/ui` Imports & Dependencies
```diff
--- a/packages/ui/src/components/calendar.tsx
+++ b/packages/ui/src/components/calendar.tsx
@@ -12,1 +12,1 @@
-import { Button, buttonVariants } from "@/components/ui/button"
+import { Button, buttonVariants } from "./button"

--- a/packages/ui/src/components/sheet.tsx
+++ b/packages/ui/src/components/sheet.tsx
@@ -5,1 +5,1 @@
-import { Button } from "@/components/ui/button"
+import { Button } from "./button"

--- a/packages/ui/package.json
+++ b/packages/ui/package.json
@@ -28,6 +28,7 @@
   "dependencies": {
     "@guild/utils": "*",
     "@base-ui/react": "*",
     "class-variance-authority": "*",
-    "lucide-react": "*"
+    "lucide-react": "*",
+    "react-day-picker": "^9.0.0 || ^10.0.0"
   }
```

### 2. Fix Serverless API Route `razorpay.ts`
```diff
--- a/apps/guild-web/api/razorpay.ts
+++ b/apps/guild-web/api/razorpay.ts
@@ -1,1 +1,1 @@
-import crypto from 'crypto';
+import { createHmac } from 'crypto';
```

### 3. Fix Chat Notification Routing & Task Review Rejection Logic
```diff
--- a/packages/firebase/src/replies.ts
+++ b/packages/firebase/src/replies.ts
@@ -72,3 +72,3 @@
-    const dmId = data.dmId as string;
-    const parts = dmId.split('_');
-    const otherId = parts.find((p) => p !== userId);
+    const dmSnap = await getDoc(doc(db, 'directMessages', data.dmId as string));
+    const participants: string[] = dmSnap.data()?.participants ?? [];
+    const otherId = participants.find((p) => p !== userId);

--- a/packages/firebase/src/tasks.ts
+++ b/packages/firebase/src/tasks.ts
@@ -270,3 +270,3 @@
-    const isRejection = oldStatus === 'review' && newStatus === 'in_progress' && taskData.creatorId === actor.uid;
-    if (!isRejection) {
-      throw new Error("Backward status transitions are not allowed unless the creator rejects a review.");
+    const isRejection = oldStatus === 'review' && newStatus === 'in_progress';
+    const isReopen = oldStatus === 'done' && (newStatus === 'in_progress' || newStatus === 'todo');
+    if (!isRejection && !isReopen) {
+      throw new Error("Backward status transitions are not allowed except when rejecting a review or reopening a task.");
```

### 4. Fix Defensive Validation Guards
```diff
--- a/packages/firebase/src/validation.ts
+++ b/packages/firebase/src/validation.ts
@@ -12,3 +12,4 @@
-export function isValidEmployeeId(id: string): boolean {
-  return id.trim().length > 0 && id.trim().length <= 50;
+export function isValidEmployeeId(id?: string | null): boolean {
+  if (!id || typeof id !== 'string') return false;
+  return id.trim().length > 0 && id.trim().length <= 50;
 }
@@ -33,4 +34,4 @@
-export function isValidPhoneNumber(phone: string): boolean {
-  if (!phone.trim()) return true;
-  return /^\+?[0-9\s\-()]{7,20}$/.test(phone.trim()) && phone.replace(/\D/g, '').length >= 7;
+export function isValidPhoneNumber(phone?: string | null): boolean {
+  if (!phone || typeof phone !== 'string' || !phone.trim()) return true;
+  return /^\+?[0-9\s\-()]{7,20}$/.test(phone.trim()) && phone.replace(/\D/g, '').length >= 7;
 }
```

---

## Verification Commands & Steps

To independently verify the audit conclusions and reproduce all findings:

```bash
# 1. Verify UI Package Typecheck Failure
npx tsc --noEmit --project packages/ui/tsconfig.json

# 2. Verify Serverless Function TS Error
npx tsc --noEmit apps/guild-web/api/*.ts --skipLibCheck

# 3. Verify Circular Dependencies Across Workspace
npx -y madge --circular --extensions ts,tsx apps/guild-web/src apps/admin-web/src apps/landing-web/src packages/*/src

# 4. Verify Monorepo Production Builds
npm run build:guild
npm run build:admin
npm run build:landing

# 5. Verify Logic & Utility Edge Case Flaws
npx tsx .agents/explorer_logic_1/test_utils.ts
npx tsx .agents/explorer_logic_1/test_chat_logic.ts
npx tsx .agents/explorer_logic_1/test_tasks_and_reports.ts
npx tsx .agents/explorer_logic_1/test_markdown_converter.ts
```
