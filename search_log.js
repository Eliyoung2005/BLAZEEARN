const fs = require('fs');
const lines = fs.readFileSync('C:/Users/PC/.gemini/antigravity/brain/2210ac77-b2bd-401c-af38-4e31a71b6643/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');
for (let l of lines) {
    if (l.includes('id="staff-board"')) {
        console.log('FOUND');
        fs.writeFileSync('c:/Users/PC/Desktop/BlazeEarn/found_staff_board.txt', l);
        break;
    }
}
