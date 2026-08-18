"use client";

export function CoreAppFrame({ src, title }: { src: string; title: string }) {
  return (
    <div
      style={{
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid #1E1E24",
        height: "calc(100vh - 160px)",
        background: "#0E0E12",
      }}
    >
      <iframe
        src={src}
        allow="clipboard-write"
        style={{ width: "100%", height: "100%", border: "0" }}
        title={title}
      />
    </div>
  );
}
