import Link from "next/link";
export default function CoreLayout({children}:{children:React.ReactNode}){
  return <div style={{minHeight:"100vh", background:"#0A0A0C", color:"#EDEDE9"}}><header style={{padding:"16px 24px", borderBottom:"1px solid #1A1A1E", background:"#0E0E10", display:"flex", gap:"24px"}}><span style={{fontWeight:900}}>Fred Platform</span><Link href="/core" style={{color:"#7A5CFA"}}>Oversikt</Link><Link href="/core/billing" style={{opacity:0.6}}>Billing</Link><Link href="/core/settings" style={{opacity:0.6}}>Settings</Link></header><main style={{maxWidth:"1200px", margin:"0 auto", padding:"32px 24px"}}>{children}</main></div>
}
