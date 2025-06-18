# Minutes of Meeting – Week 3  
**Date:** June 18, 2025  
**Attendees:** Project Team + Microsoft Mentors  

---

## Azure Subscription  
**Status:**  
Azure subscription credentials are expected to be shared with the team soon.  
Until then, development continues using the free-tier API (Azure Translator, etc.).  
**Next Steps:**  
- Enable full access to Azure Blob Storage, Translator, and Speech Services upon credential arrival.  
- Use small files to avoid rate limits (e.g., ~50,000 characters/request cap).  

---

## Database Selection  
**Decision:**  
PostgreSQL confirmed as the backend database due to support for JSON fields, relational integrity, and Docker/FastAPI compatibility.  
**Action Items:**  
- Proceed with schema refinement and backend integration.  
- Complete connection between backend APIs and PostgreSQL for metadata storage.  

---

## File Storage Strategy  
**Recommendation:**  
Use Azure Blob Storage for storing large media (subtitle and video) files.  
Only metadata (filename, language, timestamps, owner, etc.) will be saved in PostgreSQL.  
**Next Steps:**  
- Configure Blob Storage containers (`/videos`, `/subtitles`) in Azure.  
- Design endpoints to handle secure upload/download workflows.  

---

## Static Subtitle Translation Progress  
**Updates:**  
- Functional backend endpoints now handle `.srt` and `.vtt` formats.  
- Azure Translator API is integrated with auto language detection and profanity filtering.  
- Dynamic language list fetched via API (no hardcoded dropdowns).  

**Frontend Enhancements:**  
- UI supports multi-language selection and profanity toggle.  
- Responsive layout fixed for mobile view.  
- Logging mechanisms created for testing and debugging language handling.  

**Next Steps:**  
- Finalize frontend and backend serialization/deserialization pipelines.  
- Enable editable preview before download.  
- Continue testing backend health, API logging, and edge-case translations.  

---

## Editable Subtitle Preview  
**Proposal:**  
Translated subtitles should be shown in a live-editable preview before downloading.  
Allows users to manually correct or refine output.  

**Implementation Plan:**  
- Design UI for timestamped text editing.  
- Allow real-time edits to regenerate `.srt` or `.vtt` files for download.  

---

## Authentication Enhancements  
**Progress:**  
- Basic user login/registration (email-password) functional.  
- OAuth-based login flow restarted from scratch due to earlier implementation issues.  

**Concerns:**  
- Traditional username/password flows pose security risks.  

**Recommendations:**  
- Add secure login options:  
  - Google, Microsoft OAuth  
  - Two-Factor Authentication (2FA)  

**Action Items:**  
- Integrate OAuth securely using external providers.  
- Ensure session tokens and roles are managed correctly.  

---

## API Key Security  
**Warning:**  
API keys (e.g., for Azure Translator, Blob Storage) must not be hardcoded in frontend or exposed via browser dev tools.  

**Action Items:**  
- Store all sensitive keys in backend `.env` files.  
- Use secure backend-only routes for API interactions.  
- Consider scoped access tokens for client-side interactions.  

---

## Real-Time Translation Planning  
**Kickoff:**  
Initial discussion on real-time subtitle translation via WebSocket streaming.  

**Ideas Shared:**  
- Translate YouTube/live video captions in real time using browser extension or transcription API.  
- Use Azure Media Services or Speech-to-Text for live caption extraction.  

**Next Steps:**  
- Design basic architecture for real-time input-output flow.  
- Explore streaming via WebSocket and partial translations.  

---

## Video Size & Transcription Optimization  
**Tip:**  
Azure Speech Services may slow down on high-resolution videos.  

**Recommendation:**  
Use FFmpeg to transcode large videos (compress/resize) before processing.  
