**Minutes of Meeting – Daily Internal Call**  
**Date:** August 12, 2025  
**Project:** Subtitle Translator App  
**Attendees:** Project Team  
**Note:** Yadnesh Sirdeshmukh and Shivam Sapru could not join due to some work.  

| Name | Tasks Done | Tasks To Do |
|---|---|---|
| Samudra Pratim Borkakoti | - Investigated "Project not found" error when viewing older translation files.<br>- Prepared Chrome Extension zip file for publishing.<br>- Removed hardcoded localhost references. | - Finalize and publish Chrome Extension.<br>- Continue debugging translation file retrieval issue. |
| Pratham Sharma | - Worked on transcription issues: unable to load video in preview.<br>- Identified missing index number in WebVTT output.<br>- Reviewed transcription logic in transcription.py.<br>- Began adding dynamic Chrome Extension URL via environment variable. | - Adjust video load logic starting with default method.<br>- Fix WebVTT output to include index numbers.<br>- Finalize dynamic Chrome Extension URL import in config. |
| Shivam Sapru | - Worked on to debug static translation issue where source and target languages were not being detected correctly. | - Ensure consistent variable usage for source language fields.<br>- Test changes after fixes are applied. |
| Yadnesh Sirdeshmukh | - Removed hardcoded localhost references.<br>- worked on the Blob Storage  with all transcription files in the same container.<br>- worked on using separate container names via env variables. | - Push latest code.<br>- Update transcription logic to use separate containers for different file types.<br>- Ensure 48-hour auto-deletion is correctly applied. |
| Shubham Limkar | - Updated container rules<br>- Investigated Chrome Extension language persistence across tabs.<br>- Suggested adding troubleshooting steps for incorrect target language display.<br>- Planned renaming Chrome Extension zip file format. | - Monitor extension behavior for tab switching.<br>- Update Blob Storage file and Chrome Extension download URL.<br>- Complete FFL certification for domain. |
| Rishabh Lingsugur | - Completed and posted MoMs.<br>- Started final project report.<br>- Resolved some web app errors. | - Continue working on final project report.<br>- Test web app if any error occurs. |














