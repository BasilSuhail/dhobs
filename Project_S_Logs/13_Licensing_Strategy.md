# Project S — Licensing Strategy & Research Log

This document records the strategic decision-making process for the Project S commercial license, ensuring the project remains open-source friendly while protecting its commercial viability.

---

## 1. Goal: Sustainable Commercial Open Source

Project S aims to be a self-hosted platform that users can trust, but it also requires a sustainable business model to ensure long-term maintenance and protection against "strip-mining" by large cloud providers or competitors.

### Primary Objectives:
- **Protect Market Share:** Ensure that the original founders (Author) maintain the majority market share and primary sales channel for hardware/software bundles.
- **Transparency:** Keep the source code public and auditable for security and privacy.
- **Self-Hosting Freedom:** Allow individual users to self-host, modify, and contribute to the project for free.
- **Path to True OSS:** Ensure the code eventually belongs to the public domain or a permissive license to build long-term ecosystem trust.

---

## 2. License Selection: Functional Source License (FSL)

After extensive research into modern "Post-Open Source" strategies (Open Core, BSL, SSPL, AGPL), **FSL-1.1-Apache-2.0** was selected as the optimal choice for Project S.

### 2.1 Comparative Analysis (2025/2026 Standards)

| License | Pros | Cons | Verdict |
| :--- | :--- | :--- | :--- |
| **MIT / Apache 2.0** | Universal trust, high adoption. | Zero protection; AWS can clone and sell it tomorrow. | Rejected (Too risky) |
| **AGPL v3** | Strong copyleft; forces code sharing. | Viral nature scares away many enterprise users. | Back-up Choice |
| **BSL 1.1** | High commercial protection. | Often complex "Additional Use Grants" and long conversion times (4+ years). | Strong Contender |
| **FSL 1.1** | **Standardized, Simple, and Defensive.** | Technically "Source Available" rather than OSI Open Source. | **Selected** |

---

## 3. Why FSL-1.1-Apache-2.0?

The Functional Source License, pioneered by Sentry, provides a unique "Vibe-Code" friendly legal framework:

### 3.1 Commercial Protection
The FSL explicitly prohibits **Competing Use**. This means a competitor cannot take the Project S source code and sell it as a managed service or pre-installed hardware bundle without a commercial agreement from the Licensor.

### 3.2 The 2-Year "Change Date"
The most powerful feature of the FSL is its automated conversion. 
- **Today:** The software is FSL-1.1 (Source Available).
- **In 2 Years:** That specific version of the code automatically transitions to the **Apache License 2.0**.

This creates a "Rolling Moat." We always have a 2-year lead on the commercial market, but the community is guaranteed that the software will eventually be truly Open Source.

---

## 4. Implementation in Project S

1.  **LICENSE File:** Created at the root of the repository containing the full FSL-1.1 text.
2.  **Compliance Path:**
    *   **Self-Hosters:** 100% Free.
    *   **Educational/Research:** 100% Free.
    *   **Commercial Resellers:** Requires a separate partnership agreement (The "Official Partner" program).

---

## 5. Credits & Reference

- **Sentry.io:** For pioneering the FSL model.
- **Strategy & Research:** Author.
- **Implementation:** Author.
- **Reference:** Decision Log #13 (Commercialization & Moat Strategy).

**Status:** Finalized & Implemented.
**Next Steps:** Draft the "Official Partner" agreement for hardware bundle resellers in Phase 2.
