export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "var(--color-bg)",
        color: "var(--color-green)",
        fontFamily: "var(--font-hud)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "1.5rem", letterSpacing: "0.2em" }}>
          ▌GEOVIGIL SAR▐
        </div>
        <div style={{ color: "var(--color-muted)", marginTop: "0.5rem", fontSize: "0.875rem" }}>
          INITIALIZING... VEN-2406
        </div>
      </div>
    </main>
  )
}
