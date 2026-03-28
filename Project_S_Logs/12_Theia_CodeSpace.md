# Project S — Theia CodeSpace Integration Log

This document records the strategic decision and implementation plan for the Theia-based CodeSpace module, replacing the initial VS Code Server proposal.

---

## 1. Implementation Goal

* To provide a professional-grade Integrated Development Environment (IDE) in the browser.
* To enable developers to modify and test Project S modules without local setup.
* To maintain strict adherence to 100% MIT-compatible licensing for core modules.

## 2. The Strategic Shift: Theia vs. VS Code

While the Roadmap (Task 5) initially proposed VS Code Server (Coder), an audit during Stage 4 identified licensing advantages for Eclipse Theia.

* **Neutrality:** Theia is hosted by the Eclipse Foundation, ensuring it is not controlled by a single corporation.
* **Licensing:** Theia is strictly **EPL-2.0 / MIT compatible**, whereas the "VS Code" brand and some extensions have proprietary restrictions.
* **Customizability:** Theia's architecture allows for deeper integration into the Project S sidebar and theme system.

## 3. Architecture & Networking

* **Service:** Eclipse Theia Docker image.
* **Persistence:** Mounts a shared `/home/user/projects` volume accessible by the Dashboard for deployment.
* **Security:** Integrated into the Project S Auth layer (Phase 2) to restrict access to the "Developer" role.
* **Terminal:** Provides full access to a containerized shell environment.

## 4. Integration Details

* **Launch Method:** Accessible via the "Metrics/Tools" section of the sidebar.
* **Theme Sync:** Designed to adapt its workspace colors to match the selected Dashboard theme (where supported).
* **License Audit:** Verified as compatible with the mandatory MIT integration strategy (Ref: Stage 1).

## 5. Credits & Licenses

* **Eclipse Theia:** The neutral IDE framework — **Eclipse Public License 2.0 / MIT**.
* **Project Repository:** [github.com/eclipse-theia/theia](https://github.com/eclipse-theia/theia)
* **Strategy & Audit:** Saad Shafique (@saadsh15).
* **Reference:** Decision Log #12 (Migration from Coder to Theia).
