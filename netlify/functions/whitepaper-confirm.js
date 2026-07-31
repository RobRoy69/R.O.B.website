// R.O.B. Concepting — whitepaper-aanvraag, stap 2 van 2 (double opt-in).
//
// Wordt geopend via de link uit de bevestigingsmail. Controleert het token,
// mailt de PDF naar het bevestigde adres en stuurt Rob de — nu geverifieerde — lead.
// Geeft een HTML-pagina terug, want dit wordt in een browser geopend.
//
// Bereikbaar via /whitepapers/bevestig?t=<token> (redirect in netlify.toml).

import { SITE, getPaper, mailFrom, mailToRob, sendMail, escapeHtml } from './lib/papers.js';
import { verifyToken } from './lib/token.js';

// ── Pagina-omhulsel in de huisstijl ──────────────────────────────────────────
function page({ status = 200, eyebrow, title, body, cta }) {
  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)} | R.O.B. Concepting</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%230e1525'/><circle cx='16' cy='16' r='12' fill='none' stroke='%230fa8cb' stroke-width='1.5'/><circle cx='16' cy='16' r='7' fill='none' stroke='%230fa8cb' stroke-width='1' opacity='.5'/><circle cx='16' cy='16' r='3' fill='%23e8391e'/></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',system-ui,sans-serif;background:#0e1525;color:#fff;
       min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px;line-height:1.7}
  .card{max-width:560px;width:100%;position:relative}
  .rings{position:absolute;right:-90px;top:-70px;width:320px;height:320px;opacity:.4;pointer-events:none}
  .inner{position:relative;z-index:2}
  .mark{display:flex;align-items:center;gap:11px;margin-bottom:34px;text-decoration:none}
  .mark span{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.16em;
             text-transform:uppercase;color:#fff}
  .mark span b{color:#0fa8cb;font-weight:400}
  .eyebrow{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.22em;
           text-transform:uppercase;color:#0fa8cb;margin-bottom:16px}
  h1{font-size:clamp(27px,5vw,37px);line-height:1.14;font-weight:400;letter-spacing:-.02em;margin-bottom:12px}
  h1 b{font-weight:600}
  .bar{width:44px;height:2px;background:#e8391e;margin:20px 0 24px}
  p{font-size:16.5px;color:rgba(255,255,255,.74);margin-bottom:16px}
  p.fine{font-size:13.5px;color:rgba(255,255,255,.44)}
  a.cta{display:inline-block;margin-top:12px;border:1px solid #0fa8cb;color:#0fa8cb;
        text-decoration:none;padding:12px 22px;font-family:'IBM Plex Mono',monospace;
        font-size:12px;letter-spacing:.12em;text-transform:uppercase;transition:background .2s,color .2s}
  a.cta:hover{background:#0fa8cb;color:#0e1525}
  a.inline{color:#0fa8cb}
</style>
</head>
<body>
  <div class="card">
    <svg class="rings" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill="none" stroke="#0fa8cb" stroke-width=".4" opacity=".35"/>
      <circle cx="100" cy="100" r="66" fill="none" stroke="#0fa8cb" stroke-width=".4" opacity=".28"/>
      <circle cx="100" cy="100" r="40" fill="none" stroke="#0fa8cb" stroke-width=".4" opacity=".2"/>
    </svg>
    <div class="inner">
      <a class="mark" href="${SITE}/">
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="12" fill="none" stroke="#0fa8cb" stroke-width="1.5"/>
          <circle cx="16" cy="16" r="7" fill="none" stroke="#0fa8cb" stroke-width="1" opacity=".5"/>
          <circle cx="16" cy="16" r="3" fill="#e8391e"/>
        </svg>
        <span>R.O.B. <b>Concepting</b></span>
      </a>
      <div class="eyebrow">${escapeHtml(eyebrow)}</div>
      <h1>${title}</h1>
      <div class="bar"></div>
      ${body}
      ${cta || ''}
    </div>
  </div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────
// Storing in de LEVERING melden. Bewust via mail en niet alleen via console.error: een
// logregel die niemand leest is geen meting, en dat is vandaag al twee keer gebleken
// (het chat-archief dat twee maanden op timing dreef, en deze levering die pas opviel
// doordat Rob een mail opende). Bevat geen bezoekersgegevens — alleen wat er misging.
async function meldLeveringsstoring(resendKey, paper, reden) {
  if (!resendKey) { console.error('[levering] geen RESEND_API_KEY — storing blijft onopgemerkt'); return; }
  const tijd = new Date().toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'short'
  });
  try {
    await sendMail(resendKey, {
      from: mailFrom(),
      to: [mailToRob()],
      subject: 'R.O.B. — whitepaper-levering geblokkeerd',
      text: `Een bevestigde whitepaper-aanvraag is NIET geleverd.\n\n`
          + `Tijd: ${tijd}\nWhitepaper: ${paper.title}\nVerwacht bestand: ${paper.file}\nReden: ${reden}\n\n`
          + `De bezoeker heeft zijn adres wel bevestigd en ziet een bericht dat jij hem persoonlijk stuurt.\n`
          + `Gegevens van die persoon staan in de gewone lead-mail, niet hier.\n\n`
          + `Waar te kijken: whitepapers/bestand/ in de publicatie, en de PAPERS-tabel in `
          + `netlify/functions/lib/papers.js.`
    });
  } catch (e) {
    console.error('[levering] storingsmail zelf mislukt:', e.message);
  }
}

export default async (req) => {
  const url   = new URL(req.url);
  const token = url.searchParams.get('t');

  const backToOverview = `<a class="cta" href="${SITE}/whitepapers/">Naar de whitepapers &rarr;</a>`;

  if (!token) {
    return page({
      status: 400,
      eyebrow: 'Bevestiging',
      title: 'Deze link is <b>niet compleet</b>',
      body: `<p>Er ontbreekt een stukje van de link. Open hem nog eens rechtstreeks uit de bevestigingsmail, of vraag de whitepaper opnieuw aan.</p>`,
      cta: backToOverview
    });
  }

  const check = verifyToken(token);

  if (!check.ok && check.reason === 'expired') {
    return page({
      status: 410,
      eyebrow: 'Bevestiging',
      title: 'Deze link is <b>verlopen</b>',
      body: `<p>Een bevestigingslink werkt zeven dagen. Vraag de whitepaper opnieuw aan, dan stuur ik je een nieuwe.</p>`,
      cta: backToOverview
    });
  }
  if (!check.ok) {
    return page({
      status: 400,
      eyebrow: 'Bevestiging',
      title: 'Deze link werkt <b>niet</b>',
      body: `<p>De link is onvolledig of niet meer geldig. Open hem rechtstreeks uit de bevestigingsmail, of vraag de whitepaper opnieuw aan.</p>`,
      cta: backToOverview
    });
  }

  const paper = getPaper(check.slug);
  if (!paper) {
    return page({
      status: 404,
      eyebrow: 'Bevestiging',
      title: 'Deze whitepaper is <b>niet gevonden</b>',
      body: `<p>De aangevraagde whitepaper bestaat niet meer onder deze naam.</p>`,
      cta: backToOverview
    });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const pdfUrl    = `${SITE}/whitepapers/bestand/${paper.file}`;
  const pageUrl   = `${SITE}${paper.page}`;

  // Mailservice onbeschikbaar: geef de download alsnog, want het adres is bevestigd.
  if (!resendKey) {
    return page({
      status: 200,
      eyebrow: 'Bevestigd',
      title: 'Dank &mdash; <b>hier is je whitepaper</b>',
      body: `<p>De mail kon ik zojuist niet versturen, maar je bevestiging is binnen. Download hem direct:</p>`,
      cta: `<a class="cta" href="${pdfUrl}">Download de PDF &rarr;</a>`
    });
  }

  const firstName = (check.name || '').split(/\s+/)[0] || 'daar';

  const text = `Hallo ${firstName},

Bevestigd — hier is de whitepaper:

${paper.title}

Downloaden (PDF):
${pdfUrl}

Online lezen kan ook:
${pageUrl}

Ik hoor het graag als er iets in blijft haken — een reactie op deze mail komt gewoon bij me aan.

Met vriendelijke groet,
Rob de Rooij
R.O.B. Concepting
${SITE}`;

  const html = `<!DOCTYPE html><html lang="nl"><body style="margin:0;padding:0;background:#e8e4dc;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#001a4d;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#0e1525;padding:26px 28px;">
      <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#0fa8cb;margin-bottom:10px;">R.O.B. Concepting</div>
      <div style="font-size:21px;color:#ffffff;line-height:1.3;">${escapeHtml(paper.title)}</div>
    </div>
    <div style="background:#f4f1ec;padding:30px 28px;border:1px solid rgba(0,26,77,.12);border-top:0;">
      <p style="margin:0 0 18px;font-size:16px;line-height:1.65;">Hallo ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.65;">Bevestigd — hier is de whitepaper. Veel leesplezier.</p>
      <p style="margin:0 0 24px;">
        <a href="${pdfUrl}" style="display:inline-block;background:#0fa8cb;color:#0e1525;text-decoration:none;padding:13px 24px;font-size:14px;font-weight:600;letter-spacing:.03em;">Download de PDF &rarr;</a>
      </p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#7a6e85;">
        Liever online lezen? Dat kan <a href="${pageUrl}" style="color:#0fa8cb;">op de site</a>.
      </p>
      <p style="margin:0 0 6px;font-size:16px;line-height:1.65;">Ik hoor het graag als er iets in blijft haken — een reactie op deze mail komt gewoon bij me aan.</p>
      <p style="margin:22px 0 0;font-size:16px;line-height:1.65;">Met vriendelijke groet,<br>Rob de Rooij</p>
      <p style="margin:22px 0 0;padding-top:18px;border-top:1px solid rgba(0,26,77,.08);font-size:12px;color:#7a6e85;">
        R.O.B. Concepting &middot; <a href="${SITE}" style="color:#7a6e85;">rob-concepting.com</a><br>
        Je gegevens gebruik ik alleen om je deze whitepaper te sturen. Geen nieuwsbrief, geen doorverkoop.
      </p>
    </div>
  </div>
</body></html>`;

  // ── Meting VÓÓR de aflevering ───────────────────────────────────────────────
  // Op 2026-07-27 kreeg Rob de verkeerde PDF toegestuurd: paper 04 vroeg aan onder de slug
  // van paper 03, omdat de downloadsectie letterlijk was overgenomen. Niets ving dat — de
  // hele buildketen dekte de publicatie en niets dekte wat er per mail uitging. Hij
  // ontdekte het door de mail te openen.
  //
  // De buildpoort vangt die kopieerfout nu, maar dat is een controle op de bron. Hier
  // staat de controle op de AFLEVERING: bestaat het bestand waarnaar we een bezoeker
  // sturen werkelijk? Een mail met een dode link is erger dan geen mail, want de bezoeker
  // heeft dan wél zijn adres afgegeven.
  //
  // Onderscheid tussen "bewezen weg" en "kon niet kijken": een harde 404 blokkeert de
  // verzending, een netwerkfout niet. Een legitieme aflevering weigeren omdat onze eigen
  // controle hapert, zou de bezoeker straffen voor onze storing.
  let bestandStatus = 'ongecontroleerd';
  try {
    const head = await fetch(pdfUrl, { method: 'HEAD' });
    bestandStatus = String(head.status);
    if (head.status === 404) {
      console.error(`[levering] GEBLOKKEERD — ${paper.file} bestaat niet op ${pdfUrl}`);
      await meldLeveringsstoring(resendKey, paper, `het bestand ${paper.file} geeft 404 — er is GEEN mail verstuurd`);
      return page({
        status: 200,
        eyebrow: 'Bevestigd',
        title: 'Dank &mdash; <b>je adres is bevestigd</b>',
        body: `<p>Bij het klaarzetten van het bestand ging iets mis aan onze kant. Rob heeft hier bericht van gekregen en stuurt je de whitepaper persoonlijk toe.</p>
               <p class="fine">Excuses voor het ongemak &mdash; je hoeft verder niets te doen.</p>`,
        cta: backToOverview
      });
    }
  } catch (e) {
    // Niet kunnen kijken is geen bewijs van afwezigheid. Wel melden.
    console.error(`[levering] kon ${paper.file} niet controleren: ${e.message}`);
  }

  let mailed = true;
  try {
    await sendMail(resendKey, {
      from: mailFrom(),
      to: [check.email],
      subject: `Je whitepaper: ${paper.title}`,
      text,
      html,
      reply_to: mailToRob()
    });
    // Positief spoor: WELK bestand is verstuurd, onder welke slug. Zonder dit is een
    // verkeerde levering alleen te ontdekken door de mail te openen.
    console.log(`[levering] verstuurd — slug=${check.slug} bestand=${paper.file} status=${bestandStatus}`);
  } catch (err) {
    console.error('[whitepaper-confirm] PDF-mail mislukt:', err.message);
    mailed = false;
  }

  // Lead naar Rob — nu mét bevestigd adres (fire-and-forget).
  const stamp = new Date().toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'short'
  });
  sendMail(resendKey, {
    from: mailFrom(),
    to: [mailToRob()],
    subject: `Whitepaper-aanvraag (bevestigd) — ${check.name || check.email}`,
    text: `Bevestigde whitepaper-aanvraag via ${SITE}

Naam: ${check.name || '(niet opgegeven)'}
E-mail: ${check.email}   <- bevestigd via de opt-in-link
Whitepaper: ${paper.title}
Bestand: ${paper.file}   <- controleer of dit bij bovenstaande titel hoort
Aangevraagd onder: ${check.slug}
Bevestigd op: ${stamp}

De PDF is ${mailed ? 'naar deze persoon gestuurd' : 'NIET verstuurd — de mail faalde; volg dit handmatig op'}.`,
    reply_to: check.email
  }).catch(e => console.error('[whitepaper-confirm] lead-notify mislukt:', e.message));

  return page({
    status: 200,
    eyebrow: 'Bevestigd',
    title: mailed ? 'Dank &mdash; <b>hij is onderweg</b>' : 'Dank &mdash; <b>hier is je whitepaper</b>',
    body: mailed
      ? `<p><strong style="color:#fff;font-weight:500;">${escapeHtml(paper.title)}</strong> staat binnen een minuut in je inbox, met de PDF erbij.</p>
         <p class="fine">Komt hij niet aan? Kijk even in je spam-map — of download hem hier direct.</p>`
      : `<p>Je bevestiging is binnen, maar de mail kon ik zojuist niet versturen. Download hem hier direct:</p>`,
    cta: `<a class="cta" href="${pdfUrl}">Download de PDF &rarr;</a>`
  });
};
