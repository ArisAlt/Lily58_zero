const fs = require('fs');
let currentJSON = JSON.parse(fs.readFileSync('keyboard.json'));
let exportJSON = JSON.parse(JSON.stringify(currentJSON));

let profilePeriph = { sda: "GP4", scl: "GP5", enc_a: "GP28", enc_b: "GP29" };
let assignedEncoders = [{}];

if (profilePeriph) {
    if (!exportJSON.i2c) {
        exportJSON.i2c = { pin_sda: profilePeriph.sda, pin_scl: profilePeriph.scl };
    }
    if (assignedEncoders.length > 0) {
        let rotaryArr = [];
        if (assignedEncoders.length > 0) {
            rotaryArr.push({ pin_a: profilePeriph.enc_a, pin_b: profilePeriph.enc_b });
        }
        if (!exportJSON.encoder) exportJSON.encoder = {};
        exportJSON.encoder.rotary = rotaryArr;
    }
}

let jsonStr = JSON.stringify(exportJSON, null, 2);
            // 1. Compact simple arrays (e.g., matrix columns/rows, or matrix [0,0])
            jsonStr = jsonStr.replace(/\[\s*([^\{\}\[\]]+)\s*\]/g, (m, inner) => {
                return `[${inner.replace(/\s+/g, ' ')}]`;
            });
            
            // 2. Compact individual objects inside the "layout" array
            jsonStr = jsonStr.replace(/"layout": \[\s+([\s\S]*?)\s+\]/g, (match, layoutContent) => {
                let compacted = layoutContent.replace(/\{([\s\S]*?)\}/g, (m, inner) => {
                    let cleanInner = inner.replace(/\n\s+/g, ' ').trim();
                    return `{ ${cleanInner} }`;
                });
                return `"layout": [\n        ${compacted}\n      ]`;
            });

console.log(jsonStr);
