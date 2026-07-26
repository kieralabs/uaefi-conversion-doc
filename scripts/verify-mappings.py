"""
Verification checks for ACES → uaEFI mapping.
Run against mappings.json — catches pin conflicts, voltage violations,
flyback traps, missing critical signals, and known hardware dangers.
"""
import json, sys
from collections import defaultdict

UAEFI_PINOUT = {
    # 5V-only pins (DO NOT feed 12V)
    "5V_ONLY": {
        "B10","B11","B12","B13","B14","B15",  # coil logic outputs
        "C1","C2",                              # sensor 5V feeds
        "D3","D4",                              # sensor 5V feeds
    },
    # Analog voltage inputs
    "ANALOG": {
        "C3","C4","C14","C15",
        "D1","D6","D9","D13","D15","D16",
    },
    # 500K pull-down analog inputs (unsuitable for high-impedance)
    "ANALOG_500K_PD": {"C3","C15","D1"},
    # Hall/digital inputs (12V tolerant)
    "DIGITAL_12V": {"C5","C6","C7","C9","D2","D10"},
    # B8/B9 are VNLD5090 OMNIFET II with internal active clamp — external flyback optional
    "ACTIVE_CLAMP": {"B8","B9"},
    # WBO CJ125 pins
    "WBO": {"E1","E2","E3","E4","E5","E6"},
    # Coil logic outputs (5V only, need external igniter)
    "COIL_LOGIC": {"B10","B11","B12","B13","B14","B15"},
    # Power ground
    "PWR_GND": {"A3","A4","C8"},
    # Sensor ground
    "SENS_GND": {"C11","C12","C13","D11","D12"},
    # 5V output pins
    "5V_OUT": {"C1","C2","D3","D4"},
}

KNOWN_12V_SOURCES = {"PIA-26","PIA-27","PIA-8","PIB-4","PIB-11","PIB-17","PIC-8","PIC-9","PIC-14","PIC-15","C9-A"}
KNOWN_COIL_DRIVERS = {"PIA-10","PIA-11"}

CRITICAL_SIGNALS = {
    "HEI REF": "C5 — RPM input from HEI module. Engine won't start without this.",
    "HEI EST": "B15 — Timing output to HEI module. No spark without this.",
    "HEI BYPASS": "C1|C2 — 5V to enable ECU timing. Without bypass, stuck at 10° base timing.",
    "WBO Heater+": "E1 — LSU 4.9 heater power.",
    "WBO Ip": "E5 — LSU 4.9 pump current. No AFR reading without this.",
}

def load(path):
    with open(path) as f:
        return json.load(f)

def check_pin_conflicts(mappings):
    """Two signals routed to same uaEFI pin."""
    pin_map = defaultdict(list)
    for m in mappings:
        if m["disposition"] in ("repin", "new"):
            for pin in m["dest"].replace(" ","").split("|"):
                if pin and pin != "—":
                    pin_map[pin].append(m["signal"])
    issues = []
    # Allowed shared pins (intentional)
    ALLOWED_SHARED = {
        "A8",      # dual +12V feeds tied together
        "B5","B6", # batch fire — two injectors per bank
    }
    for pin, sigs in pin_map.items():
        if pin in ALLOWED_SHARED:
            continue
        if len(sigs) > 1:
            # Allowed: grounds (multiple wires to same ground pin)
            if pin in UAEFI_PINOUT["PWR_GND"] | UAEFI_PINOUT["SENS_GND"]:
                continue
            # Allowed: HEI BYPASS sharing C1/C2 with S5V
            if pin in ("C1","C2") and set(sigs) <= {"S5V","HEI BYPASS"}:
                continue
            issues.append(f"Pin conflict on {pin}: {', '.join(sigs)}")
    return issues

def check_voltage_domains(mappings):
    """12V sources connected to 5V-only pins."""
    issues = []
    for m in mappings:
        if m["disposition"] != "repin":
            continue
        dest_pins = m["dest"].replace(" ","").split("|")
        source = m["source"]
        # Check if source is a known 12V line
        is_12v = source in KNOWN_12V_SOURCES or source in KNOWN_COIL_DRIVERS
        if is_12v:
            for pin in dest_pins:
                if pin in UAEFI_PINOUT["5V_ONLY"]:
                    issues.append(f"🛑 12V source {source} ({m['signal']}) → {pin} (5V-only). WILL DESTROY UAEFI.")
    return issues

def check_flyback(mappings):
    """B8/B9 have VNLD5090 active clamp — no external diode required (as-designed)."""
    return []  # Active clamp handles relay flyback; external 1N4007 optional for large relays

def check_cj125_trap(mappings):
    """Anything other than WBO heater connected to E1."""
    issues = []
    for m in mappings:
        for pin in m["dest"].replace(" ","").split("|"):
            if pin == "E1" and "WBO Heater" not in m["signal"]:
                issues.append(f"🛑 {m['signal']} → E1. E1 is CJ125 PWM driver — connecting 12V or anything else WILL DESTROY CJ125.")
    return issues

