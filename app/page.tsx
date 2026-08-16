"use client";
import { useState } from "react";
import Link from "next/link";
import { MODULE_CATALOG } from "@/config/module-catalog";
import { createClient } from "@supabase/supabase-js";

export default function FredCoreLanding() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const login = async () => {
    if(!email) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` }
    });
    setLoading(false);
    if(!error) setSent(true);
    else alert(error.message);
  };

  return (
    <div style={{minHeight:'100vh', background:'#070708', color:'#EDEDE9', fontFamily:'Inter, system-ui, sans-serif'}}>
      <div style={{maxWidth:'1200px', margin:'0 auto', padding:'40px 24px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontWeight:900, fontSize:'24px', letterSpacing:'-0.02em'}}>FRED <span style={{background:'#BFFF00', color:'black', padding:'3px 10px', borderRadius:'999px', fontSize:'12px', verticalAlign:'middle'}}>PLATFORM</span></div>
          <div style={{fontSize:'11px', opacity:0.4, fontWeight:700}}>CORE OS v1.0</div>
        </div>

        <div style={{marginTop:'80px', display:'grid', gridTemplateColumns:'1.2fr 0.8fr', gap:'40px'}}>
          <div>
            <h1 style={{fontSize:'72px', fontWeight:900, lineHeight:'0.9', letterSpacing:'-0.04em', margin:0}}>CHOOSE<br/><span style={{color:'#BFFF00'}}>YOUR WEAPON.</span></h1>
            <p style={{marginTop:'20px', fontSize:'16px', opacity:0.6, maxWidth:'420px', lineHeight:'1.5'}}>A Decision Intelligence OS. Every PPAR answers: BUY, NEGOTIATE or REJECT. Deterministic math + AI reasoning.</p>
            
            <div style={{marginTop:'48px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
              {MODULE_CATALOG.map(m=>{
                const isActive = m.enabled;
                return (
                  <Link key={m.key} href={isActive ? (m.route || '/analyze') : '#'} style={{textDecoration:'none', pointerEvents: isActive ? 'auto' : 'none'}}>
                    <div style={{
                      border:'1px solid #1F1F23',
                      borderRadius:'20px',
                      padding:'20px',
                      background: isActive ? '#0E0E10' : '#0A0A0B',
                      opacity: isActive ? 1 : 0.5,
                      transition:'all 0.2s',
                      height:'140px',
                      display:'flex',
                      flexDirection:'column',
                      justifyContent:'space-between'
                    }}>
                      <div style={{display:'flex', justifyContent:'space-between'}}>
                        <div style={{width:'10px', height:'10px', borderRadius:'999px', background: isActive ? '#BFFF00' : '#333'}}></div>
                        <span style={{fontSize:'9px', fontWeight:800, background: isActive ? '#BFFF00' : '#1A1A1E', color: isActive ? 'black' : '#666', padding:'3px 8px', borderRadius:'999px'}}>{isActive ? 'LIVE' : 'SOON'}</span>
                      </div>
                      <div>
                        <div style={{fontWeight:800, fontSize:'16px', color:'#EDEDE9'}}>{m.label}</div>
                        <div style={{fontSize:'11px', opacity:0.5, marginTop:'4px', lineHeight:'1.3'}}>{m.description.slice(0,70)}</div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          <div style={{background:'#0E0E10', border:'1px solid #1A1A1E', borderRadius:'24px', padding:'28px', height:'fit-content'}}>
            <div style={{fontWeight:800, fontSize:'14px'}}>LOGIN WITH MAIL</div>
            <div style={{fontSize:'12px', opacity:0.5, marginTop:'8px', lineHeight:'1.4'}}>Magic link. No password. Your trials and Pro plan are tied to this mail.</div>
            
            {!sent ? (
              <div style={{marginTop:'20px'}}>
                <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="feffe@fred.io" style={{width:'100%', background:'#070708', border:'1px solid #1F1F23', borderRadius:'12px', padding:'14px 16px', color:'white', outline:'none', fontSize:'14px'}} />
                <button onClick={login} disabled={loading} style={{width:'100%', marginTop:'12px', background:'#BFFF00', color:'black', fontWeight:900, border:'none', borderRadius:'12px', padding:'14px', cursor:'pointer', fontSize:'14px'}}>
                  {loading ? 'SENDING...' : 'SEND MAGIC LINK ->'}
                </button>
                <div style={{marginTop:'12px', fontSize:'10px', opacity:0.3, textAlign:'center'}}>Trial: 5 free analyses • Pro: 50/month</div>
              </div>
            ) : (
              <div style={{marginTop:'20px', background:'#BFFF00', color:'black', borderRadius:'12px', padding:'16px', fontWeight:700, fontSize:'13px'}}>Check {email} – link sent!</div>
            )}

            <div style={{marginTop:'24px', borderTop:'1px solid #1A1A1E', paddingTop:'16px'}}>
              <div style={{fontSize:'10px', fontWeight:800, opacity:0.3}}>ARCHITECTURE</div>
              <div style={{marginTop:'10px', fontSize:'11px', lineHeight:'1.6', opacity:0.5}}>
                Layer 1 – Deterministic Engine (math, no AI)<br/>
                Layer 2 – AI Intelligence (Claude explains, never calculates)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
