# Media Skills Installation - Pending

## Status: ⏳ Rate Limited

ClawHub has aggressive rate limits. Will retry later.

---

## Skills to Install (Priority Order)

### When Rate Limits Reset:

**Priority 1 (Images + Audio):**
```bash
# For images
clawhub install vision-sandbox --force

# For audio
clawhub install azure-ai-transcription-py --force
```

**Priority 2 (OCR + Fast Transcription):**
```bash
# OCR (extract text from images)
clawhub install tesseract-ocr --force

# Fast local transcription
clawhub install faster-whisper-transcribe --force
```

**Priority 3 (Optional):**
```bash
clawhub install computer-vision-expert --force
clawhub install openai-whisper-api --force
```

---

## Retry Schedule

| Time (UTC) | Action | Notes |
|------------|--------|-------|
| **2026-02-25 05:00** | Try vision-sandbox | First priority |
| **2026-02-25 05:15** | Try azure-ai-transcription-py | If first succeeds |
| **2026-02-25 05:30** | Try tesseract-ocr | If second succeeds |
| **2026-02-25 05:45** | Try faster-whisper-transcribe | If third succeeds |

---

## Current Workarounds

### For Images:
- Ask user to describe image
- Use external APIs (OpenAI Vision, Google Vision)
- Extract basic info with file tools

### For Audio:
- Ask user to type message
- Use external APIs (OpenAI Whisper, Google Speech)
- Get basic audio info with ffprobe/ffmpeg

---

## External API Alternatives

### If Skills Keep Failing:

**For Images:**
```bash
# OpenAI Vision API
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{"model":"gpt-4-vision-preview","messages":[...]}'
```

**For Audio:**
```bash
# OpenAI Whisper API
curl https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F file="@audio.ogg" -F model="whisper-1"
```

---

## Custom Skills Created

**media-processing** - `/home/xiang/.openclaw/workspace/skills/media-processing/SKILL.md`
- Installation instructions
- Workarounds
- Tool recommendations
- Troubleshooting guide

---

## Notes

- ClawHub rate limits are very aggressive
- May need to wait hours between installs
- External APIs might be faster solution
- System tools (ffmpeg, tesseract) could be installed separately

---

**Last Attempt:** 2026-02-25 04:40 UTC  
**Status:** Rate limit exceeded  
**Next Attempt:** 2026-02-25 05:00 UTC
