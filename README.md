# YouTube Transcript Fetcher

A simple tool to fetch YouTube video information and transcripts.

## Quick Start

1. Install dependencies:
```bash
npm install
pip install yt-dlp
```

2. Build and run:
```bash
npm run build
node dist/index.js "https://www.youtube.com/watch?v=VIDEO_ID"
```

Example:
```bash
node dist/index.js "https://www.youtube.com/watch?v=pzggl8C2fvs"
```

The script will display video information and transcript (if available).

## Features

- Fetches video metadata (title, channel, duration, upload date)
- Retrieves video transcripts/captions
- Cleans and formats transcripts with timestamps
- Handles both auto-generated and manual captions
- Removes duplicate text and merges overlapping segments

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- yt-dlp installed on your system

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd <repo-name>
```

2. Install dependencies:
```bash
npm install
```

3. Make sure yt-dlp is installed on your system:
```bash
# On Windows (using pip)
pip install yt-dlp

# On macOS/Linux
brew install yt-dlp
```

## Usage

1. Build the TypeScript code:
```bash
npm run build
```

2. Run the script with a YouTube URL:
```bash
node dist/index.js "https://www.youtube.com/watch?v=VIDEO_ID"
```

Example output:
```
📺 YouTube Video Information 📺
==========================================
Title: Video Title
==========================================
Channel: Channel Name
Duration: 10:30
Published: 2024-03-20
==========================================

Transcript:
[00:00:00] First line of transcript
[00:00:05] Second line of transcript
...
```

## How It Works

1. The script uses yt-dlp to fetch video information and captions
2. Captions are downloaded in VTT format
3. The transcript is processed to:
   - Remove metadata and formatting
   - Merge overlapping segments
   - Remove duplicate text
   - Format timestamps
4. The final output includes both video information and the cleaned transcript

## Error Handling

- If a video has no captions, "Transcript not available" will be displayed
- If there's an error fetching the video info, an error message will be shown
- The script handles various edge cases like missing captions or malformed data

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License 