import Link from "next/link";
export default function Settings(){
  const links = ["Terms & Conditions|terms","Privacy Policy|privacy","Subscription Terms|subscription","Refund policy|refund","My Account|account","Support Center|support"];
  return <div><h1 style={{fontSize:"28px", fontWeight:900}}>Installningar</h1><div style={{marginTop:"24px", background:"#111115", border:"1px solid #1F1F23", borderRadius:"16px"}}>{links.map(l=>{const [label,slug]=l.split("|"); return <Link key={slug} href={`/core/settings/${slug}`} style={{display:"block", padding:"16px 20px", borderBottom:"1px solid #1A1A1E", color:"white", textDecoration:"none"}}>{label}</Link>})}</div></div>
}
