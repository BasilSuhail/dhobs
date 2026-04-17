
# Project S Roadmap

## v1.0 Release — April 15, 2026 ✅

**Status:** Production Ready  
**PRs Merged:** #219 (Security), #220 (Host Metrics)  
**CI Status:** All Green (4/4 checks)

---

## v1.0.1 — In Progress

| Feature | Status | Issue | Branch | Log |
|---|---|---|---|---|
| Compiled Host Agent (Go) | ✅ Done | #225 | `feat/compiled-host-agent-225` | #51 |
| Migration Waiter Phase 9 | ✅ Merged | #239 | `feat/phase-9-migration-waiter` | #55 |
| Architecture SSOT | ✅ Merged | #241 | `docs/architecture-ssot-241` | #56 |
| Network Segmentation | ✅ Merged | #242 | `feat/network-segmentation-242` | #57 |
| Host Agent Auto-Start | ⏳ PR Open | #245 | `feat/host-agent-autostart-245` | #58 |

### v1.0 Features Shipped

| Feature | Status | PR |
|---|---|---|
| Self-Healing Scripts (boom.sh) | ✅ Done | #200 |
| Traefik Integration | ✅ Done | #204 |
| Tailscale One-Click | ✅ Done | #205 |
| Incremental Backups (Restic) | ✅ Done | #206 |
| 12-Word Recovery Phrase | ✅ Done | #208 |
| TOTP 2FA | ✅ Done | #210 |
| boom.sh Security Hardening | ✅ Done | #219 |
| Cross-Platform Host Metrics | ✅ Done | #220 |
| Backup Tab UI Polish | ✅ Done | #217 |

### v1.0 Security Audit

- ✅ YAML injection mitigated (envsubst templating)
- ✅ .env creation requires user confirmation
- ✅ GitGuardian: 0 secrets detected
- ✅ All CI checks passing

---

## Phase 1 Research and Open Source Selection

