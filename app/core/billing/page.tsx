export default function BillingPage(){
  return (
    <div>
      <h1 style={{fontSize:"28px", fontWeight:800}}>Billing</h1>
      <p style={{color:"#9F9FA9", marginTop:"8px"}}>Hantera abonnemang och betalning.</p>
      <div style={{marginTop:"24px", background:"#111115", border:"1px solid #1F1F23", borderRadius:"16px", padding:"24px"}}>
        <p style={{color:"white"}}>Ingen aktiv plan – Stripe kopplas har.</p>
      </div>
    </div>
  )
}
