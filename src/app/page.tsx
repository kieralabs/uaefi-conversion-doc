"use client";

import { useState, useMemo } from "react";
import mappings from "@/data/mappings.json";
import uaefiPinout from "@/data/uaefi-pinout.json";
import acesHarness from "@/data/aces-harness.json";

type Mapping = { pic: number | null; source: string; signal: string; aces_label: string | null; color: string; awg: number | null; dest: string; category: string; disposition: string; verified: boolean; spliced: boolean; tested: boolean; notes: string };
type UaefiPin = { connector: string; pin: string; ts_name: string; type: string; function: string; color: string; notes: string };
type AcesPin = { connector: string; pin: number | string; function: string; color: string; awg: number | null; notes: string; verified: boolean };

const TABS = ["Mapping", "uaEFI Pinout", "ACES Harness", "HEI Module"] as const;
const CONNECTORS = ["All", "A", "B", "C", "D", "E"] as const;
const ACES_PDF = "https://cdn.shopify.com/s/files/1/0571/2406/1390/files/Killshot_2_Pro_Harness_Diagrams.pdf";

function uaefiLink(dest: string): string | null {
  const m = dest.match(/^([A-E])(\d+)/);
  if (!m) return null;
  return `https://rusefi.com/docs/pinouts/hellen/uaefi/?connector=${m[1].toLowerCase()}&pin=${m[1]}${m[2]}`;
}

function connectorFor(dest: string): string {
  const m = dest.match(/^([A-E])\d/);
  return m ? m[1] : "?";
}

function colorToHex(c: string): string {
  const map: Record<string, string> = {
    BLACK: "#222", RED: "#d44", ORANGE: "#f80", YELLOW: "#dd0",
    GREEN: "#4a4", BLUE: "#48d", PURPLE: "#a4d", GREY: "#888",
    WHITE: "#eee", BROWN: "#840",
  };
  return map[c] || "#555";
}

