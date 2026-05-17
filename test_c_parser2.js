const fs = require('fs');

async function test() {
    let response = await fetch('https://raw.githubusercontent.com/qmk/qmk_firmware/master/keyboards/lily58/keymaps/default/keymap.c');
    let text = await response.text();

    let match = text.match(/\[\s*0\s*\]\s*=\s*LAYOUT[^\(]*\(([\s\S]*?)\)/);
    if (!match) match = text.match(/LAYOUT[^\(]*\(([\s\S]*?)\)/);
    
    if (match) {
        let block = match[1];
        block = block.replace(/\/\*[\s\S]*?\*\//g, '');
        block = block.replace(/\/\/.*$/gm, '');
        
        let keys = [];
        let current = "";
        let depth = 0;
        for (let i = 0; i < block.length; i++) {
            let char = block[i];
            if (char === '(') depth++;
            if (char === ')') depth--;
            if (char === ',' && depth === 0) {
                keys.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }
        if (current.trim()) keys.push(current.trim());
        
        console.log("Parsed Keys:", keys.length);
        console.log(keys.filter(k => k.includes('(')));
    }
}
test();
