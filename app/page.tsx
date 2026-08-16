"use client";
import { useState } from "react";
export default function Page(){
  const [s,setS]=useState(false);
  return <div style={{background:'#F6F5F0',minHeight:'100vh',padding:'40px'}}><h1 style={{fontSize:'50px',fontWeight:900}}>FRED FUNKAR</h1><button onClick={()=>setS(true)} style={{border:'2px solid black',padding:'10px 20px',borderRadius:'999px',background:'white',marginTop:'20px'}}>Log in test</button>{s && <div style={{marginTop:'20px',background:'white',border:'2px solid black',padding:'20px'}}>Login rutan</div>}</div>
}