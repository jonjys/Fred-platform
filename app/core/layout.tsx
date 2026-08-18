import Link from "next/link";
const nav = [
  { href:"/core", label:"Overview" },
  { href:"/core/billing", label:"Billing" },
  { href:"/core/settings", label:"Settings" },
];
export default function CoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{display:"flex", minHeight:"100vh", background:"#070708", color:"#EDEDE9"}}>
      <aside style={{width:"260px", background:"#0E0E12", borderRight:"1px solid #1E1E24", display:"flex", flexDirection:"column", position:"fixed", height:"100vh", zIndex:20}}>
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
      <main style={{marginLeft:"260px", flex:1, minHeight:"100vh", background:"radial-gradient(1200px 600px at 20% -10%, rgba(122,92,250,0.15), transparent), radial-gradient(800px 400px at 80% 0%, rgba(191,255,0,0.08), transparent), #070708", padding:"40px 48px"}}>{children}</main>
    </div>
  );
}
