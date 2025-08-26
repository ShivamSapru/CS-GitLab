# Minutes of Meeting – Week 6  
**Date:** July 9, 2025  
**Attendees:** Project Team + Microsoft Mentors  

## Project Objective Recap  
- Subtitle Translator App to support subtitle translation, transcription, and project archiving.  
- Focus on real-time translation, Chrome extension, Azure container deployment, and UI feature completion.  

## Cloud Services & API Integration  
- Azure Translator, Speech SDK, and Blob Storage fully integrated.  
- Transcription module (short audio/video) completed and backend tested.  
- Real-time transcription initiated; diarization and profanity filtering implemented.  
- Payload optimization and multi-language constraints discussed for performance.  

## Frontend Development & UX Enhancements  
- Profile Page completed with toggle for 2FA and “My Projects” view (public/private).  
- Library system UI finalized with project preview, public badge, and download support.  
- Frontend integration of transcription APIs in progress.  
- Notification added post-translation to confirm project save; option to opt out available.  

## Real-Time Translation Feature Planning  
- Initial work started on real-time caption and translation overlay.  
- UI placement for real-time subtitles under discussion.  
- Target use cases: Zoom/Teams meetings, streaming websites, direct mic/speaker input.  
- Planning to test Chrome Extension capturing and translation pipeline.  

## Containerization & Deployment  
- Dockerized application ready.  
- Containerization strategy approved by mentors:  
  - Azure App Service or Azure Container Apps are valid deployment choices.  
- Azure Web App deployment flow under testing.  
- Further work on Azure integration and CI/CD via container registry planned.  

## Authentication & Security  
- Google OAuth and Microsoft Authenticator-based 2FA live.  
- Profile UI allows users to toggle 2FA settings.  
- Focus on backend consistency and route security.  

## Subtitle Library & Project Save Flow  
- Users can preview/download only their own projects.  
- Translations grouped by series/episodes as “collections”.  
- Post-translation, users receive prompt to save to library (can skip if preferred).  

## Testing, Bug Fixes, and Documentation  
- MoMs updated regularly.  
- Test cases completed for:  
  - Chrome Extension  
  - Subtitle Library  
  - Authentication & 2FA  
  - Transcription module  
- In-progress:  
  - Real-time flow testing  
  - Container deployment validation  
  - User documentation updates  

## Action Items  
- Finalize real-time translation pipeline and UI overlay.  
- Continue frontend/backend integration of transcription module.  
- Test multithreading support in Azure Speech real-time SDK.  
- Deploy app using Azure Web App containers and test scalability.  

## Other Key Notes  
- **Microsoft Office Visit Scheduled** – Next Tuesday, team will meet mentors in person to demo progress and receive feedback.
