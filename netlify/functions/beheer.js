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
  leesCookie, zetCookie, COOKIE, SESSIE_MS,
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
      return json({ fout: 'Het beheerscherm is niet ingericht: BEHEER_WACHTWOORD ontbreekt of is korter dan twaalf tekens.' }, 503, origin);
    }
    if (!remmen(clientIp(req))) {
      return json({ fout: 'Te veel pogingen. Probeer het over tien minuten opnieuw.' }, 429, origin);
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
      if (fouten.length) return json({ fout: fouten.join(' · '), fouten }, 422, origin);

      const al = bestaand.find(b => b.slug === waarde.slug);
      if (al && al.review_status === 'approved') {
        return json({ fout: 'Dit bericht is al vrijgegeven. Trek het eerst in als je het wilt wijzigen.' }, 409, origin);
      }
      if (al) {
        const [rij] = await db(`berichten?slug=eq.${encodeURIComponent(waarde.slug)}&select=${VELDEN}`,
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
      await db(`berichten?ext_ref=eq.${encodeURIComponent(ref)}`,
        { method: 'PATCH', body: JSON.stringify({ review_status: naar, updated_at: new Date().toISOString() }) });

      // Het journaal. review_actions en transformations hangen allebei aan claim_id (NOT
      // NULL): voor beweringen is vastgelegd wie wat wanneer vrijgaf, voor berichten was er
      // niets. Een bericht kon van needs-review naar approved zonder enig spoor — op een site
      // die van anderen eist dat correcties zichtbaar zijn. Daarvoor is bericht_acties
      // aangelegd, en deze regel vult hem.
      await db('bericht_acties', { method: 'POST', body: JSON.stringify({
        bericht_ref: ref,
        actie: actie === 'vrijgeven' ? 'vrijgegeven' : 'ingetrokken',
        van_status: rij.review_status, naar_status: naar,
        actor: 'rob', via: 'beheerscherm',
        notitie: rij.titel,
      }) });

      const bouw = naar === 'approved' ? await bouwAanvragen() : { gestart: false, reden: 'niet nodig' };
      return json({ ok: true, status: naar, bouw }, 200, origin);
    }

    return json({ fout: 'onbekende actie' }, 400, origin);
  } catch (e) {
    // Nooit de sleutel of de volledige registerfout naar de browser.
    console.error('[beheer]', e.message);
    return json({ fout: 'Het register gaf een fout. Kijk in de functielogs.' }, 502, origin);
  }
};
