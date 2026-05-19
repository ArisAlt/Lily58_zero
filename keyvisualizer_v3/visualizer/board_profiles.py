"""
Board profiles: MCU GPIO pools.
Mirrors boardProfiles in KeyVisualizer_v2.js exactly.
"""

BOARD_PROFILES = {
    "rp2040_zero": {
        "label": "Waveshare RP2040 Zero",
        "rows": ["GP0","GP1","GP2","GP3","GP4","GP5","GP6"],
        "cols": ["GP21","GP20","GP19","GP18","GP17","GP16","GP15","GP14","GP13","GP12"],
        "pins": ["GP0","GP1","GP2","GP3","GP4","GP5","GP6","GP7","GP8","GP9",
                 "GP10","GP11","GP12","GP13","GP14","GP15","GP16","GP17","GP18",
                 "GP19","GP20","GP21","GP26","GP27","GP28","GP29"],
        "mcu": "RP2040", "bootloader": "rp2040",
    },
    "rp2040_tiny": {
        "label": "Waveshare RP2040 Tiny",
        "rows": ["GP0","GP1","GP2","GP3","GP4","GP5","GP6"],
        "cols": ["GP10","GP9","GP8","GP7","GP6","GP5","GP4","GP3","GP2","GP1"],
        "pins": ["GP0","GP1","GP2","GP3","GP4","GP5","GP6","GP7","GP8","GP9",
                 "GP10","GP11","GP12","GP13","GP14","GP15","GP26","GP27","GP28","GP29"],
        "mcu": "RP2040", "bootloader": "rp2040",
    },
    "waveshare_2040_plus": {
        "label": "Waveshare RP2040 Plus",
        "rows": ["GP0","GP1","GP2","GP3","GP4","GP5","GP6","GP7","GP8","GP9"],
        "cols": ["GP10","GP11","GP12","GP13","GP14","GP15","GP16","GP17","GP18",
                 "GP19","GP20","GP21","GP22","GP26","GP27","GP28","GP29"],
        "pins": ["GP0","GP1","GP2","GP3","GP4","GP5","GP6","GP7","GP8","GP9",
                 "GP10","GP11","GP12","GP13","GP14","GP15","GP16","GP17","GP18",
                 "GP19","GP20","GP21","GP22","GP26","GP27","GP28","GP29"],
        "mcu": "RP2040", "bootloader": "rp2040",
    },
    "pro_micro": {
        "label": "Arduino Pro Micro (ATmega32U4)",
        "rows": ["D4","C6","D7","E6","B4","B5"],
        "cols": ["F4","F5","F6","F7","B1","B3","B2"],
        "pins": ["D4","C6","D7","E6","B4","B5","F4","F5","F6","F7","B1","B3","B2","D2","D3","B6","B7"],
        "mcu": "atmega32u4", "bootloader": "caterina",
    },
    "nice_nano": {
        "label": "nice!nano v2.0 (nRF52840)",
        "rows": ["P0.06","P0.08","P0.17","P0.20","P0.22","P0.24"],
        "cols": ["P0.31","P0.29","P0.02","P1.15","P1.13","P1.11","P0.10"],
        "pins": ["P0.06","P0.08","P0.17","P0.20","P0.22","P0.24","P0.31","P0.29",
                 "P0.02","P1.15","P1.13","P1.11","P0.10","P0.09","P1.00","P0.11",
                 "P1.02","P1.04","P1.06"],
        "mcu": "nRF52840", "bootloader": "nrfmicro_13",
    },
    "nrf52840_nicenano_clone": {
        "label": "SuperMini nRF52840 (nice!nano Clone)",
        "rows": ["P0.06","P0.08","P0.17","P0.20","P0.22","P0.24"],
        "cols": ["P0.31","P0.29","P0.02","P1.15","P1.13","P1.11","P0.10"],
        "pins": ["P0.06","P0.08","P0.17","P0.20","P0.22","P0.24","P0.31","P0.29",
                 "P0.02","P1.15","P1.13","P1.11","P0.10","P0.09","P1.00","P0.11",
                 "P1.02","P1.04","P1.06"],
        "mcu": "nRF52840", "bootloader": "nrfmicro_13",
    },
}
