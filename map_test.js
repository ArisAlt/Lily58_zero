const qmkToZmk = {
    "KC_A": "&kp A", "KC_ENT": "&kp RET", "KC_ESC": "&kp ESC"
};
console.log(qmkToZmk["KC_A"] || "&trans");
