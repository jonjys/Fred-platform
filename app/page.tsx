"use client";
import { useState } from "react";

export default function Page(){
  const [showLogin, setShowLogin] = useState(false);
  const [envText, setEnvText] = useState("");
  const [parsed, setParsed] = useState<any>(null);

  function handleImport(){
    const lines = envText.split('\n').filter(l=>l.includes('='));
    const keys = lines.map(l=>l.split('=')[0].trim());
    setParsed({count: keys.length, keys});
  }

  return (
    <div style={{minHeight:'100vh', background:'#F6F5F0'}}>
      {/* HEADER */}
      <header style={{display:'flex', justifyContent:'space-between', padding:'24px 32px', borderBottom:'2px solid #111', position:'sticky', top:0, background:'#F6F5F0', zIndex:10}}>
        <div style={{fontWeight:900, fontSize:'20px', letterSpacing:'-1px'}}>FRED-PLATFORM<span style={{background:'#BFFF00', padding:'2px 6px', marginLeft:'8px'}}>BETA</span></div>
        <div style={{display:'flex', gap:'12px'}}>
          <button onClick={()=>setShowLogin(true)} style={{border:'2px solid #111', padding:'8px 18px', borderRadius:'999px', fontWeight:700, background:'white'}}>Log in</button>
          <button style={{background:'#111', color:'white', padding:'8px 18px', borderRadius:'999px', fontWeight:700}}>Start free</button>
        </div>
      </header>

      {/* HERO */}
      <section style={{padding:'80px 32px', display:'grid', gridTemplateColumns:'1.2fr 0.8fr', gap:'32px', maxWidth:'1280px', margin:'0 auto'}}>
        <div>
          <h1 style={{fontSize:'72px', fontWeight:900, lineHeight:0.9, letterSpacing:'-4px'}}>Your <span style={{background:'#BFFF00', padding:'0 12px', borderRadius:'12px', transform:'rotate(-2deg)', display:'inline-block'}}>.env </span><br/>file is a<br/>liability.</h1>
          <p style={{fontSize:'20px', marginTop:'24px', maxWidth:'480px', lineHeight:1.4, opacity:0.7}}>Keys never leave your machine. We take 2% when you call APIs. No subscriptions. No vault in the cloud.</p>
          <div style={{marginTop:'32px', display:'flex', gap:'12px'}}>
            <div style={{background:'#111', color:'#BFFF00', padding:'14px 28px', borderRadius:'999px', fontWeight:900, fontSize:'18px'}}>▲ Import.env — TEST</div>
            <div style={{border:'2px solid #111', padding:'14px 24px', borderRadius:'999px', fontWeight:700}}>How it works ↓</div>
          </div>
        </div>

        {/* IMPORT BOX */}
        <div style={{background:'white', border:'2px solid #111', borderRadius:'24px', padding:'20px', boxShadow:'8px 8px 0 #111'}}>
          <div style={{fontWeight:800, fontSize:'13px', letterSpacing:'1px', marginBottom:'12px'}}>PASTE.ENV HERE (LOCAL ONLY)</div>
          <textarea value={envText} onChange={e=>setEnvText(e.target.value)} placeholder={"STRIPE_KEY=sk_live_...\nOPENAI_KEY=sk-...\nSUPABASE_URL=..."} style={{width:'100%', height:'180px', background:'#F6F5F0', border:'2px solid #111', borderRadius:'16px', padding:'16px', fontFamily:'monospace', fontSize:'13px'}} />
          <button onClick={handleImport} style={{marginTop:'12px', width:'100%', background:'#7A5CFA', color:'white', padding:'14px', borderRadius:'14px', fontWeight:900, border:'2px solid #111', fontSize:'16px'}}>→ Parse {envText? `(${envText.split('\n').filter(l=>l.includes('=')).length} keys)` : ''}</button>
          {parsed && <div style={{marginTop:'12px', background:'#BFFF00', border:'2px solid #111', borderRadius:'12px', padding:'12px', fontFamily:'monospace', fontSize:'12px'}}>{parsed.keys.map((k:string)=><div key={k}>✓ {k} → vault.sealed</div>)}<div style={{marginTop:'8px', fontWeight:900}}>{parsed.count} keys secured locally</div></div>}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'2px', background:'#111', borderTop:'2px solid #111', borderBottom:'2px solid #111'}}>
        {[
          {bg:'#BFFF00', title:'Zero egress', desc:'Your keys are encrypted with WebCrypto in browser. We never see them.'},
          {bg:'#7A5CFA', title:'2% take rate', desc:'We meter your API calls client-side. You keep 98%.', color:'white'},
          {bg:'#FF3B30', title:'Instant revoke', desc:'One click to rotate. Vault stays local, never synced.', color:'white'}
        ].map(f=><div key={f.title} style={{background:f.bg, padding:'32px', color:f.color||'#111'}}><div style={{fontWeight:900, fontSize:'22px'}}>{f.title}</div><div style={{marginTop:'8px', opacity:0.8}}>{f.desc}</div></div>)}
      </section>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50}}>
          <div style={{background:'white', border:'3px solid #111', borderRadius:'24px', padding:'32px', width:'360px', boxShadow:'12px 12px 0 #111'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><h2 style={{fontWeight:900, fontSize:'24px'}}>Welcome back</h2><button onClick={()=>setShowLogin(false)} style={{fontWeight:900}}>✕</button></div>
            <input placeholder="Email" style={{marginTop:'20px', width:'100%', border:'2px solid #111', borderRadius:'12px', padding:'12px'}}/>
            <input placeholder="Password" type="password" style={{marginTop:'12px', width:'100%', border:'2px solid #111', borderRadius:'12px', padding:'12px'}}/>
            <button style={{marginTop:'16px', width:'100%', background:'#111', color:'white', padding:'12px', borderRadius:'12px', fontWeight:800}}>Log in →</button>
            <div style={{marginTop:'12px', fontSize:'12px', opacity:0.6, textAlign:'center'}}>Supabase auth är kopplad när du lagt till.env.local</div>
          </div>
        </div>
      )}

      <footer style={{padding:'24px 32px', display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight:700, letterSpacing:'1px', opacity:0.5}}><span>© FRED-PLATFORM 2026</span><span>KEYS NEVER LEAVE</span></footer>
    </div>
  );
}