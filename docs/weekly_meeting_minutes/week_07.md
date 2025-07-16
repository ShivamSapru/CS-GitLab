# Minutes of Meeting – Week 7  
**Date:** July 16, 2025  
**Project:** Subtitle Translator App  
**Attendees:** Project Team + Microsoft Mentors  

## Transcription and Translation Latency Improvements
- Efforts are focused on reducing latency in both transcription and translation pipelines.
- Batch Transcription API is currently being used, which pulls audio from videos and processes them in chunks.
- Transcription performance improvements are in progress with changes to backend flow.
- Translation speed is being optimized by testing multiple APIs and minimizing delay in output rendering.
- A key limitation is the 2-hour maximum duration for batch transcription; queuing logic is being introduced to manage large files.
- Users can switch tasks while long jobs process in the background.

## Chrome Extension Progress
- Detection and capture of captions from YouTube has been completed successfully.
- Separate scripts are being maintained for Zoom and YouTube due to differing DOM structures.
- Real-time captions are being captured but currently experience slight delays in rendering.
- Integration with Azure Translator for real-time translation is in progress.
- Azure AI Foundry Functions are being explored to support fast, event-driven translation of captions.
- Challenges remain in maintaining caption consistency and avoiding repeated lines due to continuous updates from streaming content.

## Backend & Database Integration
- A PostgreSQL server has been successfully created and deployed on Azure.
- All tables and schemas required for the app are created and functional.
- The goal is to now integrate the PostgreSQL DB with Dockerized containers for full environment portability.
- This setup will support production deployment and allow secure and scalable data handling.

## Queueing for Long-Running Tasks
- Long-duration processes like transcription and translation will be shifted to a background queue system.
- This prevents the UI from freezing and ensures better user experience.
- Notifications will be sent to users once tasks are completed.
- Background workers will manage queue execution using asynchronous functions.

## Deployment Strategy
- The application will be containerized using either Azure Container Apps or Azure App Service.
- This deployment model ensures scalability, ease of access for mentor reviews, and simplified CI/CD.
- Backend and frontend are already Dockerized; work is ongoing to integrate them using Docker Compose for smoother cloud deployment.

## Testing Strategy
- Manual testing is ongoing for various user interaction flows including:
  - Static transcription and translation  
  - Chrome Extension caption detection  
  - Save-before-download workflows  
- Focus is shifting toward unit and end-to-end testing.

**Priority areas:**
- Comprehensive API endpoint testing.  
- Simulating edge cases and handling all possible errors gracefully.  
- Ensuring robust exception handling to minimize production failures.  
