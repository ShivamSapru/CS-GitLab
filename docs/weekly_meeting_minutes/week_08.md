# Minutes of Meeting – Week 8  
**Date:** July 23, 2025  
**Project:** Subtitle Translator App  
**Attendees:** Project Team + Microsoft Mentors  

## Authentication & User Access
- Multi-factor authentication has been successfully implemented on the login page.
- The application flow is now secured via authenticated access.
- Users can view and manage previously saved projects post-login.

## Saved Projects & Subtitle Preview
- Users are able to view, manage, and preview individual subtitle files from saved projects.
- Preview supports both original and translated captions in supported formats.
- UI ensures a smooth navigation experience across projects.

## Transcription & Translation
- Static transcription and translation functionality is fully complete.
- Real-time translation via the Chrome Extension is operational across platforms (YouTube stable, Zoom/Teams in progress).
- Limited language options are available for real-time translation; support will expand.

## Chrome Extension Functionality
- Chrome Extension can dynamically fetch language list from Azure Translator API.
- Caption overlay supports both the original and translated text (UX feedback pending).

## UI/UX Observations
- Overlay rendering in YouTube works as expected.
- Current caption overlay includes both source and translated captions, which may clutter the screen.
- Recommendation: Show only translated captions for better clarity and reduced cognitive load.

## Branching & Codebase Organization
- Dedicated feature branches for:  
  - azure-ai (transcription/translation)  
  - blob-storage (subtitle storage)  
  - chrome-extension (extension features)  
- Branch organization improves modular development and parallel work.

## Containerization & Deployment
- Azure App Service or Azure Container Apps will be used for final deployment.
- Containerization (frontend + backend) needs to be finalized urgently.
- Once deployed, mentors will be notified to begin formal testing and provide structured feedback.

## Pull Request & Review Workflow
- All pull requests must be reviewed by at least one other team member before merging.
- This practice ensures consistency, quality, and avoids regressions.
- Peer review is now enforced as part of the standard contribution process.

## Unit Testing & Automation
- Transitioning from manual testing to automated unit and integration testing.
- Automation will be integrated into the pull request workflow.
- Testing approach, tooling, and coverage details will be included in the final project presentation.
