const fs = require('fs');
const transcript = fs.readFileSync('C:/Users/PC/.gemini/antigravity/brain/d26a4650-70ed-46a6-9047-175cba1ffdfd/.system_generated/logs/transcript.jsonl', 'utf8');
const lines = transcript.split('\n');

for (const line of lines) {
    if (!line) continue;
    try {
        const obj = JSON.parse(line);
        // Look for the metadata containing the open files
        if (obj.content && obj.content.includes('<USER_REQUEST>') && obj.content.includes('<open_files>')) {
            const m = obj.content.match(/<file_content path="[^"]+index\.html">([\s\S]*?)<\/file_content>/);
            if (m) {
                console.log("Found index.html in transcript, length:", m[1].length);
                fs.writeFileSync('index_from_transcript.html', m[1]);
                break;
            }
        }
    } catch(e){}
}
