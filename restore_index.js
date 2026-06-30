const fs = require('fs');

const transcriptPath = 'C:/Users/PC/.gemini/antigravity/brain/187816d7-6eff-4bd4-9688-0fcbcfcbeb31/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

let indexHtmlContent = [];
for (let i = 0; i <= 2500; i++) indexHtmlContent[i] = null;

let capture = false;
for (const line of lines) {
    if (!line) continue;
    try {
        const obj = JSON.parse(line);
        if (obj.type === 'TOOL_CALL_RESPONSE' && obj.tool_calls) {
            for (const call of obj.tool_calls) {
                if (call.tool_name === 'default_api:view_file' && call.response && call.response.output) {
                    if (call.response.output.includes('BlazeEarn/public/index.html')) {
                        const outLines = call.response.output.split('\n');
                        for (const outLine of outLines) {
                            const match = outLine.match(/^(\d+):\s(.*)$/);
                            if (match) {
                                const lineNum = parseInt(match[1]);
                                indexHtmlContent[lineNum] = match[2];
                            }
                        }
                    }
                }
            }
        }
    } catch(e) {}
}

const finalLines = [];
let maxLine = 0;
for (let i = 1; i <= 2500; i++) {
    if (indexHtmlContent[i] !== null) {
        maxLine = i;
    }
}

for (let i = 1; i <= maxLine; i++) {
    if (indexHtmlContent[i] !== null) {
        finalLines.push(indexHtmlContent[i]);
    } else {
        // If missing line, but we know it should exist, that's bad.
        // But since we viewed from 1200-2361, we should have them all.
        // What about lines 1-1200? The current index.html has them.
    }
}

// Read current index.html for lines 1-1218
const currentIndex = fs.readFileSync('c:/Users/PC/Desktop/BlazeEarn/BlazeEarn/public/index.html', 'utf8').split('\n');

let restored = [];
for (let i = 0; i < 1218; i++) {
    restored.push(currentIndex[i]);
}
for (let i = 1219; i <= maxLine; i++) {
    if (indexHtmlContent[i] !== null) restored.push(indexHtmlContent[i]);
}

fs.writeFileSync('c:/Users/PC/Desktop/BlazeEarn/BlazeEarn/public/index_restored.html', restored.join('\n'));
console.log('Restored up to line ' + maxLine);
