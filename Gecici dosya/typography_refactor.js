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

const files = walkSync('C:\\Users\\ufuk.kaya\\Desktop\\Projeler\\ITManager\\frontend\\src');

let count = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalText = content;
    
    // Replace extreme font weights
    content = content.replace(/font-black/g, 'font-bold');
    
    // Replace extreme tight tracking
    content = content.replace(/tracking-tighter/g, '');
    content = content.replace(/tracking-tight/g, 'tracking-normal');
    
    // Replace ultra tiny text sizes (9px, 10px, 11px) -> 12px or text-xs
    content = content.replace(/text-\[9px\]/g, 'text-[12px]');
    content = content.replace(/text-\[10px\]/g, 'text-[12px]');
    content = content.replace(/text-\[11px\]/g, 'text-[13px]');
    
    // Normalize excessive uppercase letter spacings
    content = content.replace(/tracking-widest/g, 'tracking-wide');
    
    // Reduce some heading sizes that might be too marketing-focused (text-4xl -> text-2xl/3xl)
    // Actually, Google uses large headers but let's stick to standard Tailwind sizes.
    // Let's just fix the font-weights and tiny text.
    
    if (content !== originalText) {
        fs.writeFileSync(file, content, 'utf8');
        count++;
    }
});

console.log('Typography script completed. Processed ' + count + ' files.');
