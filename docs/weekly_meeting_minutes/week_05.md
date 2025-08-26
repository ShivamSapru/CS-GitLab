# Minutes of Meeting – Week 5  
**Date:** July 2, 2025  
**Attendees:** Project Team + Microsoft Mentors  


## Cloud Services & API Integration
- Azure Translator and Blob Storage successfully integrated for static subtitle functionality.  
- Batch transcription via Azure Speech Services is functioning; testing ongoing for accuracy with different audio sources.  
- Payload optimization and supported language constraints discussed (limit transcription to known 10 languages).  


## Database & DevOps
- PostgreSQL integrated with translation project metadata and user profile data.  
- Docker containerization complete and stable; successfully deployed using Azure Web App containers.  
- Block storage handles intermediate subtitle and transcription files.  


## Authentication & Security Enhancements
- Google OAuth login enabled for all users.  
- Two-Factor Authentication (2FA) implementation completed (Microsoft Authenticator-based OTP).  
- Discussion held on whether to mandate 2FA or make it optional — recommendation to enforce for all users for increased security and best practice compliance.  
- Profile section to include 2FA toggle and verification option.  


## Localisation Feature Feasibility
- Consideration of UI localisation for multilingual accessibility.  
- Plan to internationalize user-facing text for future non-English speaker support.  


## Azure Hosting and Web App Deployment
- Azure Web App (via container image) deployment initiated for public access.  
- Final web hosting to use Azure App Service or Azure Container Apps for demo and test coverage.  


## Evaluation Plan
- BLEU Score to measure subtitle translation quality.  
- WER (Word Error Rate) to assess audio-to-text transcription.  
- Real-time translation latency will be benchmarked using Azure metrics.  
- Cross-browser compatibility tested for Chrome; others pending.  


## Real-Time Translation Display
- Clarified user flow for Chrome Extension + real-time captioning.  
- UX approach for displaying translated captions during streaming (Zoom, YouTube, etc.).  


## Known Limitations
- Limited accuracy in multi-language detection during transcription.  
- Static file upload size and speech-to-text precision need further tuning.  
- Real-time translation not yet fully implemented in Azure API side.  
- Manifest configuration error previously fixed for Chrome extension.  


## Action Items
- Finalize project library page and user-based archiving.  
- Complete 2FA toggle logic in UI, make it enforceable.  
- Finalize real-time translation display logic and back-end flow.  
- Enhance Chrome Extension integration with Azure Translation APIs.  
- Progress on localisation architecture for user interface elements.  
- Progress on Chrome Extension in development captures captions and allows translation.  
