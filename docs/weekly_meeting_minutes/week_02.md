# Minutes of Meeting – Week 2  
**Date:** June 11, 2025  
**Attendees:** Project Team + Microsoft Mentors  

---

## Azure Subscription  

- **Status:** Azure subscription access is still pending.  
- **Current Workaround:** Development is ongoing using Azure AI Translator via the free-tier Foundry access.  
- **Limitations:**  
  - The Free tier enforces a ~50,000 characters/request cap.  
  - Excessive requests result in `429 Too Many Requests` errors.  
- **Action:** Limit subtitle file sizes and translation batches during testing.  

---

## Goal Progress Updates  

### Static Subtitle Translation  
**Progress:**  
- Functional backend endpoints for uploading `.srt` / `.vtt` files.  
- Azure Translator integration is in progress.  
- Files can be downloaded post-translation.  

**Next Steps:**  
- Improve translation pipeline and file handling logic.  
- Enhance frontend UI for upload and download.  
- Handle rate-limiting gracefully.  

### Subtitle Archive & Library  
**Status:** Currently in the planning phase.  

**Vision:**  
- Build a searchable, user-centric archive for subtitle files, similar to DockerHub or Git-based registries.  

**Considerations:**  
- Metadata tagging (language, genre, title)  
- Version control and sharing options  
- Public/private access configuration  

**Next Steps:**  
- Begin UI prototyping.  
- Design backend schema for indexing.  
- Define user access control for archives.  

---

## Security & Privacy  

### External Security  
- User authentication (e.g., email, social login) is required for library access.  
- Define user roles as features evolve.  

### Internal Security  
- Sanitize all inputs (subtitle files, form entries).  
- Validate MIME types and file extensions.  
- Enforce API request limits and size constraints.  

---

## Archive Feature Discussion  

**User Action:**  
- Users should be able to archive both original and translated files.  
- Subtitle files may be linked to user profiles for later reuse.  

**Next Steps:**  
- Draft user stories and UI mock-ups for the archive and sharing interface.  

---

## Profanity Filter  

**Discussion:**  
- Should we include a profanity filter in translated output?  

**Use Case:**  
- Essential for education/public sector content where offensive language must be filtered.  

**Next Steps:**  
- Research LLM-based or rule-based filtering solutions.  
- Determine if filtering should occur before or after translation.  

---

## Action Items  

- Use small files to avoid hitting Azure free-tier rate limits.  
- Prototype real-time translation interface (Goal 1).  
- Draft UI mock-ups and user stories for the archive feature (Goal 2).  
- Explore profanity filtering solutions.  
- Implement input sanitization and backend validation mechanisms.  
