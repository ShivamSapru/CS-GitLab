# Minutes of Meeting – Week 4  
**Date:** June 25, 2025  
**Attendees:** Project Team + Microsoft Mentors  

---

### Cloud Services & API Integration
- Azure Translator and Blob Storage fully integrated.  
- Azure Speech integration is in progress (batch processing causes delays).  
- Fixing issues with transcription.  

---

### Database & DevOps
- PostgreSQL integration completed with project metadata and user info.  
- Dockerization finalized; pending coordination to merge to dev branch.  
- Blob storage dispatch flow tested.  

---

### Evaluation Plan (Confirmed Metrics)
- **BLEU Score** – for translation accuracy.  
- **WER (Word Error Rate)** – for transcription precision.  
- **Latency Benchmarks** – for real-time translation performance.  
- Cross-browser testing done on Chrome, Firefox, and Edge.  

---

### Authentication & Security Enhancements
- OAuth login in place using email-password.  
- Future improvements planned:  
  - Two-Factor Authentication (2FA)  
  - Passkey support  
  - Email-based backup authentication  

---

### Known Limitations
- High latency for large files  
- File upload bandwidth bottleneck  
- OAuth extensions not yet implemented  
- Azure subscription access still pending  

---

### Action Items (Next Sprint Focus)
- Complete Subtitle Archive – UI and backend.  
- Finalize Audio/Video Transcription pipeline.  
- Implement advanced authentication options.  
