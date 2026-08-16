'use client'
export default function PlatformShell({children}:{children:React.ReactNode}){
  return <div className="min-h-screen bg-[#0a0a0a] text-white"><header className="border-b border-white/10 p-4 flex justify-between"><span className="font-bold">FRED PLATFORM</span><span className="opacity-60 text-sm">gatekeeper active</span></header><main className="max-w- mx-auto p-6">{children}</main></div>
}
