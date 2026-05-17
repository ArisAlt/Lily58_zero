let jsonStr = `{
  "matrix_pins": {
    "cols": ["GP4", "GP5"],
    "rows": ["GP6", "GP7"]
  }
}`;
jsonStr = jsonStr.replace(/\[\s*([^\{\}\[\]]+)\s*\]/g, (m, inner) => {
    return `[${inner.replace(/\s+/g, ' ')}]`;
});
console.log(jsonStr);
