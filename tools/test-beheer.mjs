// R.O.B. Concepting — toetst het beheerscherm zonder het register aan te raken.
//
// AANLEIDING. Dit scherm mag schrijven in het register. Dat is precies wat op 27 juli werd
// afgewezen, en met reden: de previewomgeving registreerde toen klikken die niemand gaf. Een
// schrijfoppervlak dat dat doet, is het laatste wat je bij een reviewpoort wilt.
//
// Wat er sindsdien anders is, moet toetsbaar zijn en niet beweerd. Deze toets vuurt de
// sessielaag echt af en leest de gebouwde pagina na.
//
// Draai: node tools/test-beheer.mjs
// Exit 0 = groen, exit 1 = rood.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
let gezakt = 0;
const toets = (naam, goed, uitleg = '') => {
  console.log(`  ${goed ? '✓' : '✗'} ${naam}${goed ? '' : `  — ${uitleg}`}`);
  if (!goed) gezakt++;
};

const sessie = await import('../netlify/functions/lib/beheer-sessie.js');

console.log('\n1. zonder wachtwoord is het scherm dicht, niet open');
{
  delete process.env.BEHEER_WACHTWOORD;
  toets('geen env-var → niet ingericht', sessie.wachtwoordGezet() === false);
  toets('geen env-var → elk wachtwoord faalt', sessie.wachtwoordKlopt('') === false && sessie.wachtwoordKlopt('watdanook') === false);
  toets('geen env-var → geen sessie te maken', sessie.maakSessie() === null);
  toets('geen env-var → geen sessie geldig', sessie.sessieGeldig('van.alles') === false);
}

console.log('\n2. een te kort wachtwoord telt niet als ingericht');
{
  process.env.BEHEER_WACHTWOORD = 'kort';
  toets('elf tekens of minder → dicht', sessie.wachtwoordGezet() === false);
}

console.log('\n3. met wachtwoord: alleen het juiste komt binnen');
{
  process.env.BEHEER_WACHTWOORD = 'een-voldoende-lang-wachtwoord';
  toets('ingericht', sessie.wachtwoordGezet() === true);
  toets('juist wachtwoord klopt', sessie.wachtwoordKlopt('een-voldoende-lang-wachtwoord') === true);
  toets('fout wachtwoord klopt niet', sessie.wachtwoordKlopt('een-voldoende-lang-wachtwoor') === false);
  toets('leeg klopt niet', sessie.wachtwoordKlopt('') === false);
  toets('undefined klopt niet', sessie.wachtwoordKlopt(undefined) === false);
  // Een prefix mag niet slagen: dat zou betekenen dat de vergelijking op lengte stopt.
  toets('een prefix klopt niet', sessie.wachtwoordKlopt('een-voldoende') === false);
}

console.log('\n4. de sessie is ondertekend, niet geraden');
{
  const s = sessie.maakSessie();
  toets('sessie geldig', sessie.sessieGeldig(s) === true);
  toets('geknoeide handtekening faalt', sessie.sessieGeldig(s.slice(0, -3) + 'aaa') === false);
  toets('geknoeide inhoud faalt', sessie.sessieGeldig('eyJ0IjoxfQ.' + s.split('.')[1]) === false);
  toets('lege waarde faalt', sessie.sessieGeldig('') === false);
  toets('willekeurige tekst faalt', sessie.sessieGeldig('zomaar-iets') === false);

  // Ander wachtwoord = andere sleutel = oude sessies vervallen. Dat is de terugvalknop:
  // wachtwoord wijzigen sluit iedereen uit die nog een cookie had.
  process.env.BEHEER_WACHTWOORD = 'een-ander-voldoende-lang-woord';
  toets('sessie van het oude wachtwoord vervalt', sessie.sessieGeldig(s) === false);
}

console.log('\n5. het cookie geeft niets weg');
{
  process.env.BEHEER_WACHTWOORD = 'een-voldoende-lang-wachtwoord';
  const k = sessie.zetCookie(sessie.maakSessie(), 3600);
  toets('HttpOnly', /HttpOnly/.test(k));
  toets('Secure', /Secure/.test(k));
  toets('SameSite=Strict', /SameSite=Strict/.test(k));
  toets('het wachtwoord staat er niet in', !k.includes('een-voldoende-lang-wachtwoord'));
  const uit = sessie.leesCookie('anders=1; rob_beheer=abc.def; nog=2', 'rob_beheer');
  toets('cookie wordt goed uitgelezen', uit === 'abc.def', uit);
}

