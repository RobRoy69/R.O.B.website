import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { status } from './lib/status.mjs';
import { datumLabel } from './lib/datum.mjs';

const ROOT=path.resolve(import.meta.dirname,'..');
const OUT=path.join(ROOT,'publiek','bewijs','claim');
const reg=JSON.parse(readFileSync(path.join(ROOT,'whitepapers','_register.json'),'utf8')).claims;
const rel=JSON.parse(readFileSync(path.join(ROOT,'whitepapers','_publication-claims.json'),'utf8')).publicaties;
const claims=new Map(reg.map(c=>[c.ext_ref,c]));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let count=0;
for(const ref of [...new Set(rel.flatMap(p=>p.claim_refs||[]))]){const c=claims.get(ref);if(!c)throw new Error(`build-claimpaspoorten: ${ref} ontbreekt`);const slug=ref.replace(/^claim:/,'').replaceAll(':','-');const dir=path.join(OUT,slug);mkdirSync(dir,{recursive:true});const used=rel.filter(p=>p.claim_refs.includes(ref));const s=status(c);const canonical=`https://rob-concepting.com/bewijs/claim/${slug}/`;writeFileSync(path.join(dir,'index.html'),`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Claimpaspoort ${esc(ref)} — R.O.B.</title><meta name="description" content="Controleerbare bewijskaart voor ${esc(ref)}"><link rel="canonical" href="${canonical}"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'CreativeWork','identifier':ref,'text':c.text,'dateModified':c.nagetrokken_op,'citation':c.bron_url||c.bron_naam,'mainEntityOfPage':canonical})}</script><style>body{margin:0;background:#e8e4dc;color:#001a4d;font:17px/1.65 Arial,sans-serif}main{max-width:760px;margin:auto;padding:50px 24px}.card{background:#f4f2ed;padding:28px;border-left:3px solid #0fa8cb}dt{font-weight:700;margin-top:18px}dd{margin-left:0}a{color:#087f9c}</style></head><body><main><p><a href="/bewijs/">← Het bewijs</a></p><h1>Claimpaspoort</h1><div class="card"><dl><dt>ID</dt><dd>${esc(ref)}</dd><dt>Bewering</dt><dd>${esc(c.text)}</dd><dt>Status</dt><dd>${esc(s?.woord||'Theoretische grondslag')} — ${esc(s?.uitleg||'niet tijdgebonden')}</dd><dt>Vastgesteld</dt><dd>${esc(datumLabel(c.dated,c.dated_precisie,c.dated_soort))}</dd><dt>Bron</dt><dd>${c.bron_url?`<a href="${esc(c.bron_url)}" rel="noopener noreferrer">${esc(c.bron_naam)}</a>`:esc(c.bron_naam)}</dd><dt>Gebruikt in</dt><dd>${used.map(p=>`<a href="${esc(p.url)}">${esc(p.url)}</a>`).join('<br>')}</dd></dl></div></main></body></html>`);count++}
console.log(`build-claimpaspoorten: ${count} paspoorten gegenereerd`);
