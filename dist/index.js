import youtubeDl from 'youtube-dl-exec';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
/**
 * Converts a YYYYMMDD date string to a localized date string
 * @param dateStr - Date string in YYYYMMDD format
 * @returns Formatted date string
 */
function parseUploadDate(dateStr) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
}
/**
 * Formats duration in seconds to a human-readable string
 * @param seconds - Total duration in seconds
 * @returns Formatted duration string (HH:MM:SS or MM:SS)
 */
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
/**
 * Cleans VTT transcript content by removing metadata and formatting
 * @param vttContent - Raw VTT file content
 * @returns Cleaned transcript text
 */
function cleanVttTranscript(vttContent) {
    const lines = vttContent.split('\n');
    const segments = [];
    let currentTime = '';
    let currentText = '';
    // First pass: collect all segments
    for (const line of lines) {
        const timeMatch = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) -->/);
        if (timeMatch) {
            if (currentTime && currentText) {
                const cleanText = currentText.replace(/<[^>]+>/g, '').trim();
                if (cleanText) {
                    segments.push({ time: currentTime, text: cleanText });
                }
                currentText = '';
            }
            currentTime = timeMatch[1].slice(0, 8);
            continue;
        }
        if (!line.trim() || line.startsWith('WEBVTT') || line.startsWith('NOTE') || line.match(/^\d+$/)) {
            continue;
        }
        if (currentTime && line.trim()) {
            currentText += ' ' + line.trim();
        }
    }
    // Add the last segment
    if (currentTime && currentText) {
        const cleanText = currentText.replace(/<[^>]+>/g, '').trim();
        if (cleanText) {
            segments.push({ time: currentTime, text: cleanText });
        }
    }
    // Second pass: merge overlapping segments
    const mergedSegments = [];
    let currentSegment = segments[0];
    for (let i = 1; i < segments.length; i++) {
        const nextSegment = segments[i];
        // If segments are close in time and have overlapping text
        if (areSegmentsOverlapping(currentSegment, nextSegment)) {
            // Merge the text, removing duplicates
            currentSegment.text = mergeTexts(currentSegment.text, nextSegment.text);
        }
        else {
            // Add current segment and start a new one
            mergedSegments.push(currentSegment);
            currentSegment = nextSegment;
        }
    }
    mergedSegments.push(currentSegment);
    // Format the final output
    return mergedSegments.map(seg => `[${seg.time}] ${seg.text}`).join('\n');
}
function areSegmentsOverlapping(seg1, seg2) {
    // Convert times to seconds
    const [h1, m1, s1] = seg1.time.split(':').map(Number);
    const [h2, m2, s2] = seg2.time.split(':').map(Number);
    const seconds1 = h1 * 3600 + m1 * 60 + s1;
    const seconds2 = h2 * 3600 + m2 * 60 + s2;
    // Check if segments are within 2 seconds
    if (Math.abs(seconds2 - seconds1) > 2) {
        return false;
    }
    // Check for text overlap
    const words1 = seg1.text.toLowerCase().split(/\s+/);
    const words2 = seg2.text.toLowerCase().split(/\s+/);
    // If either text is contained within the other
    if (seg1.text.toLowerCase().includes(seg2.text.toLowerCase()) ||
        seg2.text.toLowerCase().includes(seg1.text.toLowerCase())) {
        return true;
    }
    // Check for significant word overlap
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length >= Math.min(words1.length, words2.length) * 0.5;
}
function mergeTexts(text1, text2) {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    // If one text contains the other, return the longer one
    if (text1.toLowerCase().includes(text2.toLowerCase())) {
        return text1;
    }
    if (text2.toLowerCase().includes(text1.toLowerCase())) {
        return text2;
    }
    // Find the longest common subsequence
    const commonWords = findLongestCommonSubsequence(words1, words2);
    // If there's significant overlap, merge the texts
    if (commonWords.length >= Math.min(words1.length, words2.length) * 0.5) {
        // Use the text that starts earlier
        return text1;
    }
    // If no significant overlap, concatenate with a space
    return `${text1} ${text2}`;
}
function findLongestCommonSubsequence(words1, words2) {
    const matrix = Array(words1.length + 1)
        .fill(0)
        .map(() => Array(words2.length + 1).fill(0));
    // Fill the matrix
    for (let i = 1; i <= words1.length; i++) {
        for (let j = 1; j <= words2.length; j++) {
            if (words1[i - 1].toLowerCase() === words2[j - 1].toLowerCase()) {
                matrix[i][j] = matrix[i - 1][j - 1] + 1;
            }
            else {
                matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
            }
        }
    }
    // Reconstruct the sequence
    const result = [];
    let i = words1.length;
    let j = words2.length;
    while (i > 0 && j > 0) {
        if (words1[i - 1].toLowerCase() === words2[j - 1].toLowerCase()) {
            result.unshift(words1[i - 1]);
            i--;
            j--;
        }
        else if (matrix[i - 1][j] > matrix[i][j - 1]) {
            i--;
        }
        else {
            j--;
        }
    }
    return result;
}
/**
 * Fetches video information and transcript using yt-dlp
 * @param url - YouTube video URL
 * @returns Promise resolving to video information and transcript
 */
async function fetchVideoInfoAndTranscript(url) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-simple-'));
    try {
        // Get video info
        const info = await youtubeDl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
            skipDownload: true
        });
        // Download transcript (VTT)
        let transcript = null;
        try {
            await youtubeDl(url, {
                skipDownload: true,
                writeAutoSub: true,
                subLang: 'en',
                subFormat: 'vtt',
                output: path.join(tempDir, 'subtitle.%(ext)s')
            });
            const vttFile = fs.readdirSync(tempDir).find(f => f.endsWith('.vtt'));
            if (vttFile) {
                const vttContent = fs.readFileSync(path.join(tempDir, vttFile), 'utf-8');
                transcript = cleanVttTranscript(vttContent);
            }
        }
        catch {
            transcript = null;
        }
        return { info, transcript };
    }
    finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}
/**
 * Displays video information in a formatted way
 * @param info - Video information object
 * @param transcript - Video transcript or null if not available
 */
function displayVideoInfo(info, transcript) {
    console.log('\n📺 YouTube Video Information 📺');
    console.log(`Title: ${info.title}`);
    console.log(`Channel: ${info.uploader}`);
    console.log(`Duration: ${formatDuration(info.duration)}`);
    console.log(`Published: ${parseUploadDate(info.upload_date)}`);
    console.log('==========================================\n');
    if (transcript) {
        console.log('Transcript:');
        console.log(transcript);
        console.log('==========================================');
    }
    else {
        console.log('Transcript: Not available');
        console.log('==========================================');
    }
}
async function main() {
    const url = process.argv[2];
    if (!url) {
        console.error('Usage: node index.js <youtube-url>');
        process.exit(1);
    }
    try {
        const { info, transcript } = await fetchVideoInfoAndTranscript(url);
        console.log(`Title: ${info.title}`);
        console.log(`Channel: ${info.uploader}`);
        console.log(`Duration: ${formatDuration(info.duration)}`);
        console.log(`Published: ${parseUploadDate(info.upload_date)}`);
        console.log('\nTranscript:');
        console.log(transcript || 'Transcript not available');
    }
    catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}
main();