### Task 1 Define Integration Criteria
* Category Research and Open Source Selection
* Description Document the full criteria checklist for evaluating open source tools including web accessibility and popularity and MIT license and completeness of solution per service. This becomes the evaluation rubric used across all future selections.
* Dependencies None
* Priority Critical
* Duration 2 days
* Owner Contributor
* Status Completed
* Notes Criteria established and documented in Log 01 and Log 03.
* Basil Findings: Research Libre Chat (https://github.com/danny-avila/LibreChat.git) as the frontend interface for local LLM capabilities within Project S. This tool provides a ChatGPT-like experience that connects to Ollama models running on the user's hardware. Our co-founder identified this as a strategic fit because it offers conversation history, model switching, and tool-calling features that would take 3-4 months to build from scratch.
    We need to verify license compatibility (MIT/Apache preferred), assess how deeply we can customize its appearance to match Project S branding, and determine if it can integrate with our existing authentication system. If viable, this becomes our AI module—saving significant development time while delivering a polished experience.
        Timeline: 2 days research
        Priority: Critical (core dashboard feature)
        Output: License assessment + integration feasibility report.

### Task 2 Audit License Compatibility
* Category Research and Open Source Selection
* Description Review each proposed open source repository for MIT license compliance. Flag any GPL or AGPL tools that cannot be natively integrated and identify MIT licensed alternatives.
* Dependencies Step 1
* Priority Critical
* Duration 3 days
* Owner Contributor
* Status Completed
* Notes Audit performed and documented in Log 07 and Log 13. Decision made to use FSL-1.1-Apache-2.0 for Project S core.
* Basil Findings Identified 5 non-MIT tools in the proposed stack (Nextcloud AGPL, ERPNext GPL, Kiwix GPL, Vaultwarden AGPL, n8n Fair Code). Opened Discussion #4 to align on AGPL/GPL integration policy before completing the audit. Key decision needed on whether Apache 2.0 should be treated as first-class alongside MIT.

### Task 3 Research NAS and Media Layer Jellyfin
* Category Research and Open Source Selection
* Description Evaluate Jellyfin at github.com/jellyfin/jellyfin for NAS and media serving. Verify MIT license. Document supported formats including video and audio and images. Assess API surface for dashboard integration.
* Dependencies Step 2
* Priority Critical
* Duration 2 days
* Owner Contributor
* Status Completed
* Notes Jellyfin confirmed MIT license. Integrated into HomeForge stack (Log 09).

### Task 4 Research Productivity Suite Nextcloud
* Category Research and Open Source Selection
* Description Evaluate Nextcloud at github.com/nextcloud/server as the Google Suite replacement. Document its app ecosystem including Docs and Calendar and Contacts and Mail. Assess Docker deployment complexity and REST API.
* Dependencies Step 2
* Priority Critical
* Duration 2 days
* Owner Contributor
* Status Completed
* Notes Nextcloud integrated as a dual-container AGPL service (Log 10).

### Task 5 Research Code Environment VS Code Server and Neovim
* Category Research and Open Source Selection
* Description Evaluate code server for VS Code in browser and Neovim for the Project S CodeSpace module. Document MIT compliance for code server. Assess browser based IDE startup time and extension ecosystem.
* Dependencies Step 2
* Priority High
* Duration 2 days
* Owner Contributor
* Status Completed
* Notes Strategic shift to Eclipse Theia (EPL-2.0) documented in Log 12.

### Task 6 Research Testing and Simulation Tools Selenium and Expo
* Category Research and Open Source Selection
* Description Evaluate Selenium at github.com/SeleniumHQ/selenium for browser or device simulation and Expo CLI at github.com/expo/expo for React Native mobile testing. Map integration points with the CodeSpace.
* Dependencies Step 5
* Priority High
* Duration 2 days
* Owner Contributor
* Status Not Started
* Notes Both confirmed MIT license

### Task 7 Research Communication Server Matrix Synapse
* Category Research and Open Source Selection
* Description Evaluate Matrix Synapse at github.com/matrix-org/synapse as the communication backbone. Document federation capabilities and REST API for dashboard management and Docker image availability.
* Dependencies Step 2
* Priority High
* Duration 2 days
* Owner Contributor
* Status Completed
* Notes Matrix Synapse (Apache 2.0) and Element Web integrated (Log 14).

### Task 8 Research Reverse Proxy and GUI Nginx and Nginx UI
* Category Research and Open Source Selection
* Description Evaluate Nginx at github.com/nginx/nginx for port mapping and reverse proxy duties. Evaluate Nginx UI at github.com/0xJacky/nginx ui for the graphical management layer within the Project S dashboard.
* Dependencies Step 2
* Priority Critical
* Duration 2 days
* Owner Contributor
* Status Completed
* Notes Nginx integrated as reverse proxy (Log 08).

### Task 9 Research Version Control Layer Git
* Category Research and Open Source Selection
* Description Evaluate embedding Git at github.com/git/git within Project S for CodeSpace version control. Research Gitea as a self hosted Git web UI that complements the CodeSpace module.
* Dependencies Step 2
* Priority High
* Duration 1 day
* Owner Contributor
* Status Not Started
* Notes Gitea uses MIT license and is a strong candidate for bundled Git UI

### Task 10 Research ERP ERPNext and Mail Server Options
* Category Research and Open Source Selection
* Description Evaluate ERPNext for the premium ERP module and its built in mail server. Research Stalwart Mail or Maddy as MIT licensed standalone mail server alternatives for self hosters who do not need full ERP.
* Dependencies Step 2
* Priority Medium
* Duration 3 days
* Owner Contributor
* Status Not Started
* Notes ERPNext uses GPL so it must be a paid premium add on or user installed optional module

### Task 11 Research Automation Layer n8n
* Category Research and Open Source Selection
* Description Evaluate n8n at n8n.io for workflow automation. Confirm the license situation as n8n uses a fair code license and document limitations. Design the one click git pull and compose deployment workflow.
* Dependencies Step 2
* Priority High
* Duration 2 days
* Owner Contributor
* Status Not Started
* Notes n8n Sustainable Use License means it cannot be natively embedded and must remain user deployed

### Task 12 Research Knowledge Base Kiwix
* Category Research and Open Source Selection
* Description Evaluate Kiwix for offline internet knowledge storage. Assess ZIM file management. Research the Kiwix server Docker image and its API for integration into the Project S dashboard.
* Dependencies Step 2
* Priority Medium
* Duration 1 day
* Owner Contributor
* Status Not Started
* Notes Kiwix is GPL licensed so treat as an optional user module

### Task 13 Research Smart Home and IoT Layer
* Category Research and Open Source Selection
* Description Survey Chinese and open markets for Arduino compatible and Zigbee or Z Wave smart home devices. Evaluate Home Assistant at github.com/home assistant/core as the open source smart home management platform.
* Dependencies Step 2
* Priority Medium
* Duration 4 days
* Owner Contributor
* Status Not Started
* Notes Home Assistant is Apache 2.0 which is compatible with integration strategy

### Task 14 Research Password Management
* Category Research and Open Source Selection
* Description Evaluate Vaultwarden which is a Bitwarden compatible MIT server for the password management module. Document API endpoints for potential dashboard widget integration.
* Dependencies Step 2
* Priority Critical
* Duration 1 day
* Owner Contributor
* Status Not Started
* Notes Vaultwarden is AGPL so assess whether a wrapper approach satisfies integration policy

### Task 15 Compile Final Open Source Stack Decision Document
* Category Research and Open Source Selection
* Description Consolidate all research from Steps 2 through 14 into a single decision document listing the chosen tool for each module. Include license status and Docker image name and GitHub stars count and last commit date.
* Dependencies Steps 2 through 14
* Priority Critical
* Duration 2 days
* Owner Contributor
* Status Not Started
* Notes This document gates all subsequent development work

## Phase 2 Initial Setup User Side

### Task 16 Design the Entropy Key Generation Flow
* Category Initial Setup User Side
* Description Design the browser based mouse movement entropy capture system. Map the UX flow where the user is prompted on first launch to move their mouse randomly for approximately 10 seconds. The entropy pool generates a unique 256 bit key.
* Dependencies Step 15
* Priority Critical
* Duration 3 days
* Owner Contributor
* Status Not Started
* Notes Implement using Web Crypto API window.crypto.getRandomValues seeded with mouse movement deltas

### Task 17 Implement Mouse Entropy Capture Module
* Category Initial Setup User Side
* Description Build the frontend JavaScript module that captures raw mouse movement coordinates. Hash the collected coordinates using SHA 256 via Web Crypto API to produce the user encryption key. This runs exactly once.
* Dependencies Step 16
* Priority Critical
* Duration 4 days
* Owner Contributor
* Status Not Started
* Notes Store only the derived key and never raw mouse data. Show a visual entropy meter to guide the user.

### Task 18 Implement Master Credential Setup Screen
* Category Initial Setup User Side
* Description Build the UI for the Master Login and Password creation step. Enforce strong password policy with minimum 16 characters and complexity rules. The master password must be hashed with Argon2id before any storage operation.
* Dependencies Step 17
* Priority Critical
* Duration 3 days
* Owner Contributor
* Status Not Started
* Notes Master credentials are immutable by design so make the warning clear in the UI

### Task 19 Implement Encrypted Credential Storage
* Category Initial Setup User Side
* Description Encrypt the hashed master credentials using the user unique mouse entropy key via AES 256 GCM. Store the encrypted blob. The plaintext password must never touch disk. Write automated tests for encrypt and decrypt round trips.
* Dependencies Step 17
* Priority Critical
* Duration 3 days
* Owner Contributor
* Status Not Started
* Notes Use PBKDF2 or Argon2 as the KDF before AES encryption for added hardening

### Task 20 Build Multi User Account Creation System
* Category Initial Setup User Side
* Description Enable the Master User to create sub accounts with username and temporary password. Each sub account is encrypted and stored under the same secure credential store. Sub accounts cannot modify master credentials.
* Dependencies Step 18
* Priority High
* Duration 4 days
* Owner Contributor
* Status Not Started
* Notes This becomes the foundation of the Project S IAM layer

### Task 21 Build Role Based Access Control RBAC System
* Category Initial Setup User Side
* Description Design and implement pre defined roles including Admin and Developer and Viewer and Media User. Each role maps to a set of module permissions. The Master User assigns roles to accounts without manual permission configuration.
* Dependencies Step 20
* Priority High
* Duration 4 days
* Owner Contributor
* Status Not Started
* Notes Roles must be extensible so the Master User should be able to clone and customise existing roles

### Task 22 Build Privilege Assignment Interface
* Category Initial Setup User Side
* Description Create the UI for the Master User to assign roles and granular privileges to sub accounts. Include a permissions matrix view showing which modules each user or role can access.
* Dependencies Step 21
* Priority High
* Duration 3 days
* Owner Contributor
* Status Not Started
* Notes Design this to scale so a team of over 20 users must be manageable without friction

### Task 23 Write Setup Completion and Onboarding Walkthrough
* Category Initial Setup User Side
* Description After setup guide the user through a brief interactive walkthrough of the dashboard key areas. Confirm that credentials are backed up and that the unique key is understood to be non recoverable.
* Dependencies Steps 16 through 22
* Priority Medium
* Duration 2 days
* Owner Contributor
* Status Not Started
* Notes Consider offering an encrypted key export to a USB drive as a backup option

## Phase 3 Dashboard Design

### Task 24 Define Dashboard Information Architecture
* Category Dashboard Design
* Description Map out the full navigation structure including top level modules and sub pages within each. Produce a sitemap and wireframe structure before any visual design begins.
* Dependencies Step 15
* Priority Critical
* Duration 3 days
* Owner Contributor
* Status Not Started
* Notes No module should require more than 2 clicks to reach from the home screen

### Task 25 Design Logo and Brand Identity
* Category Dashboard Design
* Description Create the Project S logo mark and full brand identity system including primary and secondary colours and typography pairing and icon style and spacing tokens. Output a brand guide document and SVG assets.
* Dependencies Step 24
* Priority High
* Duration 5 days
* Owner Contributor
* Status Not Started
* Notes Brand identity must convey trust and openness and technical precision without being cold

### Task 26 Design Server Specs Widget RAM CPU Storage GPU
* Category Dashboard Design
* Description Design and build the server resource monitoring widget. It must display real time CPU usage and RAM consumption and per disk storage utilisation and GPU stats if available without requiring command line access.
* Dependencies Steps 24 through 25
* Priority Critical
* Duration 5 days
* Owner Contributor
* Status Completed
* Notes Integrated into Dashboard as a native section (Log 11).

### Task 27 Build Core Dashboard Layout and Navigation Shell
* Category Dashboard Design
* Description Implement the responsive dashboard shell including sidebar navigation and top bar with user context and notification area and main content area. Apply brand tokens. Ensure the layout works cleanly on tablets and 1080p screens.
* Dependencies Steps 25 through 26
* Priority Critical
* Duration 6 days
* Owner Contributor
* Status Completed
* Notes Dashboard shell implemented with floating sidebar and glassmorphism (Log 05).

### Task 28 Build Module Card System for Home Screen
* Category Dashboard Design
* Description Design the home screen as a grid of module cards with one per integrated service. Each card shows the module status and quick launch button and key stat. Inspired by a clean control panel aesthetic.
* Dependencies Step 27
* Priority High
* Duration 4 days
* Owner Contributor
* Status Completed
* Notes Card system integrated into WelcomeSection (Log 05).

### Task 29 Build Integrated Terminal Command Line Module
* Category Dashboard Design
* Description Implement a browser based terminal module using xterm.js or a similar library. The terminal connects to a sandboxed shell environment. This provides command line power for advanced users without leaving the dashboard.
* Dependencies Step 27
* Priority High
* Duration 4 days
* Owner Contributor
* Status Completed
* Notes TerminalPanel implemented in Dashboard (Log 05).

### Task 30 Design Notification and Alert System
* Category Dashboard Design
* Description Build a notification centre within the dashboard to surface service alerts and failed health checks and resource threshold warnings and update availability. Notifications persist until dismissed.
* Dependencies Step 27
* Priority Medium
* Duration 3 days
* Owner Contributor
* Status Not Started
* Notes Design for future push notification support via the React Native mobile app

## Phase 4 The Basics

### Task 31 Set Up Core Docker Compose Architecture
* Category Phase 1 The Basics
* Description Design the top level Docker Compose file that defines networks and shared volumes and service definitions for all Phase 1 modules. Establish naming conventions. Create the docker in docker base container for user applications.
* Dependencies Step 15
* Priority Critical
* Duration 5 days
* Owner Contributor
* Status Completed
* Notes Master DinD image and core compose stack established (Log 08).

### Task 32 Integrate Jellyfin NAS and Media Server
* Category Phase 1 The Basics
* Description Add Jellyfin to the Compose stack. Configure media library paths and user authentication to pass through Project S auth layer. Build the Jellyfin management card in the dashboard.
* Dependencies Step 31
* Priority Critical
* Duration 4 days
* Owner Contributor
* Status Completed
* Notes Integrated into Dashboard as a native section (Log 09).

### Task 33 Integrate Nextcloud Productivity Suite
* Category Phase 1 The Basics
* Description Add Nextcloud to the Compose stack as the file and drive and productivity module. Configure it as a Docker service with a dedicated Postgres container. Proxy through Nginx. Surface core controls in dashboard.
* Dependencies Step 31
* Priority Critical
* Duration 5 days
* Owner Contributor
* Status Completed
* Notes Embedded as a dedicated Dashboard section (Log 10).

### Task 34 Integrate code server VS Code in Browser
* Category Phase 1 The Basics
* Description Deploy code server as a containerised CodeSpace. Configure workspace persistence via a named Docker volume. Connect to Nginx reverse proxy. Surface in the dashboard with a direct launch button.
* Dependencies Step 31
* Priority Critical
* Duration 4 days
* Owner Contributor
* Status Completed
* Notes Eclipse Theia integrated with Docker socket mount for orchestration (Log 12).

### Task 35 Integrate Neovim Web Terminal Option
* Category Phase 1 The Basics
* Description Provide an optional Neovim in browser session as an alternative CodeSpace using ttyd or a similar web terminal wrapper. Mount the same workspace volume used by code server so files are shared.
* Dependencies Step 34
* Priority Medium
* Duration 3 days
* Owner Contributor
* Status Not Started
* Notes This appeals to power users who prefer keyboard driven development workflows

### Task 36 Integrate Selenium for Browser Based Testing
* Category Phase 1 The Basics
* Description Add a Selenium Grid container to the Compose stack accessible from within the CodeSpace. Document how developers connect their test suites to the grid endpoint. Build a simple status card in the dashboard.
* Dependencies Step 34
* Priority High
* Duration 3 days
* Owner Contributor
* Status Not Started
* Notes Include a headless Chrome and Firefox node in the default Selenium Grid configuration

### Task 37 Integrate Expo CLI for React Native Mobile Testing
* Category Phase 1 The Basics
* Description Configure an Expo Dev environment accessible from the CodeSpace terminal. Provide documentation on connecting a physical device or emulator to the Expo server running inside Project S.
* Dependencies Step 34
* Priority High
* Duration 3 days
* Owner Contributor
* Status Not Started
* Notes Expo requires network accessibility so document the LAN address configuration for device testing

### Task 38 Integrate Matrix Synapse Communication Server
* Category Phase 1 The Basics
* Description Add Matrix Synapse to the Compose stack with a dedicated Postgres database. Configure federation settings. Integrate with Nginx for subdomain routing. Build a conversation module card in the dashboard.
* Dependencies Step 31
* Priority High
* Duration 5 days
* Owner Contributor
* Status Completed
* Notes Matrix Synapse and Element client integrated into Dashboard (Log 14).

### Task 39 Integrate Nginx Reverse Proxy and Nginx UI
* Category Phase 1 The Basics
* Description Deploy Nginx as the central reverse proxy for all Project S services. Integrate Nginx UI as the management interface for proxy rules. Surface Nginx UI within the dashboard with role restricted access.
* Dependencies Step 31
* Priority Critical
* Duration 4 days
* Owner Contributor
* Status Completed
* Notes Nginx integrated as reverse proxy (Log 08).

### Task 40 Integrate Git and Gitea Version Control
* Category Phase 1 The Basics
* Description Deploy a Gitea instance as the self hosted Git server for version control. Configure SSH and HTTP access. Connect to the CodeSpace so developers can push and pull from within their browser IDE.
* Dependencies Step 31
* Priority High
* Duration 4 days
* Owner Contributor
* Status Not Started
* Notes Gitea repositories can serve as the deployment source for user automation workflows

### Task 41 Integrate Vaultwarden Password Manager
* Category Phase 1 The Basics
* Description Deploy Vaultwarden as the Project S password management module. Integrate with Nginx for HTTPS access. Surface in dashboard as a direct launch card. Document the Project S master key versus Bitwarden master password distinction.
* Dependencies Step 31
* Priority Critical
* Duration 3 days
* Owner Contributor
* Status Not Started
* Notes Users must be clearly informed that their Vaultwarden vault has a separate master password from Project S

### Task 42 Build Docker in Docker Application Layer
* Category Phase 1 The Basics
* Description Implement the user facing Docker management layer. Users can spawn their own containers from a curated image library without accessing the host Docker socket directly. Provide start and stop and log controls in the dashboard.
* Dependencies Step 31
* Priority High
* Duration 6 days
* Owner Contributor
* Status Not Started
* Notes Use Docker socket proxy to restrict what the inner Docker layer can access for security

### Task 43 Develop React Native Mobile Application v1
* Category Phase 1 The Basics
* Description Build the first iteration of the Project S mobile companion app in React Native using Expo. Initial features include dashboard stats view and Jellyfin media controls and notification feed and secure login with the Project S auth token.
* Dependencies Steps 27 through 42
* Priority High
* Duration 10 days
* Owner Contributor
* Status Not Started
* Notes Mobile app should work seamlessly over LAN and via HTTPS tunnel

### Task 44 Phase 1 Integration Testing and Bug Fixing
* Category Phase 1 The Basics
* Description Run end to end tests across all Phase 1 services including health checks and Nginx routing and auth passthrough and dashboard controls. Document bugs in Gitea issues. Conduct a full security audit of the auth layer.
* Dependencies Steps 32 through 43
* Priority Critical
* Duration 7 days
* Owner Contributor
* Status Not Started
* Notes Use Selenium Grid to automate dashboard UI regression tests

### Task 45 Phase 1 Documentation and Setup Guide
* Category Phase 1 The Basics
* Description Write the end user documentation for Phase 1 including initial setup walkthrough and per module user guide and backup procedures and a troubleshooting FAQ. Host docs as a static site or within the Project S dashboard itself.
* Dependencies Step 44
* Priority High
* Duration 5 days
* Owner Contributor
* Status Not Started
* Notes Documentation should be available offline within Project S using Kiwix or a static MkDocs deployment

## Phase 5 Nice to Haves

### Task 46 Design One Click Module Installer
* Category Phase 2 Nice to Haves
* Description Build the one click deployment system that allows users to install optional Phase 2 modules. The system performs a git pull of the relevant Compose file and runs docker compose up all triggered from the dashboard.
* Dependencies Step 44
* Priority Critical
* Duration 6 days
* Owner Contributor
* Status Not Started
* Notes Each installable module must have a health check endpoint that the dashboard polls post install to confirm success

### Task 47 Integrate ERPNext Premium ERP Module
* Category Phase 2 Nice to Haves
* Description Create the one click ERPNext deployment package. Configure it with a dedicated MariaDB container. Integrate its mail server into the Project S mail configuration. This module is flagged as a paid premium add on in the UI.
* Dependencies Step 46
* Priority Medium
* Duration 6 days
* Owner Contributor
* Status Not Started
* Notes GPL license means ERPNext is user deployed via the one click installer

### Task 48 Integrate Self Hosted Mail Server
* Category Phase 2 Nice to Haves
* Description Research and deploy a self hosted mail server compatible with Project S such as Stalwart Mail or Postal. Configure DKIM and SPF and DMARC records documentation. Provide a dashboard UI for domain and mailbox management.
* Dependencies Step 46
* Priority High
* Duration 7 days
* Owner Contributor
* Status Not Started
* Notes Mail server reputation and deliverability setup should be prominently documented

### Task 49 Integrate n8n Automation User Deployed
* Category Phase 2 Nice to Haves
* Description Build the one click n8n deploy package. Provide pre built Project S workflow templates for n8n such as auto backup trigger and Jellyfin new media notification to Matrix and Gitea push to Nextcloud note.
* Dependencies Step 46
* Priority High
* Duration 4 days
* Owner Contributor
* Status Not Started
* Notes n8n fair code license means it cannot be pre installed and the installer approach respects this boundary

### Task 50 Integrate Kiwix Offline Knowledge Base
* Category Phase 2 Nice to Haves
* Description Deploy the Kiwix server container via the one click installer. Build a dashboard UI for browsing and downloading ZIM files for Wikipedia and Stack Overflow and Project Gutenberg from the Kiwix library catalog.
* Dependencies Step 46
* Priority Medium
* Duration 3 days
* Owner Contributor
* Status Not Started
* Notes Kiwix ZIM files can be very large so surface storage impact clearly in the installer UI

### Task 51 Phase 2 Integration Testing and Module Store Validation
* Category Phase 2 Nice to Haves
* Description Test the one click installer system across all Phase 2 modules. Verify each installer handles network failures gracefully. Confirm all modules surface correctly in the dashboard after installation and uninstallation.
* Dependencies Steps 47 through 50
* Priority Critical
* Duration 5 days
* Owner Contributor
* Status Not Started
* Notes Simulate a failed install midway through to verify rollback and cleanup logic

### Task 52 Phase 2 Documentation Update
* Category Phase 2 Nice to Haves
* Description Extend the documentation from Step 45 to cover all Phase 2 modules and the one click installer system. Add a module marketplace guide explaining license implications and premium versus free tier distinctions.
* Dependencies Step 51
* Priority High
* Duration 3 days
* Owner Contributor
* Status Not Started
* Notes Premium module documentation should clearly explain the value proposition for paid tiers

## Phase 6 Supply Chain and Smart Home

### Task 53 Smart Home Device Market Research
* Category Supply Chain and Smart Home
* Description Survey Chinese and global open markets for Arduino compatible and Zigbee or Z Wave smart home devices. Evaluate compatibility with Home Assistant. Identify 10 to 20 candidate SKUs.
* Dependencies Step 15
* Priority Medium
* Duration 7 days
* Owner Contributor
* Status Not Started
* Notes Focus on ESP32 or ESP8266 based devices and Zigbee sensors

### Task 54 Integrate Home Assistant Smart Home Module
* Category Supply Chain and Smart Home
* Description Deploy Home Assistant via the one click installer. Configure Zigbee2MQTT and Z Wave JS UI as companion containers. Build the Project S smart home dashboard card with device status and room view.
* Dependencies Step 46
* Priority High
* Duration 6 days
* Owner Contributor
* Status Not Started
* Notes Home Assistant is Apache 2.0 and is a strong candidate for deeper native integration

### Task 55 Design Arduino Based Device Flashing Workflow
* Category Supply Chain and Smart Home
* Description Design a workflow within the Project S CodeSpace that allows users to flash open source firmware such as ESPHome or Tasmota to ESP32 or ESP8266 devices directly from the browser IDE.
* Dependencies Step 54
* Priority Medium
* Duration 5 days
* Owner Contributor
* Status Not Started
* Notes ESPHome and Tasmota are excellent candidates for deep integration

### Task 56 Inventory Management Integration
* Category Supply Chain and Smart Home
* Description Select or build a lightweight inventory management module for tracking smart home device stock. ERPNext has this capability if installed. For non ERP users design a standalone Postgres backed inventory module.
* Dependencies Step 53
* Priority Medium
* Duration 5 days
* Owner Contributor
* Status Not Started
* Notes Inventory module should link to the online marketplace component

### Task 57 Online Marketplace Design and Proposal
* Category Supply Chain and Smart Home
* Description Design the framework for an online marketplace where curated open smart home devices are listed for sale. Define the product catalogue structure and checkout integration requirements and fulfilment workflow.
* Dependencies Step 56
* Priority Medium
* Duration 5 days
* Owner Contributor
* Status Not Started
* Notes Marketplace revenue model should be clearly separated from the Project S software subscription model

### Task 58 Smart Home Privacy and Security Audit
* Category Supply Chain and Smart Home
* Description Conduct a privacy audit of all smart home devices and integrations. Document what data each device transmits and confirm all traffic stays within the Project S local network. Produce a Privacy Statement for this module.
* Dependencies Step 55
* Priority Critical
* Duration 4 days
* Owner Contributor
* Status Not Started
* Notes The smart home that does not spy on you tagline must be backed by verifiable technical claims

### Task 59 Phase 3 Documentation and Smart Home Setup Guide
* Category Supply Chain and Smart Home
* Description Write the end user guide for the smart home module including device pairing walkthrough and firmware flashing guide and Home Assistant automation basics and the privacy architecture explanation.
* Dependencies Step 58
* Priority High
* Duration 4 days
* Owner Contributor
* Status Not Started
* Notes This documentation is a key marketing asset

### Task 60 Full System Review and Public Beta Preparation
* Category Supply Chain and Smart Home
* Description Conduct a holistic review of the entire Project S stack across all six stages. Fix outstanding issues from the Gitea backlog. Finalise versioning strategy. Prepare the public beta release package and landing page.
* Dependencies Steps 1 through 59
* Priority Critical
* Duration 10 days
* Owner Contributor
* Status Not Started
* Notes Tag this commit as Project S v0.1.0 beta in Gitea

---

## Master Version Log & Project History

### Versioning Nomenclature (1.2.3.4.5)
To maintain a clear status of project maturity, we use a 5-part semantic versioning system as defined by Shaheer:
1. **Released / Production Version** (e.g., `1` = Live)
2. **Major Updates / Production Upgrades**
3. **Major Bug Fixes**
4. **Minor Updates / Features**
5. **Minor Bug Fixes**

*Pre-release Example:* `v0.0.0.3.3` indicates 3 minor updates and 3 minor bug fixes have been implemented prior to a major release.

### Project History Log

| Version | Date | Description | Author |
| :--- | :--- | :--- | :--- |
| **v0.0.0.4.0** | 2026-04-04 | **Current State:** Integrated Ollama, Open WebUI, and Terminal Theia exec. | Basil |
| **v0.0.0.3.3** | 2026-04-01 | **Nextcloud Stability Fix:** Reverted Nextcloud to v30 due to v33 instability. | Basil |
| **v0.0.0.3.2** | 2026-03-28 | **Service Integration:** Added Matrix Synapse and Element Web client. | Basil |
| **v0.0.0.3.1** | 2026-03-25 | **CodeSpace Update:** Eclipse Theia integration and Docker socket mount. | Basil |
| **v0.1.0 (Initial)**| 2026-03-23 | Initial Dashboard scaffolding and core service definitions. | Basil |

---

## Project S: The Self-Hosted Digital Hub

### Document Purpose
To define the product, outline the build strategy, and assess technical feasibility and market sustainability.

### 1. What is Product S?

#### The Product

Product S is a unified, self-hosted operating system for the home server. It is a software platform that integrates the best open-source tools (office, automation, media, smart home) into a single, easy-to-manage interface. It aims to be the "one-stop-shop" for individuals and small businesses wanting to take back control of their data from big tech companies.

#### Core Principles

* **Unified:** One login, one dashboard, one update system for all services.
* **Private:** End-to-end encryption with user-controlled keys. No cloud dependency.
* **Modular:** Users install only what they need (e.g., just the office suite, or just the home automation).
* **Simple:** Complex server management is abstracted away behind a friendly UI.

#### What It Will Do

**Simplify Deployment:** Install Product S on a Raspberry Pi, old PC, or VPS. The user picks apps from a store (like an app store on a phone), and Product S installs and configures them automatically.

**Provide Core Services:**

* **Office & Communication:** Integrate OnlyOffice (documents) and a chat server like Matrix.
* **Home Automation:** Integrate Home Assistant (smart devices) with a simplified setup wizard.
* **Automation & Data:** Integrate n8n (workflow automation) and a database viewer.
* **Media:** Integrate Jellyfin (media streaming).

**Manage the System:** Handle automatic backups (encrypted), system updates, security monitoring, and user permissions across all installed apps from a single control panel.

### 2. How Will We Build It?

We can build Product S in three distinct phases, focusing on leverage and modularity.

#### 2.1 Phase 1: The Foundation (The "Orchestrator")

* **Goal:** Build the core engine that runs and connects apps.
* **Technology:** A core backend written in Go (for its safety and concurrency) or Rust. This core will not contain the apps themselves.
* **Method:**
    * **Containerization:** Use Docker as the runtime. The core's job is to pull, start, stop, and network Docker containers based on user commands.
    * **Abstraction Layer:** Create a "driver" interface. For Phase 1, the driver is Docker. Later, it could be Podman or Kubernetes.
    * **Single Sign-On (SSO):** Integrate Authelia or Authentik as a reverse proxy. The core will configure this proxy to add authentication in front of every app container, giving the user a single login.
* **Outcome:** A system that can spin up isolated apps and put them behind a unified login wall.

#### 2.2 Phase 2: The App Store & UI (The "Experience")

* **Goal:** Make it easy for users to find and install apps.
* **Technology:** A frontend UI (React or Vue.js) that talks to the Go core API. A package repository (like a simple app store index).
* **Method:**
    * **App Definitions:** For each integrated app (e.g., OnlyOffice), we create a manifest file. This file tells the core: which Docker image to use, which ports to open, and what environment variables are needed.
    * **Store Frontend:** The UI displays available apps. When a user clicks "Install," the core reads the manifest, pulls the image, and runs the container with the correct SSO configuration.
    * **Unified Dashboard:** The UI collects iframes or links from the running containers and presents them as tiles. Clicking a tile opens the app, already logged in via SSO.
* **Outcome:** An "app store" experience where installing complex software is a one-click operation.

#### 2.3 Phase 3: Intelligence & Management (The "Polish")

* **Goal:** Handle the hard stuff, these include backups, updates, and security.
* **Technology:** Plugins for backup tools (e.g., Restic) and monitoring agents.
* **Method:**
    * **Unified Backups:** The core will pause containers (or use filesystem snapshots) and back up their persistent data volumes using Restic, encrypting with the user's master key.
    * **Update Manager:** The core monitors for new versions of the container images defined in the app manifests. It can notify the user or auto-update with a one-click rollback option if something fails.
    * **Resource Governor:** The UI will show CPU/RAM usage per app and allow users to set limits or stop apps when not in use.

### 3. Can It Be Done? (Technical Feasibility)

**Straight Verdict = YES, but not as a single monolithic build.**

**The "Yes":** The technology to build Product S exists today. Docker solves the isolation problem. Projects like Authelia solve the SSO problem. Restic solves the backup problem. The task is not to invent new tech, but to orchestrate existing tech behind a beautiful, simple UI.

**The "But":** It cannot be built as one giant piece of software.

* **Must be a platform, not a product:** Product S must act as a thin, smart layer over standard tools. If you try to write your own container system or your own SSO, you will fail due to complexity.
* **The 80/20 Rule:** You cannot support every configuration of every app. Product S will support the "happy path" (default configs) and provide power users with a terminal to tweak things manually.

### 4. Is It Market Sustainable?

**Straight Verdict = POTENTIALLY YES, but requires a hybrid model.**

The "homelab" and "self-hosted" market is growing because people are concerned about privacy and cloud subscriptions. However, this audience is technically savvy and expects things to be free. Here is how Product S can sustain itself:

#### The Market Need (The "Why")

* **Frustration with Subscriptions:** People are tired of paying monthly for Adobe, Office 365, and streaming services.
* **Privacy Concerns:** Growing distrust of Google and Amazon ecosystems.
* **Hardware Power:** Raspberry Pis and old laptops are powerful enough to run serious services.

#### The Sustainability Model

A pure open-source project with no funding will die due to the maintenance burden (as noted in the challenges). A paid proprietary product will be rejected by the community. Therefore, a Hybrid Model is required:

* **The Core (Open Source - MIT/GPL):** The main orchestrator, the API, and the CLI tools are free. This builds trust and allows community contributions.
* **The App Store & UI (Source Available with Paid Tier):**
    * **Free Tier:** Access to basic apps (file server, simple dashboard).
    * **Paid Subscription/One-Time Fee:** Access to the "Premium App Store" which includes the complex integrations (ERPNext, OnlyOffice, Home Assistant) that require significant maintenance to keep working.
    * **Rationale:** The user pays for the curation and maintenance of the integrations, not the open-source code itself. This pays the developers to update manifests when upstream projects change.

#### Risks to Sustainability

* **The "DIY" Mentality:** The core audience loves to tinker. Convincing them to pay for something they could do themselves (even if it's hard) is the biggest challenge.
* **Maintenance Burnout:** If the subscription revenue doesn't cover the cost of keeping up with 50+ upstream projects, the platform will stagnate and die.
* **Competition:** Existing projects like YunoHost and CasaOS are trying to solve similar problems. Product S would need a significantly better UX or a unique feature (like the encryption focus) to stand out.

#### Final Conclusion

Product S is technically feasible and addresses a real market need. It should be built as a "curated orchestrator" rather than a traditional software product.

The key to success is the business model: Use an open-source core to build trust and community, and a paid "curated app store" to generate the revenue required to sustain the massive maintenance effort. Without that revenue stream, the project will collapse under its own weight within two years.

---

## Potential Challenges in Building Project S

Building an all-encompassing platform like Project S is a monumental task. While the vision is compelling, several significant challenges must be anticipated and addressed. These challenges span technical, security, user experience, maintenance, and community domains.

### 1. Integration Complexity

* **Dependency Hell:** Each integrated open-source project (e.g., OnlyOffice, ERPNext, Spark, Home Assistant) has its own dependencies, runtime requirements, and configuration quirks. Bundling them all together without conflicts is a major technical hurdle.
    * **Solution:** Heavy reliance on containerization (Docker, Podman) to isolate each service. Project S would manage containers rather than bare-metal installations.
* **Versioning and Compatibility:** Upstream projects evolve rapidly. A change in one component (e.g., a database update) could break others. Ensuring all integrated pieces work harmoniously across versions requires continuous testing and potentially pinning specific versions, which may lead to security risks if outdated.
* **API Inconsistencies:** While many projects offer APIs, they vary widely in design, authentication, and capabilities. Project S would need to interact with many different APIs to provide a unified experience (e.g., for backups, user management), which adds complexity.
* **Configuration Drift:** Each service has its own configuration files and methods. Project S must either abstract these into a common interface or become a configuration management tool, which is complex.

### 2. Security Vulnerabilities

* **Expanded Attack Surface:** The more services running, the more potential entry points for attackers. A vulnerability in any one component (e.g., a critical flaw in OnlyOffice or n8n) could compromise the entire server if not properly isolated.
    * **Mitigation:** Strong container isolation, network segmentation, and regular security audits. User-provided encryption keys help protect data at rest, but they don't prevent runtime exploits.
* **Key Management:** The user-specific encryption keys are a core security feature. Storing them securely (or not storing them at all) while allowing access to services is challenging. If a user loses their key, data is irrecoverable. If the key is compromised, all data is exposed.
    * **Approach:** Use a master key to encrypt per-service keys, and never store the master key. Perhaps derive it from a password + salt, and use secure enclaves if available.
* **Inter-Service Communication:** Services may need to talk to each other (e.g., n8n triggering scripts, ERPNext accessing the database). Securing these internal communications (encryption, authentication) is non-trivial.
* **Supply Chain Attacks:** Project S will depend on many third-party containers and libraries. A compromised upstream component could introduce malware. Regular scanning and signing of images are necessary.

### 3. User Experience (UX) Challenges

* **Unifying Disparate Interfaces:** Each integrated tool has its own UI paradigm. While embedding them in iframes or tabs is possible, the experience may feel disjointed. Providing a truly unified dashboard that feels like a single application is difficult.
* **Authentication Maze:** Implementing single sign-on (SSO) across all these services is complex. Many apps support OAuth2/LDAP, but not all. Some may require hacks or reverse-proxy authentication (like Authelia). Ensuring a seamless login/logout experience across all apps is a major UX win but technically challenging.
* **Onboarding Complexity:** For a newbie, the sheer number of options can be overwhelming. Project S must offer guided setups, default configurations, and clear explanations. Balancing power-user flexibility with simplicity is a delicate act.
* **Performance Perception:** Users expect near-instant responses. If many services are running on modest hardware (e.g., a Raspberry Pi), performance may suffer. Project S needs resource monitoring and recommendations to help users scale.

### 4. Maintenance and Sustainability

* **Keeping Up with Upstream:** The open-source world moves fast. Project S would need to constantly monitor for updates, test compatibility, and release new versions. This is a full-time job for a team, not a single developer.
* **Technical Debt:** As the number of integrations grows, the core codebase can become bloated and hard to maintain. A modular architecture (plugins, drivers) is essential.
* **Documentation:** Documenting how to use, configure, and troubleshoot such a vast system is an enormous task. Poor documentation will alienate users and increase support burden.
* **Testing Matrix:** Testing Project S across different Linux distributions, hardware architectures (x86_64, ARM), and configurations (with/without certain services) is a massive QA effort.

### 5. Resource and Performance Constraints

* **Resource Hogging:** Running a full office suite, database, media server, AI models, and home automation simultaneously could consume tens of GB of RAM and high CPU. Project S must handle resource scheduling, possibly allowing users to start/stop services as needed.
* **Startup Time:** Booting all containers at system start could take minutes. Lazy-loading or on-demand activation might be needed.
* **Network Throughput:** Media streaming, backups, and multiple web apps could saturate a home network or a low-bandwidth VPS. Project S should provide bandwidth management and monitoring.

### 6. Legal and Licensing Issues

* **License Compatibility:** Each integrated project has its own license (GPL, AGPL, MIT, Apache, etc.). Combining them into a single distribution (especially if Project S itself is open-source) must comply with all licenses. For example, AGPL code would require Project S to be open-source as well.
* **Trademark Concerns:** Using names like "OnlyOffice" or "ERPNext" in promotional materials must respect their trademarks. The project name must not conflict with existing trademarks.

### 7. Development and Architecture

* **Core in C/C++:** While C/C++ offers performance, it also introduces risks like memory unsafety, which could undermine security. Using modern C++ with RAII and smart pointers helps, but still requires careful coding. Alternatively, the core could be in a safer language like Rust or Go, with C/C++ only for performance-critical parts.
* **Orchestration Logic:** The core must manage containers, networking, backups, and user configurations. This is similar to what Kubernetes or Docker Compose does, but with a custom UI. Reinventing the wheel might be wasteful; leveraging existing orchestration tools (like Nomad, Kubernetes) could be better, but then Project S becomes a management layer on top.
* **Modularity:** The system must be highly modular so that users can pick and choose which services to install. This requires a plugin architecture and a package manager-like system.

### 8. Community and Ecosystem

* **Building a Community:** An ambitious project like this needs contributors. Attracting developers to work on a massive integration platform, rather than a shiny new app, is hard. Clear contribution guidelines and modular design can help.
* **Support Burden:** With so many components, users will encounter bugs that may originate in upstream projects. Project S developers cannot fix those; they must triage and escalate, which can be frustrating for users.
* **Sustainability:** If the project gains popularity, funding for infrastructure (build servers, hosting) and possibly paid maintainers becomes necessary. Open-source sustainability is a well-known challenge.

### 9. Backup and Disaster Recovery

* **Backup Consistency:** Backing up a running database (e.g., PostgreSQL, SQLite) requires consistent snapshots. Using file-level backups may lead to corruption. Integration with database-specific backup tools is needed.
* **Restoration Complexity:** Restoring a single service or the whole system must be straightforward. The backup system should catalog backups and allow granular restore.
* **User Data Encryption:** Backups of encrypted data are themselves encrypted, but the keys must also be backed up (separately, securely) to prevent data loss. This creates a key management dilemma.

### 10. Smart Device and IoT Integration

* **Device Compatibility:** Home Assistant supports thousands of devices, but configuring them can be complex. Project S would need to provide a simplified onboarding for common devices.
* **Local vs. Cloud:** Many IoT devices require cloud connections. Project S's value is local control, but some devices may not work without internet. Handling such edge cases requires clear communication.

### Conclusion

Building Project S is like building an operating system for the cloud era. The challenges are substantial, but not insurmountable. The key is to prioritize modularity, containerization, and a strong plugin architecture from day one. By leveraging existing tools (Docker, Kubernetes, Authelia, etc.) rather than reinventing them, the core team can focus on integration and UX. However, long-term maintenance and community building are the real tests. If successful, Project S could indeed become the last application a homelabber ever needs.
