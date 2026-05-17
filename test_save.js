let currentJSON = {
  "matrix_pins": {
    "rows": ["A", "B"],
    "cols": ["C", "D"]
  }
};
let exportJSON = JSON.parse(JSON.stringify(currentJSON));
let profilePeriph = { sda: "P1", scl: "P2", enc_a: "P3", enc_b: "P4", enc2_a: "P5", enc2_b: "P6" };
let assignedEncoders = [{}, {}];

if (profilePeriph) {
    if (!exportJSON.i2c) {
        exportJSON.i2c = { pin_sda: profilePeriph.sda, pin_scl: profilePeriph.scl };
    }
    if (assignedEncoders.length > 0) {
        let rotaryArr = [];
        if (assignedEncoders.length > 0) {
            rotaryArr.push({ pin_a: profilePeriph.enc_a, pin_b: profilePeriph.enc_b });
        }
        if (assignedEncoders.length > 1) {
            rotaryArr.push({ pin_a: profilePeriph.enc2_a, pin_b: profilePeriph.enc2_b });
        }
        if (!exportJSON.encoder) exportJSON.encoder = {};
        exportJSON.encoder.rotary = rotaryArr;
    }
}
console.log(JSON.stringify(exportJSON, null, 2));
