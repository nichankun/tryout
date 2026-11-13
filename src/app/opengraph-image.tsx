import { ImageResponse } from "next/og";

export const alt = "ASNPedia — Tryout dan latihan SKD CPNS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          padding: "72px 84px",
          color: "#12385A",
          background: "linear-gradient(135deg, #F7FAFD 0%, #EAF4FC 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -90,
            top: -180,
            width: 620,
            height: 620,
            borderRadius: 310,
            background: "#CBE7FA",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 62,
            bottom: -260,
            width: 520,
            height: 520,
            borderRadius: 260,
            background: "#B4DDF5",
            opacity: 0.68,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 18, zIndex: 1 }}>
          <div
            style={{
              width: 62,
              height: 62,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 18,
              background: "#1769AA",
              color: "white",
              fontSize: 42,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, color: "#12385A" }}>ASNPedia</div>
        </div>
        <div
          style={{
            marginTop: 64,
            display: "flex",
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: 3,
            color: "#1769AA",
            zIndex: 1,
          }}
        >
          PERSIAPAN SKD CPNS
        </div>
        <div
          style={{
            marginTop: 16,
            maxWidth: 900,
            display: "flex",
            fontSize: 66,
            lineHeight: 1.12,
            fontWeight: 700,
            letterSpacing: -2,
            zIndex: 1,
          }}
        >
          Tryout SKD CPNS lebih terarah
        </div>
        <div
          style={{
            marginTop: 22,
            display: "flex",
            fontSize: 28,
            color: "#526C82",
            zIndex: 1,
          }}
        >
          Latihan TWK, TIU, dan TKP dengan skor serta pembahasan.
        </div>
        <div
          style={{
            position: "absolute",
            right: 54,
            bottom: 40,
            display: "flex",
            fontSize: 18,
            color: "#365D7A",
            zIndex: 1,
          }}
        >
          asnpedia.kelonika.my.id
        </div>
      </div>
    ),
    size,
  );
}