console.log('\n6. de pagina zelf draagt geen gezag en geen geheim');
{
  const p = path.join(ROOT, 'beheer', 'index.html');
  toets('de pagina bestaat', existsSync(p));
  const h = readFileSync(p, 'utf8');
  toets('noindex', /name=["']robots["'][^>]*noindex/i.test(h));
  toets('gebruikt de gedeelde merklaag', h.includes('/media/merk.css'));
  toets('gebruikt een goedgekeurd lockup', /\/media\/logo\/logo-rob-(?:lengte-)?(?:donker|wit)-transparant\.png/.test(h));
  toets('geen sleutel of token in de pagina',
        !/SUPABASE|SERVICE_ROLE|BEHEER_WACHTWOORD|apikey/i.test(h));
  toets('praat alleen met de eigen functie', !/fetch\(\s*['"`]https?:/i.test(h));

  const f = readFileSync(path.join(ROOT, 'netlify', 'functions', 'beheer.js'), 'utf8');
  toets('vrijgeven vraagt een bevestiging', /bevestiging/.test(f));
  toets('vrijgeven schrijft een journaalregel', /bericht_acties/.test(f));
  toets('bewaren zet nooit approved', !/review_status:\s*['"]approved['"]/.test(
        f.split("actie === 'vrijgeven'")[0]));
  toets('de foutmelding lekt de registerfout niet',
        /Kijk in de functielogs/.test(f) && !/e\.message\s*\}\)/.test(f.split('catch (e)').pop()));
}

console.log('\n8. de rem knijpt werkelijk af');
{
  const { makeRateLimiter } = await import('../netlify/functions/lib/papers.js');
  const rem = makeRateLimiter({ windowMs: 600_000, max: 5 });
  const uitslag = [];
  for (let i = 0; i < 7; i++) uitslag.push(rem('1.2.3.4').ok);
  toets('de eerste vijf komen door', uitslag.slice(0, 5).every(Boolean));
  toets('de zesde wordt geblokt', uitslag[5] === false);

  // De fout die hier zat: makeRateLimiter geeft een OBJECT terug, en `if (!remmen(ip))` is
  // op een object nooit waar. De rem stond er wél, maar deed niets — op het ene punt in de
  // hele site waar wachtwoorden geraden kunnen worden.
  const f = readFileSync(path.join(ROOT, 'netlify', 'functions', 'beheer.js'), 'utf-8');
  toets('beheer.js leest .ok uit', /remmen\([^)]*\)[\s\S]{0,80}?\.ok/.test(f),
        'de terugkeerwaarde zelf toetsen betekent: nooit blokkeren');
  toets('een object is inderdaad altijd waar', !!{ ok: false } === true);
}

console.log('\n9. intrekken haalt werkelijk offline');
{
  const f = readFileSync(path.join(ROOT, 'netlify', 'functions', 'beheer.js'), 'utf-8');
  // Bouwen ná het intrekken, niet alleen ná het vrijgeven: er moet iets wég.
  toets('intrekken vraagt ook een bouw aan',
        !/naar === 'approved'\s*\?\s*await bouwAanvragen\(\)/.test(f),
        'intrekken sloeg de bouw over — dan blijft de pagina staan');

  const bn = readFileSync(path.join(ROOT, 'tools', 'build-nieuws.mjs'), 'utf-8');
  toets('de bouw ruimt verdwenen berichtmappen op', /niet langer publiceerbaar/.test(bn),
        'zonder opruimen blijft een ingetrokken bericht online, want build-publiek kopieert alles onder nieuws/');
  toets('concept/ wordt met rust gelaten', /name === 'concept'/.test(bn));
  toets('alleen mappen met precies één index.html', /inhoud\[0\] === 'index\.html'/.test(bn));
}

console.log('\n7. de publicatie kent het scherm, de sitemap niet');
{
  const pub = readFileSync(path.join(ROOT, 'tools', 'build-publiek.mjs'), 'utf8');
  toets("beheer staat op de insluitlijst", /pad:\s*'beheer'/.test(pub));
  toets('robots.txt sluit hem uit', readFileSync(path.join(ROOT, 'robots.txt'), 'utf8').includes('Disallow: /beheer/'));
  const kaart = path.join(ROOT, 'publiek', 'sitemap.xml');
  if (existsSync(kaart)) {
    toets('staat niet in de sitemap', !readFileSync(kaart, 'utf8').includes('/beheer/'));
  } else {
    console.log('  · sitemap nog niet gebouwd — overgeslagen');
  }
  toets('/api/beheer wijst naar de functie',
        readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8').includes('/api/beheer'));
}

console.log('\n' + '='.repeat(46));
console.log(gezakt === 0 ? 'ALLE TOETSEN GESLAAGD' : `${gezakt} TOETS(EN) GEZAKT`);
process.exit(gezakt === 0 ? 0 : 1);