export default function Home() {
  const [tab, setTab] = useState<string>("Mapping");
  const [connector, setConnector] = useState<string>("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filteredMappings = useMemo(() => {
    let rows: Mapping[] = mappings;
    if (connector !== "All") rows = rows.filter((r) => connectorFor(r.dest) === connector);
    if (verifiedOnly) rows = rows.filter((r) => r.verified);
    return rows;
  }, [connector, verifiedOnly]);

  const filteredUaefi = useMemo(() => {
    return connector === "All"
      ? uaefiPinout
      : uaefiPinout.filter((r) => r.connector === connector);
  }, [connector]);

  const counts = useMemo(() => {
    return {
      mappings: { total: mappings.length, verified: mappings.filter((r) => r.verified).length },
      uaefi: { total: uaefiPinout.length },
      aces: { total: acesHarness.length },
    };
  }, []);

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto">
      <header className="mb-4 border-b border-[#333] pb-4">
        <h1 className="text-lg font-semibold text-white tracking-tight">
          ACES Killshot 2 Pro → rusEFI uaEFI
        </h1>
        <p className="text-xs text-[#999] mt-1">
          1989 Corvette C4 · L98 350 SBC · 4-injector TBI
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setConnector("All"); }}
            className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
              tab === t
                ? "bg-[#e4002b] border-[#e4002b] text-white"
                : "border-[#444] text-[#aaa] hover:border-[#777] hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {tab === "Mapping" ? (
          <>
            <div className="flex gap-1">
              {CONNECTORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setConnector(c)}
                  className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
                    connector === c
                      ? "bg-[#e4002b] border-[#e4002b] text-white"
                      : "border-[#444] text-[#aaa] hover:border-[#777] hover:text-white"
                  }`}
                >
                  {c === "All" ? `All (${counts.mappings.total})` : c}
                </button>
              ))}
            </div>
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`px-2.5 py-1 text-xs border transition-colors ${
                verifiedOnly
                  ? "bg-[#0d7] border-[#0d7] text-black font-semibold"
                  : "border-[#0d7] text-[#0d7] hover:bg-[#0d7]/20"
              }`}
            >
              ✅ Verified ({counts.mappings.verified})
            </button>
            <span className="text-xs text-[#666] ml-auto">
              {filteredMappings.length} of {mappings.length}
            </span>
          </>
        ) : tab === "HEI Module" ? null : (
          <>
            <div className="flex gap-1">
              {CONNECTORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setConnector(c)}
                  className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
                    connector === c
                      ? "bg-[#e4002b] border-[#e4002b] text-white"
                      : "border-[#444] text-[#aaa] hover:border-[#777] hover:text-white"
                  }`}
                >
                  {c === "All" ? `All (${tab === "uaEFI Pinout" ? counts.uaefi.total : counts.aces.total})` : c}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mapping Table */}
      {tab === "Mapping" && (
        <>
        <MappingChecks mappings={mappings} />
        <TableWrapper>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-[#222] text-[#999] uppercase tracking-wider">
                <th className="text-left p-2 whitespace-nowrap">Signal</th>
                <th className="text-left p-2 whitespace-nowrap">Path</th>
                <th className="text-left p-2 whitespace-nowrap w-16">Color</th>
                <th className="text-right p-2 whitespace-nowrap w-10">AWG</th>
                <th className="text-left p-2 whitespace-nowrap w-16">Category</th>
                <th className="text-center p-2 whitespace-nowrap w-14">Disp.</th>
                <th className="text-center p-2 whitespace-nowrap w-8" title="Verified">V</th>
                <th className="text-center p-2 whitespace-nowrap w-8" title="Spliced">S</th>
                <th className="text-center p-2 whitespace-nowrap w-8" title="Tested">T</th>
                <th className="text-left p-2 whitespace-nowrap">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.map((row, i) => {
                const ul = uaefiLink(row.dest);
                const isAbandon = row.disposition === "abandon";
                const isNew = row.disposition === "new";
                return (
                  <tr
                    key={i}
                    className={`border-t border-[#2a2a2a] transition-colors ${
                      isAbandon ? "opacity-40 hover:bg-white/[0.02]" :
                      isNew ? "hover:bg-[#48d]/5" :
                      "hover:bg-white/[0.03]"
                    }`}
                  >
                    <td className="p-2 whitespace-nowrap">
                      <span className={isAbandon ? "text-[#555] line-through" : isNew ? "text-[#48d] font-semibold" : "text-white font-semibold"}>
                        {row.signal}
                      </span>
                      {row.aces_label && row.aces_label !== row.signal && (
                        <span className="block text-[10px] text-[#f80] mt-0.5 leading-none">
                          ACES: {row.aces_label}
                        </span>
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap text-[11px]">
                      {isAbandon ? (
                        <span className="text-[#555]">{row.source} — cap/stow</span>
                      ) : isNew ? (
                        <span>
                          <span className="text-[#48d]">new</span>
                          <span className="text-[#555]"> → </span>
                          {ul ? (
                            <a href={ul} target="_blank" rel="noreferrer" className="text-[#e4002b] font-semibold hover:underline">{row.dest}</a>
                          ) : (
                            <span className="text-[#e4002b] font-semibold">{row.dest}</span>
                          )}
                        </span>
                      ) : row.pic != null ? (
                        <span>
                          <span className="text-[#888]">PIC {row.pic}</span>
                          <span className="text-[#555]"> → </span>
                          <span className="text-[#aaa]">{row.source}</span>
                          <span className="text-[#555]"> → </span>
                          {ul ? (
                            <a href={ul} target="_blank" rel="noreferrer" className="text-[#e4002b] font-semibold hover:underline">{row.dest}</a>
                          ) : (
                            <span className="text-[#e4002b] font-semibold">{row.dest}</span>
                          )}
                        </span>
                      ) : (
                        <span>
                          <span className="text-[#aaa]">{row.source}</span>
                          <span className="text-[#555]"> → </span>
                          {ul ? (
                            <a href={ul} target="_blank" rel="noreferrer" className="text-[#e4002b] font-semibold hover:underline">{row.dest}</a>
                          ) : (
                            <span className="text-[#e4002b] font-semibold">{row.dest}</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {row.color !== "—" ? (
                        <>
                          <span
                            className="inline-block w-3 h-3 rounded-full align-middle mr-1 border border-[#444]"
                            style={{ backgroundColor: colorToHex(row.color) }}
                          />
                          <span className="text-[#aaa] text-[10px]">{row.color}</span>
                        </>
                      ) : (
                        <span className="text-[#555]">—</span>
                      )}
                    </td>
                    <td className="p-2 text-right text-[#999] whitespace-nowrap">{row.awg}</td>
                    <td className="p-2 whitespace-nowrap">
                      <span className={`text-[10px] px-1 py-0.5 ${
                        row.category === "Abandon" ? "text-[#555] bg-[#333]" :
                        row.category === "Ignition" ? "text-[#f80] bg-[#f80]/10" :
                        row.category === "Injector" ? "text-[#48d] bg-[#48d]/10" :
                        row.category === "Sensor" || row.category === "Sensor Ref" ? "text-[#0d7] bg-[#0d7]/10" :
                        row.category === "Wideband" ? "text-[#dd0] bg-[#dd0]/10" :
                        row.category === "Power" ? "text-[#d44] bg-[#d44]/10" :
                        row.category === "Ground" ? "text-[#666] bg-[#666]/10" :
                        row.category === "CAN" ? "text-[#a4d] bg-[#a4d]/10" :
                        row.category === "Output" ? "text-[#f80] bg-[#f80]/10" :
                        row.category === "IAC" ? "text-[#0d7] bg-[#0d7]/10" :
                        "text-[#999] bg-[#333]"
                      }`}>{row.category}</span>
                    </td>
                    <td className="p-2 text-center whitespace-nowrap">
                      <span className={`text-[10px] font-semibold ${
                        row.disposition === "abandon" ? "text-[#555]" :
                        row.disposition === "new" ? "text-[#48d]" :
                        "text-[#aaa]"
                      }`}>{row.disposition}</span>
                    </td>
                    <td className="p-2 text-center">{row.verified ? <span className="text-[#0d7] text-[10px]">✓</span> : <span className="text-[#444] text-[10px]">—</span>}</td>
                    <td className="p-2 text-center">{row.spliced ? <span className="text-[#0d7] text-[10px]">✓</span> : <span className="text-[#444] text-[10px]">—</span>}</td>
                    <td className="p-2 text-center">{row.tested ? <span className="text-[#0d7] text-[10px]">✓</span> : <span className="text-[#444] text-[10px]">—</span>}</td>
                    <td className="p-2 text-[#888] text-[10px] leading-relaxed max-w-xs">{row.notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrapper>
        </>
      )}

      {/* uaEFI Pinout Table */}
      {tab === "uaEFI Pinout" && (
        <>
        <UaefiChecks uaefiPins={uaefiPinout} mappings={mappings} />
        <TableWrapper>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-[#222] text-[#999] uppercase tracking-wider">
                <th className="text-left p-2 whitespace-nowrap w-16">Pin</th>
                <th className="text-left p-2 whitespace-nowrap">TS Name</th>
                <th className="text-left p-2 whitespace-nowrap w-12">Type</th>
                <th className="text-left p-2 whitespace-nowrap">Function</th>
                <th className="text-left p-2 whitespace-nowrap w-20">Color</th>
                <th className="text-left p-2 whitespace-nowrap">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredUaefi.map((row, i) => (
                <tr key={i} className="border-t border-[#2a2a2a] hover:bg-white/[0.03]">
                  <td className="p-2 whitespace-nowrap">
                    <span className="text-[#e4002b] font-semibold">{row.connector}{row.pin}</span>
                  </td>
                  <td className="p-2 whitespace-nowrap text-[#aaa]">{row.ts_name || "—"}</td>
                  <td className="p-2 whitespace-nowrap">
                    <span className={`text-[10px] px-1 py-0.5 ${
                      row.type === "ls" ? "text-[#48d] bg-[#48d]/10" :
                      row.type === "ign" ? "text-[#f80] bg-[#f80]/10" :
                      row.type === "av" || row.type === "at" ? "text-[#0d7] bg-[#0d7]/10" :
                      row.type === "gnd" ? "text-[#666] bg-[#666]/10" :
                      row.type === "5v" ? "text-[#d44] bg-[#d44]/10" :
                      row.type === "can" ? "text-[#a4d] bg-[#a4d]/10" :
                      row.type === "wbo" ? "text-[#dd0] bg-[#dd0]/10" :
                      "text-[#999] bg-[#333]"
                    }`}>{row.type || "—"}</span>
                  </td>
                  <td className="p-2 text-[#ccc]">{row.function}</td>
                  <td className="p-2 whitespace-nowrap">
                    <span
                      className="inline-block w-3 h-3 rounded-full align-middle mr-1 border border-[#444]"
                      style={{ backgroundColor: colorToHex(row.color.toUpperCase()) }}
                    />
                    <span className="text-[#aaa] text-[10px]">{row.color}</span>
                  </td>
                  <td className="p-2 text-[#888] text-[10px] leading-relaxed max-w-xs">{row.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
        <div className="mt-3 text-xs text-[#888] border border-[#444] bg-[#111] p-3 space-y-2">
          <p className="text-[#aaa] font-semibold">⚡ Board Quirks &amp; Unpopulated Options</p>
          <ul className="space-y-1.5 list-disc list-inside text-[#777]">
            <li><strong className="text-[#ccc]">Onboard MAP:</strong> NOT populated. Requires soldering MPX4250AP or MPXH6400AC. We use the external ACES TBI MAP sensor → D9.</li>
            <li><strong className="text-[#ccc]">Onboard IGBT igniters:</strong> NOT populated (ISL9V3040D3ST). We use GM 8-pin HEI module instead — B15 → HEI EST, C5 ← HEI REF.</li>
            <li><strong className="text-[#ccc]">Bluetooth (JDY-33):</strong> NOT populated. If installed, can cause reset loop due to inrush current on 3.3V rail. Fix: add 33–47µF on 5V, 220–470µF on 3.3V.</li>
            <li><strong className="text-[#ccc]">EGT (MAX31855/MAX6675):</strong> NOT populated at U4. Passives pre-soldered. MAX6675 requires C28 shorted or EGT- to GNDA.</li>
            <li><strong className="text-[#ccc]">RTC clock:</strong> CR1220 holder present but software broken (issue #4556). Not functional.</li>
            <li><strong className="text-[#ccc]">Second CAN bus:</strong> NOT populated. Requires soldering TJA1051T + passives. PRO version only.</li>
            <li><strong className="text-[#ccc]">MAX9924 VR:</strong> Default A2 mode for 12+ tooth wheels. Low tooth count needs B-mode conversion (desolder, lift pins 4/6, rewire). We do NOT use VR — HEI module handles it.</li>
            <li><strong className="text-[#ccc]">Knock input (D14):</strong> HIP9011 knock IC NOT in F2 BOM. D14 is dead unless IC is soldered.</li>
            <li><strong className="text-[#ccc]">B8/B9 (Fan/Main Relay):</strong> VNLD5090 OMNIFET II (U6). No external flyback — internal active clamp only. Source: rusEFI docs say "(no flyback here)" for both pins. External 1N4007 recommended for large relay loads.</li>
            <li><strong className="text-[#ccc]">Button inputs (C9, D2, D10):</strong> 10K PD default. Configurable via BT1/BT2/BT3 solder jumpers. 12V tolerant.</li>
            <li><strong className="text-[#ccc]">Analog inputs C3/C15/D1:</strong> 500K pull-down to GND. OK for resistive sensors, not for high-impedance sources.</li>
            <li><strong className="text-[#ccc]">WBO CJ125:</strong> E1 is PWM heater driver — NOT raw 12V. Wire LSU 4.9 directly to E1–E6. Never connect PIB-4 here.</li>
          </ul>
        </div>
        </>
      )}

      {/* ACES Harness Table */}
      {tab === "ACES Harness" && (
        <>
        <TableWrapper>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-[#222] text-[#999] uppercase tracking-wider">
                <th className="text-left p-2 whitespace-nowrap w-20">Connector</th>
                <th className="text-right p-2 whitespace-nowrap w-10">Pin</th>
                <th className="text-left p-2 whitespace-nowrap">Function</th>
                <th className="text-left p-2 whitespace-nowrap w-16">Color</th>
                <th className="text-right p-2 whitespace-nowrap w-10">AWG</th>
                <th className="text-center p-2 whitespace-nowrap w-16">Status</th>
                <th className="text-left p-2 whitespace-nowrap">Notes</th>
              </tr>
            </thead>
            <tbody>
              {acesHarness
                .filter((r) => connector === "All" || true)
                .map((row, i) => (
                <tr key={i} className={`border-t border-[#2a2a2a] hover:bg-white/[0.03] ${row.function === "(not used)" ? "opacity-30" : ""}`}>
                  <td className="p-2 whitespace-nowrap">
                    <span className="text-[#f80] font-semibold">{row.connector}-{row.pin}</span>
                  </td>
                  <td className="p-2 text-right text-[#999]">{row.pin}</td>
                  <td className="p-2">
                    <span className={row.function.startsWith("(not used)") ? "text-[#555]" : "text-[#ccc]"}>
                      {row.function}
                    </span>
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {row.color !== "—" && row.color !== "" ? (
                      <>
                        <span
                          className="inline-block w-3 h-3 rounded-full align-middle mr-1 border border-[#444]"
                          style={{ backgroundColor: colorToHex(row.color) }}
                        />
                        <span className="text-[#aaa] text-[10px]">{row.color}</span>
                      </>
                    ) : (
                      <span className="text-[#555]">—</span>
                    )}
                  </td>
                  <td className="p-2 text-right text-[#999]">{row.awg ?? "—"}</td>
                  <td className="p-2 text-center whitespace-nowrap">
                    {row.verified ? (
                      <span className="text-[#0d7] font-semibold text-[10px]">✅ verified</span>
                    ) : (
                      <span className="text-[#666] text-[10px]">⚠ pdf only</span>
                    )}
                  </td>
                  <td className="p-2 text-[#888] text-[10px] leading-relaxed max-w-xs">{row.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
        <p className="mt-3 text-xs text-[#f80] border border-[#f80]/30 bg-[#f80]/5 p-2">
          ⚠ <strong>O2 Sensor:</strong> The Bosch LSU 4.9 wideband sensor is wired <strong>directly to uaEFI connector E</strong> (E1–E6).
          Do <em>not</em> use the ACES C1 expansion harness for O2 — PIB-4 carries raw 12V and will destroy the uaEFI CJ125 wideband controller.
          The C1/C6/C7/C8/C9/C10 entries below are documented for reference only.
        </p>
        </>
      )}

      {/* HEI Module Tab */}
      {tab === "HEI Module" && (
        <HeiModuleTable />
      )}

      <footer className="mt-6 text-xs text-[#555] border-t border-[#333] pt-4 space-y-1">
        <p><span className="text-[#0d7] font-semibold">✅ verified</span> = physical harness inspection. <span className="text-[#666]">⚠ pdf only</span> = from documentation, unconfirmed.</p>
        <p>📄 = <a href={ACES_PDF} className="text-[#e4002b] hover:underline">ACES Harness Diagram PDF</a> · 🔗 = <a href="https://rusefi.com/docs/pinouts/hellen/uaefi/" className="text-[#e4002b] hover:underline">uaEFI Interactive Pinout</a></p>
      </footer>
    </main>
  );
}

function MappingChecks({ mappings }: { mappings: Mapping[] }) {
  const results = useMemo(() => {
    const checks: { name: string; ok: boolean; detail?: string }[] = [];

    // 1. Pin conflicts
    const pinMap = new Map<string, string[]>();
    const allowedShared = new Set(["A3","A4","A8","B5","B6","C1","C2","C11","C12","C13","D3","D4","D11","D12"]);
    for (const m of mappings) {
      if (m.disposition === "abandon") continue;
      for (const pin of m.dest.replace(/ /g,"").split("|")) {
        if (!pin || pin === "—") continue;
        if (!pinMap.has(pin)) pinMap.set(pin, []);
        pinMap.get(pin)!.push(m.signal);
      }
    }
    const conflicts: string[] = [];
    for (const [pin, sigs] of pinMap) {
      if (sigs.length > 1 && !allowedShared.has(pin)) {
        conflicts.push(`${pin}: ${sigs.join(", ")}`);
      }
    }
    checks.push({ name: "Pin conflicts", ok: conflicts.length === 0, detail: conflicts.join("; ") });

    // 2. Missing critical signals
    const signals = new Set(mappings.filter(m=>m.disposition!=="abandon").map(m=>m.signal));
    const critical = ["HEI REF","HEI EST","HEI BYPASS","HEI +12V","HEI Ground","HEI Coil","Distributor VR+","Distributor VR-","WBO Heater+","WBO Heater-","WBO Ip","WBO Vs/Ip","WBO CalR","WBO Vs/GND"];
    const missing = critical.filter(s => !signals.has(s));
    checks.push({ name: "Critical signals", ok: missing.length === 0, detail: missing.length ? `Missing: ${missing.join(", ")}` : undefined });

    // 3. 12V abandon traps
    const mustAbandon = ["PIB-4","PIB-11","PIB-17","PIC-8","PIC-14","PIC-15","PIA-10","PIA-11"];
    const abandonSources = new Set(mappings.filter(m=>m.disposition==="abandon").map(m=>m.source));
    const notAbandoned = mustAbandon.filter(s => !abandonSources.has(s));
    checks.push({ name: "12V traps abandoned", ok: notAbandoned.length === 0, detail: notAbandoned.length ? `Not abandoned: ${notAbandoned.join(", ")}` : undefined });

    // 4. Ground separation
    const sensSources = ["PIA-1","PIB-18","PIB-25"];
    const pwrGndPins = new Set(["A3","A4","C8"]);
    const groundIssues: string[] = [];
    for (const m of mappings) {
      if (m.disposition === "abandon") continue;
      if (sensSources.includes(m.source)) {
        for (const pin of m.dest.replace(/ /g,"").split("|")) {
          if (pwrGndPins.has(pin)) groundIssues.push(`${m.source} → ${pin}`);
        }
      }
    }
    checks.push({ name: "Ground separation", ok: groundIssues.length === 0, detail: groundIssues.join("; ") });

    // 5. Duplicate source entries
    const sourceMap = new Map<string, string[]>();
    for (const m of mappings) {
      if (m.disposition === "abandon") continue;
      if (!sourceMap.has(m.source)) sourceMap.set(m.source, []);
      sourceMap.get(m.source)!.push(m.signal);
    }
    const dupes: string[] = [];
    for (const [src, sigs] of sourceMap) {
      if (sigs.length > 1 && src !== "—") dupes.push(`${src} → ${sigs.join(" & ")}`);
    }
    checks.push({ name: "No duplicate sources", ok: dupes.length === 0, detail: dupes.join("; ") });

    return checks;
  }, [mappings]);

  const failed = results.filter(r => !r.ok);
  const icon = failed.length === 0 ? "✅" : "⚠";

  return (
    <div className={`mb-3 text-xs border p-2 ${failed.length === 0 ? "border-[#0d7] bg-[#0d7]/5" : "border-[#dd0] bg-[#dd0]/5"}`}>
      <p className={`font-semibold mb-1 ${failed.length === 0 ? "text-[#0d7]" : "text-[#dd0]"}`}>
        {icon} {failed.length === 0 ? "All checks passed" : `${failed.length} check${failed.length>1?'s':''} failed`}
      </p>
      {results.map((r,i) => (
        <p key={i} className={`ml-2 ${r.ok ? "text-[#0a7]" : "text-[#aa0]"}`}>
          {r.ok ? "✓" : "✗"} {r.name}{r.detail ? ` — ${r.detail}` : ""}
        </p>
      ))}
    </div>
  );
}

function UaefiChecks({ uaefiPins, mappings }: { uaefiPins: UaefiPin[]; mappings: Mapping[] }) {
  const results = useMemo(() => {
    const checks: { name: string; ok: boolean; detail?: string }[] = [];
    const repins = mappings.filter(m => m.disposition === "repin");

    // Build a set of uaEFI pin types for quick lookup
    const pinTypes = new Map<string, string>();
    for (const p of uaefiPins) {
      pinTypes.set(`${p.connector}${p.pin}`, p.type);
    }

    // 1. 12V source → 5V-only pin
    const known12v = new Set(["PIA-26","PIA-27","PIA-8","PIB-4","PIB-11","PIB-17","PIC-8","PIC-9","PIC-14","PIC-15"]);
    const v5only = new Set(["B10","B11","B12","B13","B14","B15","C1","C2","D3","D4"]);
    const v12to5v: string[] = [];
    for (const m of repins) {
      if (!m.source || !known12v.has(m.source)) continue;
      for (const pin of m.dest.replace(/ /g,"").split("|")) {
        if (v5only.has(pin)) v12to5v.push(`${m.source} → ${pin}`);
      }
    }
    checks.push({ name: "No 12V → 5V pin", ok: v12to5v.length === 0, detail: v12to5v.join("; ") });

    // 2. CJ125 protection (non-WBO → E1)
    const e1violations: string[] = [];
    for (const m of mappings) {
      if (m.disposition === "abandon") continue;
      for (const pin of m.dest.replace(/ /g,"").split("|")) {
        if (pin === "E1" && !m.signal.includes("WBO Heater")) e1violations.push(m.signal);
      }
    }
    checks.push({ name: "CJ125 E1 protected", ok: e1violations.length === 0, detail: e1violations.join("; ") });

    // 3. Flyback diodes — B8/B9 have VNLD5090 active clamp (internal), external 1N4007 optional
    checks.push({ name: "Flyback diodes", ok: true, detail: "B8/B9: VNLD5090 active clamp. No external flyback on board (as-designed)." });

    // 4. Coil logic with igniter
    const coilPins = new Set(["B10","B11","B12","B13","B14","B15"]);
    const coilIssues: string[] = [];
    for (const m of mappings) {
      if (m.disposition === "abandon") continue;
      for (const pin of m.dest.replace(/ /g,"").split("|")) {
        if (coilPins.has(pin)) {
          const n = (m.notes||"").toLowerCase();
          const s = m.signal.toLowerCase();
          if (!n.includes("hei") && !n.includes("igniter") && !s.includes("hei")) {
            coilIssues.push(`${m.signal} → ${pin}`);
          }
        }
      }
    }
    checks.push({ name: "Coil outputs use igniter", ok: coilIssues.length === 0, detail: coilIssues.join("; ") });

    return checks;
  }, [uaefiPins, mappings]);

  const failed = results.filter(r => !r.ok);
  const icon = failed.length === 0 ? "✅" : "⚠";

  return (
    <div className={`mb-3 text-xs border p-2 ${failed.length === 0 ? "border-[#0d7] bg-[#0d7]/5" : "border-[#d44] bg-[#d44]/5"}`}>
      <p className={`font-semibold mb-1 ${failed.length === 0 ? "text-[#0d7]" : "text-[#d44]"}`}>
        {icon} {failed.length === 0 ? "All pin checks passed" : `${failed.length} pin check${failed.length>1?'s':''} failed`}
      </p>
      {results.map((r,i) => (
        <p key={i} className={`ml-2 ${r.ok ? "text-[#0a7]" : "text-[#d44]"}`}>
          {r.ok ? "✓" : "🛑"} {r.name}{r.detail ? ` — ${r.detail}` : ""}
        </p>
      ))}
    </div>
  );
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[#333]">
      {children}
    </div>
  );
}

function HeiModuleTable() {
  const pins = [
    { pin: "P", signal: "VR+", direction: "← distributor", type: "VR pickup", notes: "Distributor pickup coil positive. HEI conditions VR internally." },
    { pin: "N", signal: "VR-", direction: "← distributor", type: "VR pickup", notes: "Distributor pickup coil negative. Polarity critical — reversing swaps trigger edge." },
    { pin: "R", signal: "REF", direction: "→ uaEFI C5", type: "Tach output", notes: "Clean 5V square wave RPM signal. Purple/white wire. Falling edge = trigger event." },
    { pin: "E", signal: "EST", direction: "← uaEFI B15", type: "Timing input", notes: "5V logic from ECU. White wire. HEI fires coil on trailing edge. Do NOT drive coil directly." },
    { pin: "B", signal: "BYPASS", direction: "← uaEFI C1/C2", type: "Mode select", notes: "0V = base timing (cranking), 5V = ECU control (run). Tan/black wire. Pull-up to +5V to enable." },
    { pin: "C", signal: "Coil -", direction: "→ coil negative", type: "High-current", notes: "Screw terminal. HEI module switches coil primary. Use 16 AWG wire." },
    { pin: "+", signal: "+12V", direction: "← ign switch", type: "Power", notes: "Switched +12V. Same source as uaEFI A7. 16 AWG." },
    { pin: "G", signal: "Ground", direction: "→ chassis", type: "Ground", notes: "8-pin module only. Mount on flat metal heat sink with thermal paste. Case must be grounded." },
  ];

  return (
    <>
    <div className="mb-3 text-xs border border-[#0d7] bg-[#0d7]/5 p-2">
      <p className="text-[#0d7] font-semibold mb-1">🔧 GM 8-Pin HEI Module — ACDelco D1943A</p>
      <p className="text-[#888]">1987–92 TPI engines. Handles VR conditioning + coil drive — uaEFI only sends 5V logic on B15. ~$15–22 at any parts store.</p>
    </div>
    <TableWrapper>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="bg-[#222] text-[#999] uppercase tracking-wider">
            <th className="text-left p-2 whitespace-nowrap w-10">Pin</th>
            <th className="text-left p-2 whitespace-nowrap w-20">Signal</th>
            <th className="text-left p-2 whitespace-nowrap w-28">Direction</th>
            <th className="text-left p-2 whitespace-nowrap w-20">Type</th>
            <th className="text-left p-2 whitespace-nowrap">Notes</th>
          </tr>
        </thead>
        <tbody>
          {pins.map((p, i) => (
            <tr key={i} className="border-t border-[#2a2a2a] hover:bg-white/[0.03]">
              <td className="p-2 whitespace-nowrap"><span className="text-[#e4002b] font-semibold">{p.pin}</span></td>
              <td className="p-2 whitespace-nowrap"><span className="text-white font-semibold">{p.signal}</span></td>
              <td className="p-2 whitespace-nowrap text-[#aaa]">{p.direction}</td>
              <td className="p-2 whitespace-nowrap">
                <span className={`text-[10px] px-1 py-0.5 ${
                  p.type.includes("5V") || p.type.includes("Tach") ? "text-[#48d] bg-[#48d]/10" :
                  p.type.includes("High") || p.type === "Power" ? "text-[#d44] bg-[#d44]/10" :
                  p.type === "Ground" ? "text-[#666] bg-[#666]/10" :
                  p.type.includes("VR") ? "text-[#f80] bg-[#f80]/10" :
                  "text-[#999] bg-[#333]"
                }`}>{p.type}</span>
              </td>
              <td className="p-2 text-[#888] text-[10px] leading-relaxed">{p.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
    <div className="mt-3 text-xs text-[#777] border border-[#444] bg-[#111] p-3 space-y-1">
      <p><strong className="text-[#aaa]">Trigger Setup in TunerStudio:</strong> Single wheel, 8 teeth. Input Capture: Rising Edge. Spark Output: Going High (Inverted). Trigger offset: ~10° BTDC (verify with timing light).</p>
      <p><strong className="text-[#aaa]">VR Polarity:</strong> P → VR+, N → VR-. Reversing swaps trigger edge — module ignores wrong polarity. Positive half-cycle must come first (tooth approaching).</p>
      <p><strong className="text-[#aaa]">Bypass behavior:</strong> During cranking, BYPASS = 0V → module fires at 10° BTDC fixed. Once running, BYPASS = 5V → module uses EST signal from uaEFI. If BYPASS stays at 0V, engine runs but ECU cannot control timing.</p>
      <p><strong className="text-[#aaa]">Coil:</strong> HEI module screw terminal C → coil negative. Do NOT connect uaEFI B15 to coil — it's 5V logic only. The module handles all high-current switching and dwell control.</p>
    </div>
    </>
  );
}
