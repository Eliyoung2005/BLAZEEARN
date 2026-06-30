const fs = require('fs');
const indexStr = fs.readFileSync('BlazeEarn/public/index.html', 'utf8');
const chunkStr = fs.readFileSync('missing_chunk.html', 'utf8');

// The exact string where the deletion happened
const targetStr = "      <div class=\"modal-full\"><label>Data Phone</label><input type=\"text\" class=\"input\" id=\"edit-dp\" /></div>\r\n      \r\n  setEl('st-used',coupons.filter(function(c){return c.isUsed && !c.isDeleted;}).length);";
const targetStr2 = "      <div class=\"modal-full\"><label>Data Phone</label><input type=\"text\" class=\"input\" id=\"edit-dp\" /></div>\n      \n  setEl('st-used',coupons.filter(function(c){return c.isUsed && !c.isDeleted;}).length);";

let replacementStr = "      <div class=\"modal-full\"><label>Data Phone</label><input type=\"text\" class=\"input\" id=\"edit-dp\" /></div>\n      \n" + chunkStr + "\n  setEl('st-used',coupons.filter(function(c){return c.isUsed && !c.isDeleted;}).length);";

let newIndexStr = indexStr.replace(targetStr, replacementStr);
if (newIndexStr === indexStr) {
    newIndexStr = indexStr.replace(targetStr2, replacementStr);
}

// Another fallback using regex if whitespace varies
if (newIndexStr === indexStr) {
    const regex = /<div class="modal-full"><label>Data Phone<\/label><input type="text" class="input" id="edit-dp" \/><\/div>[\s\S]*?setEl\('st-used'/;
    newIndexStr = indexStr.replace(regex, `<div class="modal-full"><label>Data Phone</label><input type="text" class="input" id="edit-dp" /></div>\n      \n` + chunkStr + `\n  setEl('st-used'`);
}

fs.writeFileSync('BlazeEarn/public/index.html', newIndexStr);
console.log('Patched! Previous length:', indexStr.length, 'New length:', newIndexStr.length);
