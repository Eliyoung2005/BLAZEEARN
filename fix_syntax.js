const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

const brokenCode = `    } catch(err) {
      showToast('Failed to update popup', '#FF3B3B');
    }
  }
, true);
        showToast('Popup message updated!', '#00FF88');
    } catch (err) {
        showToast(err.message || 'Update failed', '#FF3B3B');
    }
}`;

const fixedCode = `    } catch(err) {
      showToast('Failed to update popup', '#FF3B3B');
    }
  }`;

content = content.replace(brokenCode, fixedCode);

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Syntax error fixed.");
