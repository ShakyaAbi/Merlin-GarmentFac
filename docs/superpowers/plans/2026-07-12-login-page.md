# Login Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Merlin’s login page into a focused, accessible, responsive authentication surface.

**Architecture:** Keep the existing authentication handlers and API calls in `Login.tsx`, replacing only the rendered layout and utility classes. Use the existing Tailwind CDN theme, Merlin logo, Lucide icons, and Silk background component.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind utility classes, Node test runner, Vite.

## Global Constraints

- Login remains the primary task; registration and Google sign-in remain secondary.
- Preserve keyboard navigation, loading behavior, error behavior, and reduced-motion support.
- Avoid introducing new dependencies or changing authentication service behavior.

---

### Task 1: Lock the login surface contract with a source test

**Files:**
- Create: `apps/web/__tests__/loginPageSource.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(path.resolve('apps/web/pages/Login.tsx'), 'utf8')

test('login page presents a focused authentication panel', () => {
  assert.match(source, /Welcome back/)
  assert.match(source, /Sign in to Merlin/)
  assert.match(source, /Create an account/)
  assert.match(source, /aria-live="polite"/)
})

test('login page preserves accessible form controls and reduced motion', () => {
  assert.match(source, /aria-label=\{showPassword \? "Hide password" : "Show password"\}/)
  assert.match(source, /motion-reduce:transition-none/)
  assert.match(source, /motion-reduce:hidden/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test apps/web/__tests__/loginPageSource.test.ts`

Expected: FAIL because the current split layout does not contain the focused-panel copy or reduced-motion classes.

### Task 2: Implement the focused login layout

**Files:**
- Modify: `apps/web/pages/Login.tsx`

- [ ] **Step 1: Write the minimal implementation**

Keep `handleSubmit`, `handleGoogleSignIn`, state, and navigation unchanged. Replace the JSX with a single responsive panel containing the logo, welcome copy, labeled fields, inline error, primary login button, secondary Google button, registration link, and quiet footer links. Add `aria-live="polite"` to errors, an accessible password toggle label, and `motion-reduce` utility classes to decorative/entrance motion.

- [ ] **Step 2: Run the focused test**

Run: `node --test apps/web/__tests__/loginPageSource.test.ts`

Expected: PASS.

### Task 3: Verify the web app

**Files:**
- No additional files.

- [ ] **Step 1: Run the web build**

Run: `npm run build:web`

Expected: Vite completes successfully with no TypeScript or bundling errors.

- [ ] **Step 2: Refresh the code graph**

Run: `graphify update .`

Expected: Graphify updates `graphify-out/` successfully.
