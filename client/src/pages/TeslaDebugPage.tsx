import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { isTeslaBrowser, isTvBrowser } from "../util/tv";
import { syncTeslaViewport, visibleViewport } from "../util/teslaViewport";

interface LogEntry {
  id: number;
  time: string;
  event: string;
  windowSize: string;
  viewportSize: string;
  scale: number;
  dataset: string;
}

export function TeslaDebugPage() {
  const [metrics, setMetrics] = useState({
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    isTesla: isTeslaBrowser(),
    isTv: isTvBrowser(),
    devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
    screenWidth: typeof window !== "undefined" ? window.screen.width : 0,
    screenHeight: typeof window !== "undefined" ? window.screen.height : 0,
    availWidth: typeof window !== "undefined" ? window.screen.availWidth : 0,
    availHeight: typeof window !== "undefined" ? window.screen.availHeight : 0,
    innerWidth: typeof window !== "undefined" ? window.innerWidth : 0,
    innerHeight: typeof window !== "undefined" ? window.innerHeight : 0,
    outerWidth: typeof window !== "undefined" ? window.outerWidth : 0,
    outerHeight: typeof window !== "undefined" ? window.outerHeight : 0,
    clientWidth: typeof document !== "undefined" ? document.documentElement.clientWidth : 0,
    clientHeight: typeof document !== "undefined" ? document.documentElement.clientHeight : 0,
    vvWidth: typeof window !== "undefined" && window.visualViewport ? window.visualViewport.width : 0,
    vvHeight: typeof window !== "undefined" && window.visualViewport ? window.visualViewport.height : 0,
    vvScale: typeof window !== "undefined" && window.visualViewport ? window.visualViewport.scale : 1,
    vvLeft: typeof window !== "undefined" && window.visualViewport ? window.visualViewport.offsetLeft : 0,
    vvTop: typeof window !== "undefined" && window.visualViewport ? window.visualViewport.offsetTop : 0,
    visibleViewportWidth: typeof window !== "undefined" ? visibleViewport().width : 0,
    visibleViewportHeight: typeof window !== "undefined" ? visibleViewport().height : 0,
    datasetTesla: typeof document !== "undefined" ? document.documentElement.dataset.tesla || "not set" : "not set",
    datasetTeslaViewport: typeof document !== "undefined" ? document.documentElement.dataset.teslaViewport || "not set" : "not set",
    datasetUiScale: typeof document !== "undefined" ? document.documentElement.dataset.uiScale || "not set" : "not set",
  });

  const [cssVars, setCssVariables] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [debugFontScale, setDebugFontScale] = useState<number>(15); // Adjust font size of debug page
  const [copied, setCopyState] = useState(false);
  const logIdCounter = useRef(0);

  const updateMetrics = () => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;
    const root = document.documentElement;
    const visVp = visibleViewport();

    const currentMetrics = {
      userAgent: navigator.userAgent,
      isTesla: isTeslaBrowser(),
      isTv: isTvBrowser(),
      devicePixelRatio: window.devicePixelRatio,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      clientWidth: root.clientWidth,
      clientHeight: root.clientHeight,
      vvWidth: vv ? vv.width : 0,
      vvHeight: vv ? vv.height : 0,
      vvScale: vv ? vv.scale : 1,
      vvLeft: vv ? vv.offsetLeft : 0,
      vvTop: vv ? vv.offsetTop : 0,
      visibleViewportWidth: visVp.width,
      visibleViewportHeight: visVp.height,
      datasetTesla: root.dataset.tesla || "not set",
      datasetTeslaViewport: root.dataset.teslaViewport || "not set",
      datasetUiScale: root.dataset.uiScale || "not set",
    };

    setMetrics(currentMetrics);

    // Read CSS custom properties
    const computed = getComputedStyle(root);
    const variables = [
      "--mayhem-app-width",
      "--mayhem-app-height",
      "--ui-font",
      "--touch",
      "--bar-height",
      "--icon-size",
      "--icon-play-size",
      "--icon-play-dim",
      "--icon-play-size-big",
      "--icon-play-dim-big",
      "--hero-art-size",
      "--sidebar-width",
    ];

    const varValues: Record<string, string> = {};
    variables.forEach((v) => {
      varValues[v] = computed.getPropertyValue(v).trim() || "not set";
    });
    setCssVariables(varValues);
  };

  const addLog = (eventName: string) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now
      .getMilliseconds()
      .toString()
      .padStart(3, "0")}`;

    const vv = window.visualViewport;
    const root = document.documentElement;

    logIdCounter.current += 1;
    const newEntry: LogEntry = {
      id: logIdCounter.current,
      time: timeStr,
      event: eventName,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      viewportSize: vv ? `${Math.round(vv.width)}x${Math.round(vv.height)}` : "N/A",
      scale: vv ? parseFloat(vv.scale.toFixed(4)) : 1,
      dataset: root.dataset.teslaViewport || "not set",
    };

    setLogs((prev) => [newEntry, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  useEffect(() => {
    updateMetrics();
    addLog("Initial Mount");

    const handleResize = () => {
      updateMetrics();
      addLog("window.resize");
    };

    const handleOrientation = () => {
      updateMetrics();
      addLog("window.orientationchange");
    };

    const handleVvResize = () => {
      updateMetrics();
      addLog("visualViewport.resize");
    };

    const handleVvScroll = () => {
      updateMetrics();
      addLog("visualViewport.scroll");
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientation);
    window.visualViewport?.addEventListener("resize", handleVvResize);
    window.visualViewport?.addEventListener("scroll", handleVvScroll);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientation);
      window.visualViewport?.removeEventListener("resize", handleVvResize);
      window.visualViewport?.removeEventListener("scroll", handleVvScroll);
    };
  }, []);

  const handleManualSync = () => {
    syncTeslaViewport();
    updateMetrics();
    addLog("Manual Sync Triggered");
  };

  const handleClearLogs = () => {
    setLogs([]);
    logIdCounter.current = 0;
  };

  const copyToClipboard = () => {
    const dataToCopy = {
      timestamp: new Date().toISOString(),
      metrics,
      cssVars,
      logs: logs.map((l) => ({
        time: l.time,
        event: l.event,
        windowSize: l.windowSize,
        viewportSize: l.viewportSize,
        scale: l.scale,
        dataset: l.dataset,
      })),
    };

    navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2))
      .then(() => {
        setCopyState(true);
        setTimeout(() => setCopyState(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  // Inline styling for the debug page to ensure it's completely isolated and readable
  const containerStyle = {
    padding: "1.5rem",
    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
    fontSize: `${debugFontScale}px`,
    lineHeight: "1.4",
    backgroundColor: "#0b0b0f",
    color: "#e9e9f0",
    minHeight: "100vh",
    overflowY: "auto" as const,
    boxSizing: "border-box" as const,
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "2px solid #2c2c38",
    paddingBottom: "1rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap" as const,
    gap: "1rem",
  };

  const buttonStyle = {
    padding: "0.5rem 1rem",
    backgroundColor: "#1e1e28",
    border: "1px solid #2c2c38",
    borderRadius: "6px",
    color: "#e5a00d",
    fontSize: "0.95em",
    fontWeight: "bold" as const,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
  };

  const backButtonStyle = {
    ...buttonStyle,
    color: "#e9e9f0",
    textDecoration: "none",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "1.5rem",
    marginBottom: "1.5rem",
  };

  const sectionStyle = {
    backgroundColor: "#15151c",
    border: "1px solid #2c2c38",
    borderRadius: "8px",
    padding: "1.25rem",
  };

  const sectionTitleStyle = {
    margin: "0 0 1rem 0",
    fontSize: "1.2em",
    color: "#e5a00d",
    borderBottom: "1px solid #2c2c38",
    paddingBottom: "0.5rem",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse" as const,
  };

  const labelTdStyle = {
    padding: "0.4rem 0.5rem 0.4rem 0",
    color: "#9a9aac",
    fontWeight: "bold" as const,
    width: "55%",
    borderBottom: "1px solid #1e1e28",
  };

  const valueTdStyle = {
    padding: "0.4rem 0",
    textAlign: "right" as const,
    color: "#e9e9f0",
    borderBottom: "1px solid #1e1e28",
    wordBreak: "break-all" as const,
  };

  const logTableStyle = {
    ...tableStyle,
    fontSize: "0.9em",
  };

  const logHeaderTdStyle = {
    padding: "0.5rem",
    color: "#e5a00d",
    borderBottom: "2px solid #2c2c38",
    textAlign: "left" as const,
  };

  const logTdStyle = {
    padding: "0.5rem",
    borderBottom: "1px solid #2c2c38",
    textAlign: "left" as const,
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6em", color: "#e5a00d" }}>🚗 Tesla Viewport Debugger</h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "#9a9aac", fontSize: "0.9em" }}>
            Helps diagnose parked vs. moving browser scaling issues.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link to="/" style={backButtonStyle}>
            ◀ Back to App
          </Link>
          <button onClick={handleManualSync} style={buttonStyle}>
            ⟳ Force Sync Viewport
          </button>
          <button onClick={copyToClipboard} style={{ ...buttonStyle, color: copied ? "#10b981" : "#e5a00d" }}>
            {copied ? "✓ Copied JSON!" : "📋 Copy JSON Data"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", backgroundColor: "#15151c", padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid #2c2c38" }}>
            <span style={{ color: "#9a9aac", marginRight: "0.25rem" }}>Font:</span>
            <button onClick={() => setDebugFontScale(Math.max(10, debugFontScale - 1))} style={{ ...buttonStyle, padding: "0.25rem 0.5rem" }}>A-</button>
            <span style={{ minWidth: "2rem", textAlign: "center", fontWeight: "bold" }}>{debugFontScale}px</span>
            <button onClick={() => setDebugFontScale(Math.min(32, debugFontScale + 1))} style={{ ...buttonStyle, padding: "0.25rem 0.5rem" }}>A+</button>
          </div>
        </div>
      </header>

      <div style={gridStyle}>
        {/* Device & Browser Detection */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Device & Browser</h2>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={labelTdStyle}>Is Tesla Browser?</td>
                <td style={{ ...valueTdStyle, color: metrics.isTesla ? "#10b981" : "#ef4444", fontWeight: "bold" }}>
                  {metrics.isTesla ? "YES" : "NO"}
                </td>
              </tr>
              <tr>
                <td style={labelTdStyle}>Is TV Browser?</td>
                <td style={valueTdStyle}>{metrics.isTv ? "Yes" : "No"}</td>
              </tr>
              <tr>
                <td style={labelTdStyle}>Device Pixel Ratio</td>
                <td style={valueTdStyle}>{metrics.devicePixelRatio}</td>
              </tr>
              <tr>
                <td style={labelTdStyle}>User Agent</td>
                <td style={{ ...valueTdStyle, fontSize: "0.8em", textAlign: "left" }} colSpan={2}>
                  {metrics.userAgent}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Viewport & Screen Metrics */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Viewport & Screen</h2>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={labelTdStyle}>window.innerWidth x Height</td>
                <td style={{ ...valueTdStyle, fontWeight: "bold", color: "#60a5fa" }}>
                  {metrics.innerWidth} x {metrics.innerHeight}
                </td>
              </tr>
              <tr>
                <td style={labelTdStyle}>window.outerWidth x Height</td>
                <td style={valueTdStyle}>
                  {metrics.outerWidth} x {metrics.outerHeight}
                </td>
              </tr>
              <tr>
                <td style={labelTdStyle}>visualViewport Width x Height</td>
                <td style={{ ...valueTdStyle, fontWeight: "bold", color: "#34d399" }}>
                  {metrics.vvWidth ? `${Math.round(metrics.vvWidth)} x ${Math.round(metrics.vvHeight)}` : "Not Supported"}
                </td>
              </tr>
              <tr>
                <td style={labelTdStyle}>visualViewport Scale</td>
                <td style={valueTdStyle}>{metrics.vvScale}</td>
              </tr>
              <tr>
                <td style={labelTdStyle}>visualViewport Offset L x T</td>
                <td style={valueTdStyle}>
                  {Math.round(metrics.vvLeft)} x {Math.round(metrics.vvTop)}
                </td>
              </tr>
              <tr>
                <td style={labelTdStyle}>document.clientWidth x Height</td>
                <td style={valueTdStyle}>
                  {metrics.clientWidth} x {metrics.clientHeight}
                </td>
              </tr>
              <tr>
                <td style={labelTdStyle}>screen.width x Height</td>
                <td style={valueTdStyle}>
                  {metrics.screenWidth} x {metrics.screenHeight}
                </td>
              </tr>
              <tr>
                <td style={labelTdStyle}>screen.availWidth x Height</td>
                <td style={valueTdStyle}>
                  {metrics.availWidth} x {metrics.availHeight}
                </td>
              </tr>
              <tr>
                <td style={labelTdStyle}>visibleViewport() Width x H</td>
                <td style={{ ...valueTdStyle, fontWeight: "bold", color: "#f43f5e" }}>
                  {metrics.visibleViewportWidth} x {metrics.visibleViewportHeight}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* CSS Custom Properties */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Applied CSS Custom Properties</h2>
          <table style={tableStyle}>
            <tbody>
              {Object.entries(cssVars).map(([key, val]) => (
                <tr key={key}>
                  <td style={labelTdStyle}>{key}</td>
                  <td style={{ ...valueTdStyle, fontWeight: "bold", color: "#f59e0b" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* HTML Dataset Attributes */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>HTML Dataset Attributes</h2>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={labelTdStyle}>data-tesla</td>
                <td style={{ ...valueTdStyle, fontWeight: "bold" }}>{metrics.datasetTesla}</td>
              </tr>
              <tr>
                <td style={labelTdStyle}>data-tesla-viewport</td>
                <td style={{ ...valueTdStyle, fontWeight: "bold", color: "#ec4899" }}>{metrics.datasetTeslaViewport}</td>
              </tr>
              <tr>
                <td style={labelTdStyle}>data-ui-scale</td>
                <td style={{ ...valueTdStyle, fontWeight: "bold" }}>{metrics.datasetUiScale}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      {/* Event Log */}
      <section style={{ ...sectionStyle, marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2c2c38", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.2em", color: "#e5a00d" }}>⚡ Real-time Event Log (Last 50)</h2>
          <button onClick={handleClearLogs} style={{ ...buttonStyle, padding: "0.25rem 0.75rem", fontSize: "0.85em" }}>
            ✖ Clear Log
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={logTableStyle}>
            <thead>
              <tr>
                <th style={{ ...logHeaderTdStyle, width: "8%" }}>ID</th>
                <th style={{ ...logHeaderTdStyle, width: "15%" }}>Time</th>
                <th style={{ ...logHeaderTdStyle, width: "25%" }}>Event Type</th>
                <th style={{ ...logHeaderTdStyle, width: "18%" }}>window.innerWidth/H</th>
                <th style={{ ...logHeaderTdStyle, width: "18%" }}>visualViewport W/H</th>
                <th style={{ ...logHeaderTdStyle, width: "8%" }}>Scale</th>
                <th style={{ ...logHeaderTdStyle, width: "8%" }}>Viewport Mode</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...logTdStyle, textAlign: "center", color: "#9a9aac", padding: "1.5rem" }}>
                    No events captured yet. Resize the screen to generate events.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} style={{ backgroundColor: log.event.includes("Manual") ? "#1e1b4b" : "transparent" }}>
                    <td style={logTdStyle}>{log.id}</td>
                    <td style={{ ...logTdStyle, color: "#9a9aac" }}>{log.time}</td>
                    <td style={{ ...logTdStyle, fontWeight: "bold", color: log.event.includes("Manual") ? "#a5b4fc" : "#e5a00d" }}>{log.event}</td>
                    <td style={logTdStyle}>{log.windowSize}</td>
                    <td style={logTdStyle}>{log.viewportSize}</td>
                    <td style={logTdStyle}>{log.scale}</td>
                    <td style={{ ...logTdStyle, color: log.dataset === "compact" ? "#f87171" : log.dataset === "standard" ? "#fbbf24" : "#34d399", fontWeight: "bold" }}>
                      {log.dataset}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Raw JSON Block */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Raw JSON Snapshot</h2>
        <pre style={{
          backgroundColor: "#0b0b0f",
          border: "1px solid #2c2c38",
          borderRadius: "6px",
          padding: "1rem",
          overflow: "auto",
          maxHeight: "300px",
          fontSize: "0.85em",
          margin: 0,
          color: "#a7f3d0"
        }}>
          {JSON.stringify({ metrics, cssVars }, null, 2)}
        </pre>
      </section>
    </div>
  );
}
