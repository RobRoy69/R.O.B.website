// R.O.B. Concepting — één plek waar een registerdatum in mensentaal wordt gezet.
//
// Stond eerst alleen in build-vragen.mjs. Toen build-site-kennis.mjs dezelfde omzetting
// nodig had, was de verleiding hem over te typen — precies de hand-onderhouden kopie die
// in dit project overal de drift veroorzaakt (stale index, gedrifte sitemap, gedupliceerde
// promptfoo-prompt). Het gevolg zag je meteen: de agent zei "2025-07-22" terwijl de site
// "22 juli 2025" toont. Twee oppervlakken, één feit, twee weergaven.
//
// Precisie en soort komen als VELD uit het register (migraties 0007 en 0008) en worden
// hier niet afgeleid.

const MND = ['januari','februari','maart','april','mei','juni','juli','augustus',
             'september','oktober','november','december'];

// Fail closed op onbekende precisie: liever te grof tonen dan precisie suggereren.
export const datum = (d, precisie) => {
  if (!d) return '';
  const [j, m, dg] = d.split('-').map(Number);
  switch (precisie) {
    case 'jaar':  return String(j);
    case 'maand': return `${MND[m - 1]} ${j}`;
    case 'dag':   return `${dg} ${MND[m - 1]} ${j}`;
    default:      return String(j);
  }
};

// Een brondatum is wanneer het bewijs is vastgesteld; een registratiedatum alleen wanneer
// het register de bron zag. Die twee mogen nergens identiek ogen — niet op een pagina en
// niet in de mond van de agent.
export const datumLabel = (d, precisie, soort) => {
  const t = datum(d, precisie);
  return soort === 'brondatum' ? t : `vastgelegd ${t}`;
};
