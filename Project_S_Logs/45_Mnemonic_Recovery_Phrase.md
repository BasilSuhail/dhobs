# 45 — 12-Word Mnemonic Recovery Phrase (Issue #201)

**Date:** April 13, 2026  
**Author:** Basil Suhail  
**Related Issue:** #201  
**PR:** #208  
**Status:** ✅ Merged to main (`74e3e08`)

---

## Context

The original setup flow required users to save a **128-character hex key** — intimidating for non-technical users and hard to verify manually.

**Goal:** Replace the hex key with a **12-word mnemonic** (BIP-39 style) that's easier to write down, read back, and verify.

---

## Implementation

### 1. Mnemonic Library (`lib/mnemonic.ts`)
- Full 2048-word BIP-39 English wordlist
- `bytesToMnemonic()` — encodes 16 bytes (128 bits) into 12 words with 4-bit checksum
- `parseMnemonic()` / `validateMnemonic()` — verify user input
- `looksLikeMnemonic()` — detect if input looks like a mnemonic

### 2. Setup UI Changes (`app/setup/page.tsx`)
- **Before:** Single monospace block of 128 hex characters
- **After:** 12 numbered cards in a 2-column grid
  - Words blurred until user clicks "Reveal"
  - Copy button copies the full 12-word phrase
  - Hex key available in a collapsible `<details>` for power users
- Checkbox text updated: "12-word recovery phrase" instead of "recovery key"
- Step label: "Save Your Recovery Phrase" instead of "Save Your Recovery Key"

### 3. How It Works
1. Mouse entropy generates 64-byte SHA-512 hash (same as before)
2. First 16 bytes (128 bits) extracted
3. 4-bit checksum computed (sum of all bytes mod 256, top 4 bits)
4. 132 bits → twelve 11-bit indices → twelve wordlist words
5. The **full 128-char hex key** is still sent to `/api/auth/setup` — the mnemonic is just a human-friendly encoding

### 4. Why 12 Words (128-bit) Not 24 Words (256-bit)
- 12 words = 128-bit entropy + 4-bit checksum = **standard BIP-39**
- 128 bits is already far beyond any brute-force capability
- 12 words is the sweet spot: memorable enough to write down, secure enough for production
- 24 words would be unnecessarily long for this use case

---

## Acceptance Criteria
- [x] Setup page shows 12 numbered words after mouse collection
- [x] Words are blurred until user clicks Reveal
- [x] Copy button copies the mnemonic phrase
- [x] Hex key available in collapsible section
- [x] Setup flow completes successfully
- [x] No backend changes needed (same hex key sent to API)

---

## Commits

| Commit | Description |
|--------|-------------|
| `9b58f0d` | Initial implementation — mnemonic lib + setup UI |
| `74e3e08` | Merged to main via PR #208 |
