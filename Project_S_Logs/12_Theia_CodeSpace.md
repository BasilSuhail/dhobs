# Project S — Theia CodeSpace Integration Log

This document records the strategic decision and implementation plan for the Theia-based CodeSpace module.

---

## 1. Summary
Project S uses a containerized IDE called **CodeSpace** to allow developers to build and test software directly within the browser. After an initial audit, the project transitioned from VS Code Server to Eclipse Theia.

---

## 2. The Theia Decision
The switch from VS Code to **Eclipse Theia** was driven by:
- **Vendor Neutrality:** Theia is managed by the Eclipse Foundation and is strictly open-source (MIT).
- **Licensing:** While VS Code's core is open-source, the official branded product has proprietary elements. Theia provides a "true" open-source foundation for custom branding.
- **Customizability:** Theia is designed to be embedded and extended, making it the perfect platform for the Project S "Developer" module.

---

## 3. Integration Plan
- **Persistence:** The CodeSpace container mounts a persistent workspace volume, shared with other services if needed.
- **Access:** Integrated into the Dashboard sidebar for quick launch.
- **Tooling:** Default support for terminal access, Git integration, and common programming languages.

---

## 4. Credits & Licenses
- **Eclipse Theia:** Developed by the Eclipse Foundation and project contributors (Eclipse Public License 2.0 / MIT).
- **Project Site:** [theia-ide.org](https://theia-ide.org)
- **Repository:** [github.com/eclipse-theia/theia](https://github.com/eclipse-theia/theia)
