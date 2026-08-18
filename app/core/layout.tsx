import Link from "next/link";
const nav = [
  { href:"/core", label:"Overview" },
  { href:"/core/billing", label:"Billing" },
  { href:"/core/settings", label:"Settings" },
];
export default function CoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:flex" style={{minHeight:"100vh", background:"#070708", color:"#EDEDE9"}}>
      {/* Mobile top bar — the fixed 260px sidebar below is desktop-only
         (md:flex on <aside>). At 390px a fixed sidebar would leave almost
         no room for content, so mobile gets a slim horizontal nav instead. */}
      <div className="flex md:hidden" style={{alignItems:"center", gap:"12px", padding:"14px 16px", borderBottom:"1px solid #1E1E24", background:"#0E0E12", overflowX:"auto"}}>
        <div style={{width:"28px", height:"28px", borderRadius:"8px", background:"linear-gradient(135deg,#7A5CFA,#BFFF00)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#000", flexShrink:0}}>F</div>
        <div style={{display:"flex", gap:"6px"}}>
          {nav.map(n=>(
            <Link key={n.href} href={n.href} style={{padding:"8px 12px", borderRadius:"10px", background: n.href==="/core"? "#15151A" : "transparent", fontSize:"12px", fontWeight:600, color: n.href==="/core"? "#fff" : "#6E6E78", whiteSpace:"nowrap"}}>{n.label}</Link>
          ))}
        </div>
      </div>

      <aside className="hidden md:flex" style={{width:"260px", background:"#0E0E12", borderRight:"1px solid #1E1E24", flexDirection:"column", position:"fixed", height:"100vh", zIndex:20}}>
        <div style={{padding:"28px 22px", display:"flex", gap:"12px", alignItems:"center"}}>
          <div style={{width:"32px", height:"32px", borderRadius:"10px", background:"linear-gradient(135deg,#7A5CFA,#BFFF00)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#000"}}>F</div>
          <div style={{fontWeight:800, fontSize:"15px"}}>Fred Platform</div>
        </div>
        <div style={{padding:"0 12px", flex:1, display:"flex", flexDirection:"column", gap:"4px"}}>
          {nav.map(n=>(
            <Link key={n.href} href={n.href} style={{padding:"12px 14px", borderRadius:"12px", background: n.href==="/core"? "#15151A" : "transparent", border:"1px solid #22222A", fontSize:"13px", fontWeight:600, color: n.href==="/core"? "#fff" : "#6E6E78"}}>{n.label}</Link>
          ))}
        </div>
      </aside>
      <main className="md:ml-[260px] p-4 md:py-10 md:px-12" style={{flex:1, minHeight:"100vh", background:"radial-gradient(1200px 600px at 20% -10%, rgba(122,92,250,0.15), transparent), radial-gradient(800px 400px at 80% 0%, rgba(191,255,0,0.08), transparent), #070708"}}>{children}</main>
    </div>
  );
}
