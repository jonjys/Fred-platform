const items=["Terms & Conditions","Privacy Policy","Subscription Terms","Refund policy","My Account","Support Center"];
export default function SettingsPage(){
  return (
    <div>
      <h1 style={{fontSize:"28px", fontWeight:800}}>Installningar</h1>
      <div style={{marginTop:"24px", background:"#111115", border:"1px solid #1F1F23", borderRadius:"16px", overflow:"hidden"}}>
        {items.map(i=> <div key={i} style={{padding:"16px 20px", borderBottom:"1px solid #1F1F23", color:"white"}}>{i}</div>)}
      </div>
    </div>
  )
}
