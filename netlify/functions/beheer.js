// R.O.B. Concepting — schrijven en vrijgeven van berichten, zonder terminal.
//
// WAT DIT VERVANGT. Tot nu toe liep publiceren zo: een markdown-bestand in een map die je
// moet kennen, `npm run bericht`, `npm run review`, en een service-role-sleutel op je eigen
// machine. Dat werkt zolang Rob het zelf doet. Het is niet over te dragen — geen klant draait
// npm-commando's met een sleutel die het hele register mag herschrijven.
//
// Hier blijft die sleutel server-side. De browser stuurt een verzoek; deze functie beslist.
//
// DE ZORG VAN 27 JULI, EXPLICIET GEADRESSEERD. Een schrijfoppervlak in de browser is toen
// afgewezen omdat de previewomgeving klikken registreerde die niemand gaf — en dat is het
// laatste wat je bij een reviewpoort wilt. Drie dingen volgen daaruit:
//   · vrijgeven vraagt de slug nogmaals als bevestiging; een enkele klik doet het niet;
//   · vrijgeven staat los van bewaren, zodat schrijven nooit per ongeluk publiceert;
//   · elke vrijgave laat een regel achter in transformations, met wie en wanneer.
// De poort is daarmee niet zachter geworden dan hij was, alleen bereikbaar zonder terminal.
//
// WAT DEZE FUNCTIE NIET DOET. Beweringen goedkeuren. Dat blijft `npm run review`: een claim
// vrijgeven raakt de bewijslaag en verdient een aparte, tragere handeling.

import { SOORTEN } from '../../tools/lib/reeks.mjs';
import { PAPERS, json, makeRateLimiter, clientIp } from './lib/papers.js';
import {
  wachtwoordGezet, wachtwoordKlopt, maakSessie, sessieGeldig,
  leesCookie, zetCookie, COOKIE, SESSIE_MS, waaromDicht,
} from './lib/beheer-sessie.js';

const VELDEN = 'ext_ref,slug,titel,samenvatting,tekst,claim_refs,review_status,soort,reeks,' +
               'volgnummer,hoort_bij,afbeelding,afbeelding_alt,video,gepubliceerd_op,updated_at';

// Fout raden mag, maar niet snel en niet vaak. Vijf pogingen per tien minuten per IP.
const remmen = makeRateLimiter({ windowMs: 10 * 60_000, max: 5 });

const db = async (pad, opties = {}) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('register niet bereikbaar');
  const res = await fetch(`${url}/rest/v1/${pad}`, {
    ...opties,
    headers: { apikey: key, Authorization: `Bearer ${key}`,
               'Content-Type': 'application/json', Prefer: 'return=representation',
               ...(opties.headers || {}) },
  });
  if (!res.ok) throw new Error(`register gaf ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
};

/** Dezelfde controles als de schrijfstap in de terminal. Eén set regels, twee ingangen. */
function keur(b, bezet) {
  const f = [];
  const tekst = (v) => String(v ?? '').trim();

  if (!tekst(b.titel)) f.push('titel ontbreekt');
  if (!tekst(b.samenvatting)) f.push('samenvatting ontbreekt');
  if (!tekst(b.tekst)) f.push('tekst ontbreekt');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(tekst(b.slug))) {
    f.push('slug mag alleen kleine letters, cijfers en koppeltekens bevatten');
  }
  if (!SOORTEN.includes(tekst(b.soort) || 'nieuws')) {
    f.push(`onbekende soort — kies uit ${SOORTEN.join(', ')}`);
  }

  const reeks = tekst(b.reeks) || null;
  const nr = tekst(b.volgnummer);
  if (nr && !/^[1-9]\d*$/.test(nr)) f.push('volgnummer is geen geheel getal vanaf 1');
  const volgnummer = nr ? Number(nr) : null;
  if (!!reeks !== !!volgnummer) f.push('reeks en volgnummer horen bij elkaar — allebei of geen van beide');
  if (reeks && volgnummer) {
    const al = bezet.get(`${reeks}#${volgnummer}`);
    if (al && al !== tekst(b.slug)) f.push(`deel ${volgnummer} van "${reeks}" is al ${al}`);
  }

  const hoortBij = tekst(b.hoort_bij) || null;
  if (hoortBij && !PAPERS[hoortBij]) {
    f.push(`hoort_bij "${hoortBij}" is geen bestaand whitepaper`);
  }

  // Alt is verplicht zodra er een afbeelding is — de database weigert het anders, maar een
  // leesbare reden is beter dan een constraint-fout.
  if (tekst(b.afbeelding) && tekst(b.afbeelding_alt).length < 10) {
    f.push('een afbeelding zonder bruikbare alt is onbruikbaar voor wie hem niet ziet');
  }

  return { fouten: f, waarde: {
    slug: tekst(b.slug), titel: tekst(b.titel), samenvatting: tekst(b.samenvatting),
    tekst: String(b.tekst ?? '').trimEnd(),
    claim_refs: tekst(b.claim_refs),
    soort: tekst(b.soort) || 'nieuws', reeks, volgnummer, hoort_bij: hoortBij,
    afbeelding: tekst(b.afbeelding) || null,
    afbeelding_alt: tekst(b.afbeelding_alt) || null,
    video: tekst(b.video) || null,
    gepubliceerd_op: tekst(b.gepubliceerd_op) || new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  } };
}

