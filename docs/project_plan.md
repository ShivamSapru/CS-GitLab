# Project Plan - Team Software Project (COMP47250)

## Team: The Sentinels  
## Project Title: Subtitle Translator App

---

## Project Objectives

The Subtitle Translator App aims to eliminate language and accessibility barriers in video communication by delivering high-quality subtitle translation. This solution is especially valuable for global education, public outreach, and corporate webinars, where accessibility for non-native speakers and the deaf and hard of hearing is critical.

The project is centred around three core goals:

1. **Static Subtitle Translation Web App:** A cloud-based application allowing users to upload `.srt` and `.vtt` files, translate content to a target language using the Azure AI Translator model, and download the updated subtitles. Optional editing and user authentication are included for personalisation and control.

2. **Subtitle Library Repository:** A searchable archive for storing and sharing translated subtitles. Like DockerHub, it allows metadata tagging, version control, and user-contributed content for recurring content like meetings or educational videos.

3. **Chrome Extension for Real-Time Subtitle Overlay:** A lightweight browser extension for real-time subtitle translation during video playback (e.g., YouTube, Netflix), using WebSocket streaming and Azure Translation for on-the-fly translation and rendering.

The architecture emphasises modularity, cloud deployment via Azure, Docker-based environments, and seamless integration between React (frontend) and FastAPI (backend). This project reflects Microsoft’s commitment to accessibility and inclusivity while offering a multidisciplinary challenge in AI, DevOps, UX, and cloud engineering.

---

## Sprint Schedule

| **Sprint** | **Dates** | **Theme** | **Key Tasks** | **Milestones** |
|------------|-----------|-----------|---------------|----------------|
| **Sprint 1** | Jun 2 – Jun 8 | Foundation, Planning & MVP Setup | Project plan, repo structure, CI/CD setup, draft UI, define epics/stories | Project Plan – June 9, 2025 |
| **Sprint 2** | Jun 9 – Jun 22 | Static Upload + Subtitle Translation MVP | Subtitle upload, Azure AI Translator integration, UI/UX for language selection | Interim Demo – June 23, 2025<br>CATME Review #1 – June 24, 2025 |
| **Sprint 3** | Jun 23 – Jul 6 | Subtitle Library / Archive System | Archive interface, subtitle tagging, search, backend routing | — |
| **Sprint 4** | Jul 7 – Jul 20 | Browser Extension – Real-Time Translation | Real-time streaming, WebSocket API, browser extension overlay | — |
| **Sprint 5** | Jul 21 – Aug 3 | Post-Event Translation + Format Export | Export to .docx/.pdf, session storage, final UI polish | Final Demo – August 4, 2025 |
| **Sprint 6** | Aug 4 – Aug 19 | Final QA, Documentation, and Submission | Regression testing, final documentation, demo video, submission checklist | Final Report & CATME Review #2 – August 19, 2025 |

---

## Team Roles

### Team Role Assignment Matrix

| **Student Number** | **Team Member** | **Role 1** | **Role 2** |
|--------------------|------------------|------------|------------|
| 24207626 | Samudra Pratim Borkakoti | Backend & AI Developer | Jira & Mentor Coordination |
| 24220984 | Pratham Sharma | Frontend & UX Developer | Real-Time UI Integration |
| 24212867 | Rishabh Sudarshanraj Lingsugur | Docs & Planning Lead | Privacy & Compliance Officer |
| 24204532 | Shivam Sapru | Backend/DevOps Support | Testing & Infrastructure Support |
| 24202802 | Shubham Ravikiran Limkar | DevOps & Deployment Lead | Cloud Security & CI/CD Architect |
| 24208659 | Yadnesh Sujit Sirdeshmukh | Backend API Developer | Library & Metadata Implementation |

## Role Definitions

1. **Backend & AI Developer (Samudra)**
   - Leads integration with Azure AI Translator for static and real-time translation.  
   - Implements translation logic and contributes to the real-time captioning system.  
   - Maintains sprint progress in Jira and communicates updates to mentors.  

2. **Frontend & UX Developer (Pratham)**
   - Builds and maintains the React-based frontend for static and real-time interfaces.  
   - Ensures accessibility and responsive design.  
   - Leads development of the UI for file handling and real-time caption overlay.  

3. **Docs & Planning Lead (Rishabh)**
   - Manages all documentation: MoMs, reports, user guides, and policies.  
   - Tracks sprint deliverables and ensures compliance with submission standards.  
   - Enforces privacy standards and API security protocols.  

4. **DevOps & Deployment Lead (Shubham)**
   - Designs and implements Docker-based architecture for deployment.  
   - Configures CI/CD using GitHub Actions.  
   - Oversees cloud hosting on Azure and security best practices.  

5. **Backend/DevOps Support (Shivam)**
   - Assists in backend integrations and infrastructure setup.  
   - Contributes to testing pipelines and DevOps tasks as required.  
   - Available as backup for high-priority sprint needs.  

6. **Backend API Developer (Yadnesh)**
   - Develops and maintains FastAPI endpoints for upload, translation, and download.  
   - Leads implementation of subtitle library with metadata and search support.  
   - Collaborates on backend scalability and performance.  

---

## Architecture Setup

Our Subtitle Translator App follows a **modular, cloud-native architecture** designed to support both static subtitle translation and real-time live caption translation. The system is divided into clearly defined layers — frontend, backend, translation engine, storage, and streaming — to enable scalability, maintainability, and efficient deployment.

### Layered Technology Stack

