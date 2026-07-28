// R.O.B. Concepting — klopt de nesting van een HTML-document?
//
// AANLEIDING, 2026-07-28. Ik haalde een blok half weg met een patroon dat bij de eerste
// </div> stopte: openingstag verdween, alinea en sluittag bleven staan, ná </main>. Vijf
// pagina's gingen zo live met een sluittag te veel. Niets merkte het — alle poorten keken
// naar inhoud, geen enkele naar vorm.
//
// EERSTE POGING WAS ZELF FOUT, en op twee manieren tegelijk:
//   · `<${tag}[\s>]` in een template-literal wordt `<divs>` — die matcht nooit, dus telde
//     hij overal nul openingstags en werd alles rood;
//   · een controle op "sluittag tussen </main> en <footer>" sloeg aan op /vragen/, waar
//     precies daar een legitieme <section> staat.
//
// Dat was de vijfde te grove toets op één dag. De les is inmiddels duidelijk: TEL NIET, MAAR
// LOOP DOOR. Deze scanner leest de tags in volgorde en houdt de diepte bij. Dat is wat een
// browser ook doet, en het is het enige dat een ontbrekende openingstag kan onderscheiden
// van een extra sluittag.
//
// BEWUST NIET GETOETST: <p>. In HTML mag de sluittag daarvan wegblijven, dus een verschil
// zegt daar niets. Een toets die op geldige HTML kan afgaan, leer je negeren.

const CONTROLEER = new Set(['div', 'section', 'article', 'main', 'nav', 'figure', 'ul', 'ol']);

export function nestingFouten(html) {
  const fouten = [];
  const stapel = [];

  // Commentaar, script en style eerst weghalen: daar staan tags in die geen structuur zijn.
  const schoon = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const tags = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  let m;
  while ((m = tags.exec(schoon)) !== null) {
    const [, sluit, naam, zelfsluitend] = m;
    const tag = naam.toLowerCase();
    if (!CONTROLEER.has(tag)) continue;
    if (zelfsluitend) continue;

    if (!sluit) {
      stapel.push(tag);
    } else {
      if (!stapel.length) {
        fouten.push(`</${tag}> zonder openingstag`);
        continue;
      }
      const laatste = stapel.pop();
      if (laatste !== tag) {
        fouten.push(`</${tag}> sluit een <${laatste}> af — verkeerd genest`);
        // niet verder proberen te herstellen; één melding is genoeg om te gaan kijken
        return fouten;
      }
    }
  }

  for (const open of stapel) fouten.push(`<${open}> is nooit gesloten`);
  return fouten;
}
