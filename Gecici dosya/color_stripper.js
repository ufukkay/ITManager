const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            filelist = walkSync(filepath, filelist);
        } else {
            if (filepath.endsWith('.vue')) {
                filelist.push(filepath);
            }
        }
    });
    return filelist;
};

const files = walkSync('C:\\Users\\ufuk.kaya\\Desktop\\Projeler\\ITManager\\frontend\\src\\views');

const colorsToStrip = ['purple', 'indigo', 'teal', 'pink', 'cyan', 'fuchsia', 'orange', 'emerald', 'amber', 'rose'];
// Wait, user said "there are too many colors". Let's convert them to blue/gray.
// The aesthetic of Google is mostly Gray (neutral) and Blue (primary). 
// I will keep Red, Green, Yellow in specific HR Request statuses but let's see.
// The grep showed pink, cyan, blue etc. Used in SettingsView.
// Let's replace purely decorative colors with 'gray'.

const purelyDecorative = ['purple', 'indigo', 'teal', 'pink', 'cyan', 'fuchsia', 'orange'];

let count = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    purelyDecorative.forEach(c => {
        content = content.replace(new RegExp(`bg-${c}-([0-9]+)`, 'g'), 'bg-gray-$1');
        content = content.replace(new RegExp(`text-${c}-([0-9]+)`, 'g'), 'text-gray-$1');
        content = content.replace(new RegExp(`border-${c}-([0-9]+)`, 'g'), 'border-gray-$1');
        content = content.replace(new RegExp(`from-${c}-([0-9]+)`, 'g'), 'from-gray-$1');
        content = content.replace(new RegExp(`to-${c}-([0-9]+)`, 'g'), 'to-gray-$1');
        content = content.replace(new RegExp(`ring-${c}-([0-9]+)`, 'g'), 'ring-gray-$1');
    });
    
    // Convert old gradient from-gray-x to-gray-y -> just bg-gray-50
    content = content.replace(/bg-gradient-to-br from-gray-[0-9]+ to-gray-[0-9]+/g, 'bg-gray-50');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        count++;
    }
});

console.log('Rainbow stripper script completed. Processed ' + count + ' files.');