| **Layer** | **Technology** |
|-----------|----------------|
| Frontend | React.js (Vite), served via Nginx |
| Backend | FastAPI (Python) |
| Translation | Azure AI Translator Text API |
| Deployment | Azure Cloud (containerized with Docker) |
| Streaming | WebSocket-based real-time communication |

### System Architecture Overview

The diagram below visually represents the interaction between major components for both **static subtitle translation** and **real-time subtitle captioning** workflows:

![Architecture Diagram](https://github.com/user-attachments/assets/250daa08-69cd-4406-a798-dcb3a5300a12)


---

### Component Breakdown

#### Frontend (React + Vite + Nginx)
- Acts as the user-facing interface where users can upload `.srt`/`.vtt` subtitle files, view real-time captions, and download translated subtitles.  
- Communicates with the backend synchronously via HTTP and asynchronously via WebSockets for live translation.

#### Backend API (FastAPI)
- Manages file uploads, download endpoints, metadata storage, and translation logic.  
- Handles both static text translation and real-time caption streaming integration.

#### Translation Layer (Azure AI Translator Text)
- Receives text segments from the backend and returns translated output.  
- Handles language detection and character chunking (with optimized limits under 25,000 characters/request).

#### Live Caption Stream (Real-Time Only)
- Captures live subtitles from sources (e.g., Zoom, Teams) and pushes them into the backend.  
- Processed asynchronously and translated using Azure, then sent back to the frontend for overlay display.

#### Message Queue (Asynchronous Pipeline)
- Used to buffer streamed captions between components during real-time processing.

#### Static Storage & Delivery System
- files and metadata are stored using:
  - **Azure Blob Storage** for raw and translated files
  - **Relational Database** for metadata (language, timestamps, user info)
  - **CDN** for fast delivery of output subtitles  
- Translated subtitle files are displayed/downloaded via a secure, synchronous endpoint.

---

### Deployment & Setup Evidence

We have configured a full-stack deployment pipeline with the following components:

- `Dockerfile` and `docker-compose.yml` for local testing and cloud deployment
- **Azure subscription** provided by Microsoft mentors; containers are deployed using Azure Web App for Containers
- Deployed via **Azure Web App for Containers**
- CI/CD using **GitHub Actions** for automated testing, build, and deployment
- Proof of setup: Architecture diagram (above), screenshots of deployed services, and logs available in the /docs and /devops folders in the GitHub repo

This architecture enables a **clean separation of concerns**, real-time communication, and support for both dynamic and static translation tasks.

---

### Data Plan

The project leverages **user-uploaded subtitle files** (.srt, .vtt) and **live speech audio (captions)** as core inputs. These are industry-standard formats widely used in video platforms like YouTube, Vimeo, and conferencing tools.

### Input Data

- .srt and .vtt files for static translation from publicly available subtitle repositories (like OpenSubtitles.org)
- Captions from Microsoft Teams or Zoom API (real-time)
- Sample audio clips for Whisper/STT testing

### Generated Data

- Translated subtitle files (.srt, .vtt, .docx, .pdf)
- Metadata (e.g., language, tags, contributor info)
- Logs & real-time transcripts

### Evaluation Methods

- Manual review for translation accuracy
- BLEU / WER metrics for STT comparison
- Usability testing and latency benchmarks

This dataset scope is sufficient to assess the application across translation quality, system latency, and accessibility coverage.

---

## GitHub Evidence

- Repository:https://github.com/ShivamSapru/CS-GitLab 
- ## Highlights:

• Organized folder structure: `frontend/`, `backend/`, `docs/`, `devops/`, `tests/`

• Branching Strategy:  
  o `main`: Final, stable production code.  
  o `dev`: Integration branch for merging tested features.  
  o `feature/*`: Developers work on branches like `feature/frontend`, `feature/backend`, etc.  
  o All PRs flow from `feature/*` → `dev` → `main`, ensuring tested deployment.

• Each team member commits regularly and meaningfully to their respective branches.

• Pull Requests (PRs) enforce peer review and quality control.

• Continuous Integration: GitHub Actions automate testing and builds.

• Documentations, maintained in the `docs/` folder, including:  
  o Daily internal MoMs  
  o Weekly mentor catch-up MoMs  
  o Architecture diagrams, sprint logs, and planning documents


---

## Team Management

- **Meeting Practices**
  - The team conducts daily internal stand-up calls and weekly mentor catch-ups via Microsoft Teams.
  - Minutes of Meetings (MoMs) are diligently maintained for daily and weekly sessions and stored in the docs/ folder of the GitHub repository.
  - These MoMs capture attendee details, task updates, and blockers, ensuring traceability and team alignment.

- **Sprint and Task Management**
  - The team uses **Jira** for sprint planning, task tracking, and backlog grooming
  - All stories, epics, and subtasks are tracked with assignments and deadlines visible to team members, Microsoft mentors, Prof. Avishek Nag and Prof. Shen Wang.
  - Jira Board: https://sentinels-subtitle-translator.atlassian.net/

- **Branching & Workflow**
  
• Follows a structured Git-based development model:  
  o `main`: Final production-ready code.  
  o `dev`: Integration branch for tested features.  
  o `feature/*`: Developer-specific branches (e.g., `feature/frontend`, `feature/backend`) based on `dev`.

  - Developers create PRs to dev after completing features; only tested and reviewed code is merged into main.
  - Admin rights are provided to team members for seamless development and deployment.

- **Transparency & Monitoring:**
  - GitHub commits and Jira updates are regularly reviewed to monitor contributions.
  - Mentors are included in the GitHub repository and receive weekly updates.
  - GitHub Projects and Actions automate deployments and test builds, enhancing visibility and accountability.

---








