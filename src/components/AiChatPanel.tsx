"use client";
import { useState, useRef, useEffect } from 'react';
interface Msg { role:'user'|'assistant'; content:string; }
interface Client { cui:string; denumire:string; }
interface Props { clients:Client[]; onClose:()=>void; initialCui?:string; }
const QA = [
  {l:'📋 Rezumă dosarul', p:'Rezumă pe scurt dosarul acestui client: date, documente, status.'},
  {l:'✅ Verifică completitudinea', p:'Verifică dacă dosarul este complet. Ce lipsește sau pare incomplet?'},
  {l:'📄 Analizează ofertele', p:'Analizează ofertele încărcate. Ce cumpără? Sunt clare și complete?'},
  {l:'⚠️ Probleme potențiale', p:'Identifică probleme sau riscuri în acest dosar.'},
];
export default function AiChatPanel({clients,onClose,initialCui}:Props) {
  const [cui,setCui] = useState(initialCui||'');
  const [msgs,setMsgs] = useState<Msg[]>([]);
  const [input,setInput] = useState('');
  const [loading,setLoading] = useState(false);
  const [ctxLoaded,setCtxLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[msgs]);
  useEffect(()=>{setMsgs([]);setCtxLoaded(false);},[cui]);
  const send = async(content:string) => {
    if(!content.trim()||loading) return;
    const nm=[...msgs,{role:'user' as const,content}];
    setMsgs(nm); setInput(''); setLoading(true); setCtxLoaded(true);
    try {
      const r=await fetch('/api/admin/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:nm,clientCui:cui||undefined})});
      const d=await r.json();
      setMsgs(p=>[...p,{role:'assistant',content:d.response||(d.error?'⚠️ '+d.error:'Eroare.')}]);
    } catch { setMsgs(p=>[...p,{role:'assistant',content:'⚠️ Eroare de rețea.'}]); }
    setLoading(false);
  };
  const sel = clients.find(c=>c.cui===cui);
  return (
    <div className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div><div className="font-bold text-sm">AI Admin Assistant</div><div className="text-xs text-indigo-200">Gemini 2.5 Flash</div></div>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors text-lg">✕</button>
      </div>
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <select value={cui} onChange={e=>setCui(e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">— Discuție generală (fără client) —</option>
          {clients.map(c=><option key={c.cui} value={c.cui}>{c.denumire} ({c.cui})</option>)}
        </select>
        {sel&&!ctxLoaded&&<p className="text-xs text-gray-500 mt-1">💡 Datele și documentele lui <b>{sel.denumire}</b> vor fi trimise la primul mesaj.</p>}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {msgs.length===0&&(
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🤖</div>
            <p className="text-gray-500 text-sm">{sel?`Client: ${sel.denumire}`:'Selectează un client sau scrie o întrebare generală.'}</p>
            {!sel&&<p className="text-gray-400 text-xs mt-2">Poți întreba despre toți clienții, statistici, proceduri etc.</p>}
          </div>
        )}
        {msgs.map((m,i)=>(
          <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${m.role==='user'?'bg-indigo-600 text-white rounded-br-none':'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
              {m.role==='assistant'&&<span className="mr-1">🤖</span>}{m.content}
            </div>
          </div>
        ))}
        {loading&&<div className="flex justify-start"><div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-2 text-sm text-gray-500"><span className="animate-pulse">🤖 Generez răspuns...</span></div></div>}
        <div ref={endRef}/>
      </div>
      {msgs.length===0&&cui&&(
        <div className="px-3 py-2 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400 mb-2 font-medium">Acțiuni rapide:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {QA.map((a,i)=><button key={i} onClick={()=>send(a.p)} disabled={loading} className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg px-2 py-2 text-left transition-colors disabled:opacity-50 font-medium">{a.l}</button>)}
          </div>
        </div>
      )}
      <div className="px-3 py-3 border-t border-gray-200 flex-shrink-0">
        <div className="flex gap-2">
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input);}}} placeholder={sel?`Întreabă despre ${sel.denumire}...`:'Scrie un mesaj...'} rows={2} className="flex-1 text-sm border border-gray-300 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" disabled={loading}/>
          <button onClick={()=>send(input)} disabled={loading||!input.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 flex items-center justify-center transition-colors disabled:opacity-40 text-lg">➤</button>
        </div>
        <p className="text-xs text-gray-400 mt-1 text-center">Enter = trimite · Shift+Enter = rând nou</p>
      </div>
    </div>
  );
}
