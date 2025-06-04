# 📋 Minutes of Meeting - Week 1

**Date:** June 04, 2025  
**Project:** Subtitle Translator App  
**Attendees:** Project Team + Microsoft Mentors  
**Note:** Shivam (Team member) was unable to attend the meeting due to a family emergency.

---

## 🎯 Key Project Goals

### 1. Subtitle Translator Web App (Primary Goal)
Develop a simple, minimal web application that enables users to translate subtitles from English (or source language) to a selected target language and download the translated file:
- Enable users to upload subtitle files (e.g., `.srt`, `.vtt`) and translate them into a selected target language.
- Users can select both source and target languages, view or edit translations, and download the output in the original subtitle format.
- Integrate with Azure Translation Services or use LLM-based APIs / existing Node.js NLP modules for accurate and scalable translation.
- Implement subtitle file serialization and deserialization to ensure format preservation.
- *(Optional)* Add user login and management features for personalization and access control.

### 2. Subtitle Library / DockerHub-Style Repository (Secondary Goal)
Create a searchable archive or DockerHub-like interface for subtitle sharing:
- Implement a searchable subtitle archive that functions similarly to DockerHub, allowing users to store, retrieve, and share subtitle files generated via the app.
- Users can search, browse, version, and download subtitle datasets—especially useful for recurring events or commonly accessed media content.
- Support user-contributed uploads with metadata tagging, version history, and access controls (if authentication is enabled).

### 3. Chrome Extension for Real-Time Subtitle Translation (Exploratory Goal)
Build a browser extension that allows real-time translation of subtitles while consuming video content:
- Develop a lightweight browser extension that enables real-time translation of subtitles during video playback on streaming platforms like YouTube and Netflix.
- Automatically detect existing subtitles and translate them on-the-fly using Azure Translation services.
- Overlay translated subtitles seamlessly on the video player, providing live accessibility for content that lacks native multilingual support.
- Designed to be platform-agnostic and enhance viewing experiences without altering the underlying video source.

---

## 💻 Technical & Management Notes

### Azure Translation API
- Azure subscription access confirmed
- Will be used for both static and real-time translation tasks
- Need to monitor usage limits

### LLM & AI Use
- Free to use Copilot, GPT, and LLMs for productivity and translation assistance
- Avoid reliance on LLMs for full logic implementation
- Encourage modular, fallback-aware design

### GitHub Repository
- All members must make meaningful and consistent commits
- Use clear branching, PRs, and issue tracking

### Task & Project Tracking
- Jira setup complete
- Each member owns sprint tasks and weekly responsibilities
- Sprint cadence aligned with project deadlines

### Incremental Goal Completion Strategy
- Finish one milestone (static subtitle web app) before proceeding to next (library, extension)
- Avoid multitasking across multiple incomplete goals

---

## ✅ Action Items for the Coming Week

- **Add Mentors to GitHub**: Grant access to Microsoft mentors for visibility and feedback.
- **Implement Frontend Components**: Develop UI for subtitle file upload and source/target language selection.
- **Integrate Azure Translator**: Connect backend to Azure Translation API and implement subtitle serialization/deserialization.
- **Own Sprint Tasks**: Each team member to take complete ownership of their assigned Sprint 1 stories.
- **Track and Update Progress**: Actively use Jira to manage progress and keep stories up to date.
- **Begin Subtitle File Testing**: Start testing translated subtitle output and enable download in `.srt` and `.vtt` formats.
- **Mentor Communication**: Share weekly progress, blockers, and demo snapshots with mentors for timely feedback.
- **Refine Jira Structure**: Reflect the three major project goals (Web App, Subtitle Library, Chrome Extension) via updated Epics, Stories, and Sprints.
- **Plan Task Distribution**: Align tasks with team capacity and upcoming deliverables like the Project Plan and Interim Demo.
- **Prioritize MVP First**: Focus initial efforts on completing Web App MVP in Sprints 1–2, followed by Library and Extension in future sprints.
