---
name: media-processing
description: Image and audio processing capabilities for OpenClaw. Use when you need to analyze images, transcribe audio, extract text from images (OCR), or process media files.
---

# Media Processing Skill

## Current Status

**❌ Limited Capabilities:**
- No built-in image analysis
- No audio transcription
- No OCR (text extraction)

**✅ What You Can Do:**
- Receive images/audio via message tool
- Process media files if you install the right tools
- Use external APIs if available

---

## Installation Guide

### Option 1: Install ClawHub Skills (Recommended)

```bash
# For images
clawhub install vision-sandbox --force
clawhub install tesseract-ocr --force

# For audio
clawhub install azure-ai-transcription-py --force
clawhub install faster-whisper-transcribe --force
```

### Option 2: Install System Tools

**For Images:**
```bash
# ImageMagick (image manipulation)
sudo apt-get install imagemagick

# Tesseract OCR (text extraction)
sudo apt-get install tesseract-ocr

# Python PIL (image processing)
pip3 install Pillow
```

**For Audio:**
```bash
# FFmpeg (audio conversion)
sudo apt-get install ffmpeg

# Whisper (transcription)
pip3 install openai-whisper

# SpeechRecognition
pip3 install SpeechRecognition
```

---

## Image Processing

### What You Can Do (After Installing Tools):

**1. Analyze Image Content**
```bash
# Using ImageMagick
identify image.jpg

# Get dimensions, format, etc.
convert image.jpg -print "%w x %h\n" /dev/null
```

**2. Extract Text (OCR)**
```bash
# Using Tesseract
tesseract image.jpg output

# Read the extracted text
cat output.txt
```

**3. Basic Image Info**
```python
from PIL import Image
img = Image.open('image.jpg')
print(f"Size: {img.size}")
print(f"Format: {img.format}")
print(f"Mode: {img.mode}")
```

### Use Cases:
- Extract text from screenshots
- Read documents/photos
- Identify image contents
- Get metadata from images

---

## Audio Processing

### What You Can Do (After Installing Tools):

**1. Convert Audio Formats**
```bash
# Convert to WAV (better for processing)
ffmpeg -i audio.ogg audio.wav

# Get audio info
ffmpeg -i audio.ogg 2>&1 | grep Duration
```

**2. Transcribe Speech**
```python
import whisper

# Load model (first time takes time)
model = whisper.load_model("base")

# Transcribe
result = model.transcribe("audio.ogg")
print(result["text"])
```

**3. Basic Audio Info**
```bash
# Get duration, format, etc.
ffprobe audio.ogg
```

### Use Cases:
- Transcribe voice messages
- Convert audio formats
- Extract metadata
- Process podcasts/videos

---

## Quick Workarounds (Without Installing Tools)

### For Images:
1. **Ask user to describe** the image
2. **Use external APIs** (if you have API keys):
   - OpenAI Vision API
   - Google Cloud Vision
   - Azure Computer Vision

### For Audio:
1. **Ask user to type** what they said
2. **Use external APIs**:
   - OpenAI Whisper API
   - Google Speech-to-Text
   - Azure Speech Services

---

## External API Options

### For Images:

**OpenAI Vision (GPT-4V):**
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4-vision-preview",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "What is in this image?"},
        {"type": "image_url", "image_url": {"url": "file://image.jpg"}}
      ]
    }]
  }'
```

### For Audio:

**OpenAI Whisper API:**
```bash
curl https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F file="@audio.ogg" \
  -F model="whisper-1"
```

---

## Current Recommendations

### Immediate (No Installation):
1. **Ask user to describe** images/audio
2. **Use external APIs** if you have keys
3. **Wait for ClawHub** rate limit to reset

### Short-term (Install Tools):
1. **vision-sandbox** (image analysis)
2. **azure-ai-transcription-py** (audio transcription)
3. **tesseract-ocr** (text extraction)

### Long-term (Full Setup):
1. Install all recommended skills
2. Set up API keys for cloud services
3. Configure local processing tools

---

## File Paths

When you receive media:
- **Images:** `/home/xiang/.openclaw/media/inbound/`
- **Audio:** `/home/xiang/.openclaw/media/inbound/`

Example:
```
/home/xiang/.openclaw/media/inbound/file_10---8e43f44a-3f08-4bd1-acd5-75ed1c0e4c4a.ogg
```

---

## Troubleshooting

### "I can't read this image"
- Install vision-sandbox or tesseract-ocr
- Or ask user to describe it
- Or use external API

### "I can't transcribe this audio"
- Install azure-ai-transcription-py or faster-whisper-transcribe
- Or ask user to type the message
- Or use external API

### "Rate limit exceeded"
- Wait 2-5 minutes between installs
- Use `--force` flag
- Try one skill at a time

---

## Next Steps

1. **Wait for ClawHub** rate limit to reset (2-5 minutes)
2. **Install priority skills:**
   - vision-sandbox (images)
   - azure-ai-transcription-py (audio)
3. **Test with real media files**
4. **Consider API keys** for cloud services

---

**Remember:** You can always ask users to describe images or type voice messages while we set up the tools!
