const fs = require('fs');
const transcript = fs.readFileSync('C:/Users/PC/.gemini/antigravity/brain/d26a4650-70ed-46a6-9047-175cba1ffdfd/.system_generated/logs/transcript.jsonl', 'utf8');
const lines = transcript.split('\n');

for (const line of lines) {
    if (!line) continue;
    try {
        const obj = JSON.parse(line);
        if (obj.type === 'RUN_COMMAND' && obj.content && obj.content.includes('Blaze Earn | Ultimate Rewards')) {
            console.log("Found run_command with Ultimate Rewards, length:", obj.content.length);
        }
        if (obj.type === 'VIEW_FILE' && obj.content && obj.content.includes('Blaze Earn | Ultimate Rewards')) {
            console.log("Found view_file with Ultimate Rewards, length:", obj.content.length);
        }
    } catch(e){}
}