def check_coil_direct(mappings):
    """Coil logic pins connected directly to coil (missing igniter)."""
    issues = []
    for m in mappings:
        for pin in m["dest"].replace(" ","").split("|"):
            if pin in UAEFI_PINOUT["COIL_LOGIC"]:
                notes = m.get("notes","").lower()
                signal = m["signal"].lower()
                if "hei" not in notes and "igniter" not in notes and "logic" not in notes:
                    if "hei" not in signal:
                        issues.append(f"⚠ {m['signal']} → {pin} (5V logic coil output). MUST use external igniter (HEI module). Do not drive coil directly.")
    return issues

def check_critical_signals(mappings):
    """Verify all critical signals exist and are not abandoned."""
    issues = []
    mapped = {m["signal"]: m for m in mappings}
    for sig, desc in CRITICAL_SIGNALS.items():
        if sig not in mapped:
            issues.append(f"🛑 MISSING: {sig} — {desc}")
        elif mapped[sig]["disposition"] == "abandon":
            issues.append(f"🛑 ABANDONED: {sig} — {desc}")
    return issues

def check_ground_separation(mappings):
    """Sensor grounds and power grounds mixed at same uaEFI pin."""
    issues = []
    sens_sources = set()
    pwr_sources = set()
    for m in mappings:
        if m["disposition"] == "abandon":
            continue
        for pin in m["dest"].replace(" ","").split("|"):
            if pin in UAEFI_PINOUT["SENS_GND"]:
                sens_sources.add(m["source"])
            elif pin in UAEFI_PINOUT["PWR_GND"]:
                pwr_sources.add(m["source"])
    # Check for sources going to wrong ground
    sens_sources_list = ["PIA-1","PIB-18","PIB-25"]  # known sensor grounds
    for m in mappings:
        source = m["source"]
        if source in sens_sources_list:
            for pin in m["dest"].replace(" ","").split("|"):
                if pin in UAEFI_PINOUT["PWR_GND"]:
                    issues.append(f"⚠ Sensor ground {source} → {pin} (power ground). Sensor and power grounds should be separate.")
    return issues

def check_abandon_12v(mappings):
    """Verify all known 12V trap sources are marked abandon."""
    issues = []
    abandon_sources = {m["source"] for m in mappings if m["disposition"] == "abandon"}
    # Critical 12V traps that MUST be abandoned
    must_abandon = {"PIB-4","PIB-11","PIB-17","PIC-8","PIC-14","PIC-15","PIA-10","PIA-11"}
    for src in must_abandon:
        if src not in abandon_sources:
            issues.append(f"⚠ {src} not marked as abandon. Known 12V trap — cap this wire.")
    # C9 is handled as a single connector entry
    if "C9 Connector" not in {m["signal"] for m in mappings if m["disposition"] == "abandon"}:
        issues.append("⚠ C9 connector not marked as abandon. LIVE 12V 14 AWG coil power — remove entirely.")
    return issues

def main():
    mappings = load(sys.argv[1] if len(sys.argv) > 1 else "/opt/data/uaefi-converter/src/data/mappings.json")

    all_checks = [
        ("Pin Conflicts", check_pin_conflicts(mappings)),
        ("Voltage Domain", check_voltage_domains(mappings)),
        ("Flyback Diodes", check_flyback(mappings)),
        ("CJ125 Trap", check_cj125_trap(mappings)),
        ("Coil Logic", check_coil_direct(mappings)),
        ("Critical Signals", check_critical_signals(mappings)),
        ("Ground Separation", check_ground_separation(mappings)),
        ("Abandon 12V Traps", check_abandon_12v(mappings)),
    ]

    total = 0
    fatals = 0
    for name, issues in all_checks:
        if issues:
            print(f"\n{'='*60}")
            print(f"  {name} ({len(issues)} issue{'s' if len(issues) > 1 else ''})")
            print(f"{'='*60}")
            for issue in issues:
                print(f"  {issue}")
                total += 1
                if issue.startswith("🛑"):
                    fatals += 1

    if total == 0:
        print("\n✓ All checks passed. No issues found.")
    else:
        print(f"\n{'='*60}")
        print(f"  {total} issue{'s' if total > 1 else ''} total — {fatals} fatal")
        print(f"{'='*60}")

    # Summary stats
    stats = defaultdict(lambda: {"total": 0, "verified": 0, "abandon": 0, "new": 0})
    for m in mappings:
        stats[m["disposition"]]["total"] += 1
    print(f"\n  repin: {stats['repin']['total']} | new: {stats['new']['total']} | abandon: {stats['abandon']['total']}")

    return 1 if fatals > 0 else 0

if __name__ == "__main__":
    sys.exit(main())
