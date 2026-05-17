const fs = require('fs');
let currentJSON = JSON.parse(fs.readFileSync('test_api.json')).keyboards["lily58/rev1"];
let exportJSON = JSON.parse(JSON.stringify(currentJSON));
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
console.log(jsonStr.indexOf("duplicate") !== -1 ? "FOUND DUPLICATE" : "NO DUPLICATE");
fs.writeFileSync('output_api.json', jsonStr);
