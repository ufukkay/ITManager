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

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Corners
    content = content.replace(/rounded-\[40px\]/g, 'rounded-lg');
    content = content.replace(/rounded-\[32px\]/g, 'rounded-md');
    content = content.replace(/rounded-3xl/g, 'rounded-md');
    content = content.replace(/rounded-2xl/g, 'rounded');
    content = content.replace(/rounded-xl/g, 'rounded');
    
    // Shadows
    content = content.replace(/shadow-2xl/g, 'shadow-md');
    content = content.replace(/shadow-xl/g, 'shadow-sm');
    content = content.replace(/shadow-lg/g, 'shadow-sm');
    
    // Deep vibrant shadows
    content = content.replace(/shadow-[a-z]+-[0-9]+\/[0-9]+/g, ''); 
    content = content.replace(/hover:shadow-[a-z]+-[0-9]+\/[0-9]+/g, 'hover:shadow-md');
    
    // Solidify overly vibrant colored rings
    content = content.replace(/ring-[a-z]+-[0-9]+\/[0-9]+/g, ''); 
    
    fs.writeFileSync(file, content, 'utf8');
});

console.log('Script completed. Processed ' + files.length + ' files.');
