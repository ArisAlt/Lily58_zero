const fs = require('fs');

async function test() {
    let response = await fetch('https://raw.githubusercontent.com/qmk/qmk_firmware/master/keyboards/lily58/keymaps/default/keymap.c');
    let text = await response.text();

    // Remove comments first
    text = text.replace(/\/\*[\s\S]*?\*\//g, '');
    text = text.replace(/\/\/.*$/gm, '');

    let startIndex = text.indexOf('LAYOUT');
    if (startIndex === -1) return console.log("No LAYOUT found");

    let openParenIndex = text.indexOf('(', startIndex);
    let depth = 0;
    let block = "";
    
    for (let i = openParenIndex; i < text.length; i++) {
        let char = text[i];
        block += char;
        if (char === '(') depth++;
        if (char === ')') {
            depth--;
            if (depth === 0) break;
        }
    }

    // Remove outer parens
    block = block.slice(1, -1);

    let keys = [];
    let current = "";
    depth = 0;
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
}
test();