// Goedkeuren zonder bouwen publiceert niets: het register verandert, de site niet. Dat gat
// heeft één post een halve dag onzichtbaar gehouden. De haak sluit het.
async function bouwAanvragen() {
  const haak = process.env.NETLIFY_BUILD_HOOK;
  if (!haak) return { gestart: false, reden: 'NETLIFY_BUILD_HOOK niet gezet' };
  try {
    const res = await fetch(haak, { method: 'POST', body: '{}' });
    return { gestart: res.ok, reden: res.ok ? '' : `bouwhaak gaf ${res.status}` };
  } catch (e) {
    return { gestart: false, reden: `bouwhaak onbereikbaar (${e.message})` };
  }
}

export default async (req) => {
  const origin = req.headers.get('origin') || '';
  if (req.method !== 'POST') return json({ fout: 'alleen POST' }, 405, origin);

  let body;
  try { body = await req.json(); } catch { return json({ fout: 'geen geldige invoer' }, 400, origin); }
  const actie = String(body.actie || '');

  // ── aanmelden ──
  if (actie === 'aanmelden') {
    if (!wachtwoordGezet()) {
      return json({ fout: `Het beheerscherm is niet ingericht. ${waaromDicht()}` }, 503, origin);
    }
    // .ok uitlezen, niet de terugkeerwaarde zelf. makeRateLimiter geeft een OBJECT terug
    // ({ ok, retryAfter }) en een object is altijd waar — `if (!remmen(ip))` was dus nooit
    // waar en de rem stond in werkelijkheid uit. Op een aanmeldpunt betekent dat: onbeperkt
    // wachtwoorden raden, precies het ene ding dat deze functie moet tegenhouden.
    // whitepaper.js deed het al goed; dit was een fout in de navolging, en hij was onzichtbaar
    // omdat de rem er wél stond.
    const rem = remmen(clientIp(req));
    if (!rem.ok) {
      const minuten = Math.max(1, Math.ceil((rem.retryAfter || 600) / 60));
      return new Response(JSON.stringify({ fout: `Te veel pogingen. Probeer het over ${minuten} minuten opnieuw.` }),
        { status: 429, headers: { 'Content-Type': 'application/json',
                                  'Retry-After': String(rem.retryAfter || 600) } });
    }
    if (!wachtwoordKlopt(body.wachtwoord)) {
      return json({ fout: 'Wachtwoord klopt niet.' }, 401, origin);
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json',
                 'Set-Cookie': zetCookie(maakSessie(), SESSIE_MS / 1000) },
    });
  }

  // ── vanaf hier: alleen met sessie ──
  if (!sessieGeldig(leesCookie(req.headers.get('cookie'), COOKIE))) {
    return json({ fout: 'niet aangemeld' }, 401, origin);
  }

  if (actie === 'afmelden') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': zetCookie('', 0) },
    });
  }

  try {
    if (actie === 'lijst') {
      const rijen = await db(`berichten?select=${VELDEN}&order=gepubliceerd_op.desc`);
      return json({ berichten: rijen, soorten: SOORTEN, papers: Object.keys(PAPERS) }, 200, origin);
    }

    if (actie === 'bewaren') {
      const bestaand = await db('berichten?select=ext_ref,slug,review_status,reeks,volgnummer');
      const bezet = new Map(bestaand.filter(b => b.reeks && b.volgnummer)
        .map(b => [`${b.reeks}#${b.volgnummer}`, b.slug]));
      const { fouten, waarde } = keur(body.bericht || {}, bezet);

      // De beweringen waar dit bericht op rust moeten BESTAAN. bericht.mjs controleert dat al
      // sinds de eerste versie; deze ingang deed het niet. Gevolg van dat gat: een tikfout
      // wordt bewaard, het bericht wordt vrijgegeven, de bouw start netjes — en build-nieuws
      // slaat het bericht stil over omdat de bewering niet in de projectie zit. Dan staat er
      // een goedgekeurd bericht dat nooit verschijnt en niemand die weet waarom.
      const refs = (waarde.claim_refs || '').split(',').map(s => s.trim()).filter(Boolean);
      if (refs.length) {
        const bekend = new Set((await db('claims?select=ext_ref')).map(c => c.ext_ref));
        const onbekend = refs.filter(r => !bekend.has(r));
        if (onbekend.length) fouten.push(`onbekende bewering(en): ${onbekend.join(', ')}`);
      }
      if (fouten.length) return json({ fout: fouten.join(' · '), fouten }, 422, origin);

      // IDENTITEIT HANGT AAN ext_ref, NIET AAN DE SLUG. Zocht eerst op slug; wie bij het
      // bewerken de slug veranderde, kreeg daardoor een TWEEDE record en liet het origineel
      // onaangeroerd achter. De slug is een webadres en mag wijzigen; de sleutel niet.
      const ref = String((body.bericht || {}).ext_ref || '').trim();
      const al = ref ? bestaand.find(b => b.ext_ref === ref) : bestaand.find(b => b.slug === waarde.slug);

      // En de nieuwe slug mag niet van een ánder bericht zijn.
      const bezetteSlug = bestaand.find(b => b.slug === waarde.slug && (!al || b.ext_ref !== al.ext_ref));
      if (bezetteSlug) {
        return json({ fout: `Het webadres "${waarde.slug}" is al van ${bezetteSlug.ext_ref}.` }, 409, origin);
      }

      if (al && al.review_status === 'approved') {
        return json({ fout: 'Dit bericht is al vrijgegeven. Trek het eerst in als je het wilt wijzigen.' }, 409, origin);
      }
      if (al) {
        const [rij] = await db(`berichten?ext_ref=eq.${encodeURIComponent(al.ext_ref)}&select=${VELDEN}`,
          { method: 'PATCH', body: JSON.stringify(waarde) });
        return json({ bericht: rij, gedaan: 'bijgewerkt' }, 200, origin);
      }
      const volgnr = String(bestaand.length + 1).padStart(3, '0');
      const [rij] = await db('berichten', { method: 'POST',
        body: JSON.stringify({ ...waarde, ext_ref: `bericht:rob:${volgnr}`, review_status: 'needs-review' }) });
      return json({ bericht: rij, gedaan: 'toegevoegd' }, 200, origin);
    }

    if (actie === 'vrijgeven' || actie === 'intrekken') {
      const ref = String(body.ext_ref || '');
      const [rij] = await db(`berichten?ext_ref=eq.${encodeURIComponent(ref)}&select=ext_ref,slug,titel,review_status`);
      if (!rij) return json({ fout: 'bericht niet gevonden' }, 404, origin);

      // De bevestiging: de slug moet overgetypt zijn. Een preview die spookklikken
      // registreert komt hier niet doorheen, en een misklik ook niet.
      if (actie === 'vrijgeven' && String(body.bevestiging || '').trim() !== rij.slug) {
        return json({ fout: 'Typ de slug over om vrij te geven.' }, 428, origin);
      }

      const naar = actie === 'vrijgeven' ? 'approved' : 'needs-review';

      // STATUS EN JOURNAAL IN ÉÉN TRANSACTIE. Eerst waren dit twee losse schrijfacties: eerst
      // de status, dan het spoor. Faalde de tweede — een storing, een timeout — dan stond het
      // bericht al op approved zonder dat iemand kon zien wie het had vrijgegeven. Precies wat
      // deze lus belooft niet te doen.
      //
      // Het journaal zelf bestond trouwens niet: review_actions en transformations hangen
      // allebei aan claim_id (NOT NULL), dus voor beweringen was vastgelegd wie wat wanneer
      // vrijgaf en voor berichten niets. bericht_acties vult dat gat; deze functie schrijft
      // beide of geen van beide.
      await db('rpc/bericht_status_zetten', { method: 'POST', body: JSON.stringify({
        p_ref: ref, p_naar: naar,
        p_actie: actie === 'vrijgeven' ? 'vrijgegeven' : 'ingetrokken',
        p_actor: 'rob', p_via: 'beheerscherm', p_notitie: rij.titel,
      }) });

      // INTREKKEN VRAAGT ÓÓK EEN BOUW. Eerst sloeg dit over "want er hoeft niets bij" — maar
      // intrekken betekent dat er iets WEG moet, en zonder bouw blijft de pagina staan. Een
      // ingetrokken bericht dat online blijft is erger dan een dat nooit verscheen: het
      // register zegt dan iets anders dan de site, en dat is precies de toestand waar deze
      // hele onderneming tegen is.
      const bouw = await bouwAanvragen();
      return json({ ok: true, status: naar, bouw }, 200, origin);
    }

    return json({ fout: 'onbekende actie' }, 400, origin);
  } catch (e) {
    // Nooit de sleutel of de volledige registerfout naar de browser.
    console.error('[beheer]', e.message);
    return json({ fout: 'Het register gaf een fout. Kijk in de functielogs.' }, 502, origin);
  }
};
