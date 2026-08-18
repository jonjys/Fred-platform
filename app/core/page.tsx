import Link from "next/link";
const business = [
  { id:"procure", name:"Fred Procure", tag:"Decision Engine", desc:"BUY, NEGOTIATE or DECLINE - TCO, VAT, ROI", href:"/analyze", accent:"#7A5CFA" },
  { id:"finance", name:"Fred Finance", tag:"Debt Optimizer", desc:"Optimize interest, payments & cashflow", href:"/core/finance", accent:"#BFFF00" },
  { id:"invoice", name:"Fred Invoice", tag:"Billing", desc:"Invoice in 30s with Swish link", href:"/core/invoice", accent:"#00E5FF" },
  { id:"letters", name:"Fred Letters", tag:"Correspondence", desc:"Official letters & replies", href:"/core/letters", accent:"#34C759" },
  { id:"tunnel", name:"Fred Tunnel", tag:"Ingestion", desc:"CapCut, YouTube, Swish -> inbox", href:"/core/tunnel", accent:"#FF4D8D" },
  { id:"cast", name:"FredCast", tag:"Content OS", desc:"Voice & video - podcast factory", href:"/core/cast", accent:"#8B5CF6" },
  { id:"radar", name:"Fred Radar", tag:"Intelligence", desc:"Track prices, suppliers & market", href:"/core/radar", accent:"#BFFF00" },
];
const infra = [
  { id:"gatezero", name:"GateZero", tag:"Zero Trust Gateway", desc:"Entry, auth & approval - API gateway", href:"/core/gatezero", accent:"#FF6B00" },
  { id:"bridge", name:"Bridge", tag:"AI Control Plane", desc:"Prompt orchestration & API keys", href:"/core/bridge", accent:"#FFFFFF" },
];

export default function CorePage(){
  return (
    <>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end"}}>
        <div>
          <div style={{display:"inline-flex", padding:"6px 12px", borderRadius:"999px", background:"rgba(122,92,250,0.12)", border:"1px solid rgba(122,92,250,0.2)", fontSize:"11px", fontWeight:700, color:"#A99CFF"}}>FRED PLATFORM CORE</div>
          <h1 style={{fontSize:"38px", fontWeight:800, letterSpacing:"-0.04em", marginTop:"14px"}}>Overview</h1>
        </div>
        <div style={{padding:"10px 14px", borderRadius:"12px", background:"#7A5CFA", color:"white", fontSize:"12px", fontWeight:700}}>Upgrade Pro</div>
      </div>

      <div style={{marginTop:"32px", fontSize:"11px", fontWeight:700, letterSpacing:"0.12em", color:"#3A3A44"}}>BUSINESS APPS — LIVE</div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:"14px", marginTop:"12px"}}>
        {business.map((a,i)=>{
          const isLight = ["#BFFF00","#00E5FF","#34C759","#FFFFFF"].includes(a.accent);
          const span = i===0 ? "span 6" : "span 3";
          return (
            <Link key={a.id} href={a.href} style={{gridColumn: span, padding:"22px", borderRadius:"18px", background:"linear-gradient(180deg, #13131A 0%, #0E0E12 100%)", border:"1px solid #1E1E24", display:"block", position:"relative", overflow:"hidden", textDecoration:"none"}}>
              <div style={{position:"absolute", top:"-40px", right:"-40px", width:"160px", height:"160px", borderRadius:"999px", background:a.accent+"25", filter:"blur(32px)"}}></div>
              <div style={{width:"40px", height:"40px", borderRadius:"12px", background:a.accent, display:"flex", alignItems:"center", justifyContent:"center", color:isLight?"#000":"#fff", fontWeight:900}}>{a.name[0]}</div>
              <div style={{marginTop:"14px", fontSize:"10px", fontWeight:700, letterSpacing:"0.12em", color:"#5A5A60"}}>{a.tag}</div>
              <div style={{marginTop:"4px", fontSize:"16px", fontWeight:700, color:"#fff"}}>{a.name}</div>
              <div style={{marginTop:"4px", fontSize:"12px", color:"#6E6E78"}}>{a.desc}</div>
            </Link>
          );
        })}
      </div>

      <div style={{marginTop:"36px", fontSize:"11px", fontWeight:700, letterSpacing:"0.12em", color:"#3A3A44"}}>INFRASTRUCTURE — APIS, GATEWAYS & CONTROL</div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:"14px", marginTop:"12px"}}>
        {infra.map(a=>{
          const isLight = a.accent==="#FFFFFF";
          return (
            <Link key={a.id} href={a.href} style={{gridColumn:"span 3", padding:"22px", borderRadius:"18px", background:"linear-gradient(180deg, #13131A 0%, #0E0E12 100%)", border:"1px solid #1E1E24", display:"block", textDecoration:"none"}}>
              <div style={{width:"40px", height:"40px", borderRadius:"12px", background:a.accent, display:"flex", alignItems:"center", justifyContent:"center", color:isLight?"#000":"#fff", fontWeight:900}}>{a.name[0]}</div>
              <div style={{marginTop:"14px", fontSize:"10px", fontWeight:700, letterSpacing:"0.12em", color:"#5A5A60"}}>{a.tag}</div>
              <div style={{marginTop:"4px", fontSize:"16px", fontWeight:700, color:"#fff"}}>{a.name}</div>
              <div style={{marginTop:"4px", fontSize:"12px", color:"#6E6E78"}}>{a.desc}</div>
            </Link>
          );
        })}
        <div style={{gridColumn:"span 6", padding:"22px", borderRadius:"18px", border:"1px dashed #2A2A34", background:"#0E0E12", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <div><div style={{fontSize:"10px", color:"#5A5A60", fontWeight:700, letterSpacing:"0.12em"}}>DEVELOPER</div><div style={{fontSize:"14px", fontWeight:700, color:"#9A9AA0", marginTop:"4px"}}>APIs, webhooks, keys</div></div>
          <div style={{fontSize:"11px", padding:"8px 12px", borderRadius:"10px", background:"#15151A", border:"1px solid #1E1E24", color:"#6E6E78"}}>Soon</div>
        </div>
      </div>
    </>
  );
}
