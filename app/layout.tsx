import "./globals.css";
export const metadata = { title: "Fred-platform" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{margin:0, background:'#F6F5F0', color:'#111', fontFamily:'Inter, system-ui, sans-serif'}}>
        {children}
      </body>
    </html>
  );
}