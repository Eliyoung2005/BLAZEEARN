const fs = require('fs');
const transcript = fs.readFileSync('C:/Users/PC/.gemini/antigravity/brain/d26a4650-70ed-46a6-9047-175cba1ffdfd/.system_generated/logs/transcript.jsonl', 'utf8');
const lines = transcript.split('\n');

let indexContents = [];

for (const line of lines) {
    if (!line) continue;
    try {
        const obj = JSON.parse(line);
        if (obj.content && obj.content.includes('<USER_REQUEST>') && obj.content.includes('index.html">')) {
            const m = obj.content.match(/<file_content path="[^"]+index\.html">([\s\S]*?)<\/file_content>/);
            if (m) {
                indexContents.push(m[1]);
            }
        }
    } catch(e){}
}

console.log("Found " + indexContents.length + " copies of index.html in transcript.");
for (let i = 0; i < indexContents.length; i++) {
    console.log("Copy " + i + " length: " + indexContents[i].length);
    fs.writeFileSync('index_history_' + i + '.html', indexContents[i]);
}
