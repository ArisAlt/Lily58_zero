const fs = require('fs');

async function test() {
    let response = await fetch('https://raw.githubusercontent.com/qmk/qmk_firmware/master/keyboards/lily58/keymaps/default/keymap.c');
    let text = await response.text();

    // Match the first LAYOUT macro block inside keymaps array
    let match = text.match(/\[\s*0\s*\]\s*=\s*LAYOUT[^\(]*\(([\s\S]*?)\)/);
    if (!match) {
        // Try without [0]
        match = text.match(/LAYOUT[^\(]*\(([\s\S]*?)\)/);
    }
    
    if (match) {
        let block = match[1];
        // Strip block comments
        block = block.replace(/\/\*[\s\S]*?\*\//g, '');
        // Strip line comments
        block = block.replace(/\/\/.*$/gm, '');
        // Split by commas, and trim
        let keys = block.split(',').map(k => k.trim()).filter(k => k.length > 0);
        console.log("Parsed Keys:", keys.length);
        console.log(keys.slice(0, 10));
    }
}
test();
