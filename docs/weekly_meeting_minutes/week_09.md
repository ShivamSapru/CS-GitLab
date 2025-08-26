# Minutes of Meeting – Week 9  
**Date:** July 30, 2025  
**Project:** Subtitle Translator App  
**Attendees:** Project Team + Microsoft Mentors  
**Note:** Shivam Sapru and Pratham Sharma were unable to attend due to some work.

## Deployment
- Successfully deployed the backend to Azure, and all core services are functioning as expected.  
- The app is hosted via Azure Container Apps, with two containers: one for the frontend and one for the backend.  
- Encountered some URL-related issues during migration, which were resolved.  
- Navigation bugs from the previous version have been fixed. Subtitle previews and audio transcription work seamlessly.  
- URLs for both frontend and backend services are live and will be documented.  

## Chrome Extension
- Simplified the popup interface, keeping only the essential user inputs.  
- The caption overlay was updated based on mentor feedback — it now auto-hides and becomes visible only on hover.  
- Overlay opacity and visibility behavior were improved.  
- A deployment link for the extension will be created and integrated with the Azure backend.  

## Transcription Output
- Transcription and translation files are being generated correctly.  
- The system is able to produce .srt files for transcribed audio and their translated versions.  
- Output has been tested and verified to match expected behavior in different environments.  
- File preview and download options are available as part of the final workflow.  

## Testing & Automation
- Implemented unit tests to validate APIs such as transcription, translation, and authentication.  
- Developed integration tests to verify full workflows.  
- Word Error Rate (WER) tests were created and pass successfully, ensuring translation quality.  
- All tests are structured, categorized, and automated using Pytest.  
- Output validation is done for each major function.  
- Upcoming task: Expand test coverage and implement Selenium-based end-to-end automation.  
