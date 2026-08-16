"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Översikt", icon: "◧" },
  { href: "/analyze", label: "Analysera", icon: "✦" },
  { href: "/history", label: "Historik", icon: "↺" },
];

const apps = [
  { name: "Decision Engine", active: true },
  { name: "Debt Optimizer", dot: "#BFFF00" },
  { name: "AI Purchase", dot: "#7A5CFA" },
];

export default function PlatformShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div style={{display:'flex', minHeight:'100vh', background:'#070708', color:'#EDEDE9'}}>
      <aside style={{width:'280px', borderRight:'1px solid #1A1A1E', background:'#0E0E10', padding:'24px', display:'flex', flexDirection:'column', justifyContent:'space-between', position:'sticky', top:0, height:'100vh'}}>
        <div>
          <div style={{fontWeight:900, letterSpacing:'-1.5px', fontSize:'22px', display:'flex', alignItems:'center', gap:'8px'}}>FRED <span style={{background:'#BFFF00', color:'black', padding:'2px 8px', borderRadius:'999px', fontSize:'11px'}}>PRO</span></div>
          <div style={{marginTop:'32px', display:'flex', flexDirection:'column', gap:'6px'}}>
            {nav.map(n=>{
              const active = path?.includes(n.href);
              return (
                <Link key={n.href} href={n.href} style={{
                  padding:'12px 14px', borderRadius:'14px', fontWeight:700, fontSize:'14px',
                  background: active ? '#BFFF00' : 'transparent',
                  color: active ? 'black' : '#9A9AA0',
                  border: active ? '2px solid #BFFF00' : '2px solid transparent',
                  display:'flex', gap:'10px', alignItems:'center'
                }}>
                  <span style={{width:'20px'}}>{n.icon}</span> {n.label}
                </Link>
              )
            })}
          </div>
          <div style={{marginTop:'36px'}}>
            <div style={{fontSize:'10px', letterSpacing:'2px', opacity:0.4, fontWeight:800, marginBottom:'12px'}}>APPLISTA</div>
            <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
              {apps.map(a=>(
                <div key={a.name} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderRadius:'12px', background: a.active ? '#1A1A1E' : 'transparent', border:'1px solid #1F1F23'}}>
                  <div style={{display:'flex', gap:'8px', alignItems:'center', fontSize:'13px', fontWeight:600}}>
                    <span style={{width:'8px', height:'8px', borderRadius:'999px', background: a.dot || '#BFFF00', display:'inline-block'}}></span> {a.name}
                  </div>
                  {a.active && <span style={{fontSize:'10px', background:'#BFFF00', color:'black', padding:'2px 6px', borderRadius:'999px', fontWeight:900}}>ACTIVE</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{borderTop:'1px solid #1A1A1E', paddingTop:'16px', display:'flex', gap:'10px', alignItems:'center'}}>
          <div style={{width:'32px', height:'32px', borderRadius:'999px', background:'#BFFF00', color:'black', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900}}>FK</div>
          <div><div style={{fontSize:'13px', fontWeight:800}}>Feffe</div><div style={{fontSize:'11px', opacity:0.5}}>Pro 1/50 analyser</div></div>
        </div>
      </aside>
      <main style={{flex:1, background:'radial-gradient(1200px 600px at 20% -10%, #BFFF0022, transparent), radial-gradient(800px 400px at 90% 0%, #7A5CFA22, transparent), #070708', minHeight:'100vh'}}>
        <div style={{padding:'32px 40px', maxWidth:'1200px'}}>{children}</div>
      </main>
    </div>
  )
}
