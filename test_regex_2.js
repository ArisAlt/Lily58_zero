let jsonStr = `{
  "layouts": {
    "LAYOUT": {
      "layout": [
        { "matrix": [0, 1], "x": 0, "y": 0 },
        { "matrix": [0, 2], "x": 1, "y": 0 }
      ]
    }
  }
}`;

jsonStr = jsonStr.replace(/\[\s*([^\{\}\[\]]+)\s*\]/g, (m, inner) => {
    return `[${inner.replace(/\s+/g, ' ')}]`;
});

jsonStr = jsonStr.replace(/"layout": \[\s+([\s\S]*?)\s+\]/g, (match, layoutContent) => {
    let compacted = layoutContent.replace(/\{([\s\S]*?)\}/g, (m, inner) => {
        let cleanInner = inner.replace(/\n\s+/g, ' ').trim();
        return `{ ${cleanInner} }`;
    });
    return `"layout": [\n        ${compacted}\n      ]`;
});

console.log(jsonStr);
