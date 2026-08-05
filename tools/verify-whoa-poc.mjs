// Poort voor de verborgen, publiek-veilige WHOA-POC.
// Draai: node tools/verify-whoa-poc.mjs [--saboteer]

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pocIntake, { _test } from '../netlify/functions/poc-intake.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const sabotage = process.argv.includes('--saboteer');
const errors = [];
const file = (relative) => path.join(ROOT, ...relative.split('/'));
const read = (relative) => readFileSync(file(relative), 'utf8');
const requireFile = (relative) => {
  if (!existsSync(file(relative))) errors.push(`ontbreekt: ${relative}`);
};

const requiredFiles = [
  'ervaring/index.html', 'ervaring/ervaring.css', 'ervaring/ervaring.js',
  'ervaring/whoa-demo-pack.json', 'netlify/functions/poc-intake.js'
];
requiredFiles.forEach(requireFile);

let demo;
try { demo = JSON.parse(read('ervaring/whoa-demo-pack.json')); }
catch (error) { errors.push(`whoa-demo-pack.json is ongeldig: ${error.message}`); }

if (demo) {
  if (sabotage) demo.meta.fictional = false;
  if (demo.meta?.fictional !== true || demo.meta?.publicSafe !== true) errors.push('fixture is niet fictief én publiek veilig gemarkeerd');
  if (!/^\d+\.\d+\.\d+$/.test(demo.meta?.version || '')) errors.push('fixture mist een semantische versie');
  if (!Array.isArray(demo.rules) || demo.rules.length < 3) errors.push('juridische regels missen of zijn onvolledig');
  if (!demo.rules?.every((rule) => rule.sourceUrl?.startsWith('https://www.rechtspraak.nl/') && rule.checkedAt && rule.allowedWording)) {
    errors.push('niet iedere procedurele regel heeft Rechtspraak-bron, controledatum en toegestane formulering');
  }
  const statuses = new Set(['aangeleverd', 'bron-bevestigd', 'expert-bevestigd', 'onzeker', 'ontbreekt', 'niet-vrijgegeven']);
  for (const [id, field] of Object.entries(demo.case?.fields || {})) {
    if (!statuses.has(field.status)) errors.push(`${id}: onbekende veldstatus ${field.status}`);
    if (!field.source || !Number.isInteger(field.version)) errors.push(`${id}: bron of versie ontbreekt`);
  }
  const raw = JSON.stringify(demo);
  if (/[a-z0-9._%+-]+@(gmail|hotmail|outlook|live|icloud|yahoo)\.[a-z.]+/i.test(raw)) errors.push('persoonlijk e-mailadres in publieke fixture');
  if (/\b(?:\+31|0031|06[- ]?\d{8})\b/.test(raw)) errors.push('telefoonnummer in publieke fixture');
}

const html = read('ervaring/index.html');
const js = read('ervaring/ervaring.js');
const css = read('ervaring/ervaring.css');
const home = read('index.html');
const fn = read('netlify/functions/poc-intake.js');
const toml = read('netlify.toml');
const robots = read('robots.txt');
const builder = read('tools/build-publiek.mjs');

if (!/<meta[^>]+name="robots"[^>]+noindex[^>]+nofollow/i.test(html)) errors.push('ervaringsapp mist noindex en nofollow');
if ((html.match(/<h1[\s>]/g) || []).length !== 1 || !js.includes("document.querySelector('#poc-shell-title')?.remove()")) {
  errors.push('statische shell moet precies één h1 dragen die vóór de dynamische projectiekop wordt verwijderd');
}
if (/<iframe\b/i.test(html + js)) errors.push('iframe aangetroffen in de ervaringsapp');
if (!home.includes("if (val === '/chat')")) errors.push('homepage onderschept niet uitsluitend exact /chat');
if (!home.includes("sessionStorage.setItem('robMaxPoc.v2'")) errors.push('homepage maakt geen lokale POC-sessie');
const interceptAt = home.indexOf("if (val === '/chat')");
const normalFetchAt = home.indexOf("fetch('/.netlify/functions/chat'", interceptAt);
if (interceptAt < 0 || normalFetchAt < interceptAt) errors.push('/chat wordt niet vóór de gewone chatfunctie onderschept');
if (!js.includes('Wat kan ik voor je doen Danny?') || !js.includes('id="ai-start-form"')) {
  errors.push('scherm 1 is niet de afgesproken persoonlijke AI-chatlanding');
}
if (!js.includes("record('case_route_started', 'natuurlijke-ai-ingang')")) {
  errors.push('natuurlijke invoer op scherm 1 start de klantreis niet');
}
if (!js.includes('const isDistressOpening') || !js.includes('CHAT_DEMO')) {
  errors.push('scherm 2 mist de robuuste probleemtrigger of de deterministische chat');
}
if (!js.includes('https://www.maxfinancelegal.nl/')) {
  errors.push('scherm 2 verwijst niet naar de officiële Max Finance & Legal-pagina');
}
if (!js.includes("role: 'search'") || !js.includes('Passende expertise zoeken') || !js.includes('Passende specialist gevonden')) {
  errors.push('scherm 2 mist de zichtbare AI-zoekfase vóór de aanbeveling');
}
const searchPermissionQuestion = js.indexOf('Zal ik passende expertise zoeken');
const searchPermissionAnswer = js.indexOf('Ja graag. Kijk wie mij hiermee kan helpen.');
const visibleSearchStep = js.indexOf("role: 'search'");
if (searchPermissionQuestion < 0 || searchPermissionAnswer < searchPermissionQuestion || visibleSearchStep < searchPermissionAnswer || !js.includes("record('search_permission_confirmed', 'danny-simulated-consent')")) {
  errors.push('de AI-zoekactie begint niet aantoonbaar na Danny’s toestemming');
}
if (!js.includes('zegt dat hij dit traject niet kan trekken') || !js.includes('Sindsdien raak ik helemaal in paniek')) {
  errors.push('de chat verbeeldt de begrensde accountantshulp en oplopende paniek niet');
}
if (!js.includes("{ id: 'max', label: 'Max'") || !js.includes('U hoeft dit niet alleen uit te zoeken.') || !js.includes('Nog niets gedeeld')) {
  errors.push('de gecontroleerde Max-ingang ontbreekt of maakt de overdrachtsgrens niet zichtbaar');
}
if (!js.includes("{ id: 'max-intake', label: 'Eerste intake'") || !js.includes('MAX_INTAKE_QUESTIONS') || !js.includes('Bevestig contact en verstuur intake')) {
  errors.push('de gesprekgestuurde eerste Max-intake ontbreekt of heeft geen expliciete verzending');
}
if (!js.includes('Agora · herkomstlaag') || !js.includes('Door Danny bevestigd') || !js.includes('Door AI herkend')) {
  errors.push('de eerste Max-intake maakt Agora-herkomst en status niet aantoonbaar');
}
if (!js.includes("{ id: 'max-management', label: 'Management'") || !js.includes('Tijdskritiek · hoog') || !js.includes('Potentie · onderzoeken')) {
  errors.push('het Max Management AI-scherm ontbreekt of vermengt urgentie en potentie');
}
// De perspectiefwissel: tussen de intake van de ondernemer en de binnenkant van Max hoort
// uitleg — Danny wisselt daar van stoel en dat mag niet onaangekondigd gebeuren.
if (!js.includes('state.managementIntroSeen') || !js.includes('Perspectiefwissel') || !js.includes("record('management_perspective_explained'")) {
  errors.push('de perspectiefwissel naar het managementscherm wordt niet uitgelegd');
}
if (js.includes('niets van te hoeven begrijpen')) {
  errors.push('het eindscherm draagt nog de ongenuanceerde slotzin richting Danny');
}
if (!js.includes('Urgentie is geen levensvatbaarheid') || !js.includes("record('management_signal_assigned', 'frank-van-meenen-continuiteit')")) {
  errors.push('Agora-signaallogica of de menselijke toewijzing aan Frank ontbreekt');
}
if (!js.includes('Vraag Management AI') || !js.includes('Wat ontbreekt nog?') || !js.includes('Ik neem geen expertbesluit')) {
  errors.push('de contextbewuste Management AI-ingang of haar beslisgrens ontbreekt');
}
if (!js.includes("{ id: 'frank-signal', label: 'Frank'") || !js.includes('Open beveiligde melding') || !js.includes('Nog geen expertoordeel')) {
  errors.push('de privacyveilige melding en expertgrens voor Frank ontbreken');
}
if (!js.includes("record('frank_review_accepted', 'human-assessment-pending')") || !js.includes('Frank ontvangt een besluit, geen conclusie')) {
  errors.push('Franks menselijke aanname of de Agora-overdrachtsgrens ontbreekt');
}
if (!js.includes('Mobiele melding op Franks telefoon') || !js.includes('frank-phone-side-controls') || !js.includes('frank-phone-home') || !css.includes('.frank-phone-context, .frank-phone-side-controls, .frank-phone-home { display: none; }')) {
  errors.push('Franks paneel is op desktop niet duidelijk als mobiele telefoon herkenbaar');
}
if (!js.includes('managementSignalExpanded: false') || !js.includes("management-signal ${opened ? 'read' : 'unread'} ${expanded ? 'selected' : ''}") || !js.includes('state.managementSignalExpanded = false') || !css.includes('@keyframes management-signal-attention')) {
  errors.push('het nieuwe managementsignaal vraagt niet zichtbaar aandacht tot opening');
}
if (!js.includes("${opened ? 'gelezen' : 'nieuw'}") || !js.includes("${assigned ? 'Door directie toegewezen' : 'AI-voorstel, nog niet toegewezen'}")) {
  errors.push('de managementlabels volgen de gelezen- en toewijzingsstatus niet');
}
if (!js.includes("id: 'contact'") || !js.includes('contact-consent') || !js.includes('contactPhone') || !js.includes('contactEmail')) {
  errors.push('de eerste intake verzamelt geen expliciet vrijgegeven contactmogelijkheid');
}
if (!js.includes("record('management_projection_auto_opened', 'post-intake-transition')") || !js.includes("state.current === 'max-intake'") || !js.includes('Interne opvolging wordt geopend')) {
  errors.push('na contacttoestemming opent de interne managementopvolging niet automatisch');
}
if (!js.includes('management-transfer-screen') || !js.includes('Agora maakt overdrachtslog') || !js.includes('Open Franks mobiele melding')) {
  errors.push('de geleide Agora-overdracht naar Frank ontbreekt');
}
if (!js.includes('const renderManagementFromTop') || !js.includes('scrollExperienceToTop();')) {
  errors.push('het zelfstandige overdrachtscherm start niet gegarandeerd bovenaan');
}
if (!js.includes("{ id: 'frank-review', label: 'Expertbeoordeling'") || !js.includes('Door Danny bevestigd') || !js.includes('AI-afleiding · te toetsen') || !js.includes('Nog aan te leveren') || !js.includes("record('frank_ai_inference_corrected', 'human-correction')") || !js.includes("record('frank_personal_contact_prepared', 'agreement-pending')") || !css.includes('.frank-review-workspace')) {
  errors.push('Franks volledige expertwerkruimte mist menselijke correctie, Agora-grenzen of persoonlijk contact');
}
const contactPrepared = js.indexOf("record('frank_personal_contact_prepared'");
const contactHeld = js.indexOf("record('frank_personal_contact_held'");
const intakeInvited = js.indexOf("record('frank_full_intake_invited'");
if (contactHeld < contactPrepared || intakeInvited < contactHeld || !js.includes('Beveiligde expertwerkruimte')) {
  errors.push('Frank kan de vervolgintake uitnodigen zonder het gesprek aantoonbaar te hebben afgerond');
}
if (!js.includes("{ id: 'danny-uitnodiging', label: 'Uitnodiging'") || !js.includes("record('danny_invitation_opened'") || !js.includes("record('danny_full_intake_accepted'") || !js.includes('const renderDannyInvitation')) {
  errors.push('Danny’s beveiligde uitnodiging voor de vervolgintake ontbreekt');
}
const invitationStart = js.indexOf('const renderDannyInvitation');
const invitationEnd = js.indexOf('const POORT_CODE');
const invitationScreen = invitationStart < 0 || invitationEnd < invitationStart ? '' : js.slice(invitationStart, invitationEnd);
if (!invitationScreen.includes('Gevraagde documenten') || !invitationScreen.includes('Gevraagde toestemmingen') || !invitationScreen.includes('schuldenoverzicht') || !/geen overeenkomst/i.test(invitationScreen) || /\bwhoa\b/i.test(invitationScreen)) {
  errors.push('de uitnodiging scheidt documenten en toestemmingen niet, of overschrijdt haar grens');
}
if (!css.includes('.danny-invitation')) {
  errors.push('de uitnodiging mist eigen schermregie in de stylelaag');
}
if (!js.includes("{ id: 'vervolgintake', label: 'Vervolgintake'") || !js.includes("record('vervolgintake_code_accepted'") || !js.includes("record('vervolgintake_dossier_ready'") || !js.includes('const renderVervolgintakePoort')) {
  errors.push('de dynamische Max-poort voor de vervolgintake ontbreekt');
}
const poortStart = js.indexOf('const renderVervolgintakePoort');
const poortEnd = js.indexOf('const renderEntrepreneur');
const poortScreen = poortStart < 0 || poortEnd < poortStart ? '' : js.slice(poortStart, poortEnd);
if (!poortScreen.includes('max-poort-entry') || !poortScreen.includes('POORT_CODE') || !poortScreen.includes('is-prefilled') || !/ontvangst/i.test(poortScreen)) {
  errors.push('de gesloten poort mist ontvangst, eerste instructie of de vervaagde code in de ingang');
}
if (!js.includes("record('vervolgintake_code_rejected'") || !js.includes("if (!state.poortUnlocked)") || !js.includes("record('vervolgintake_question_asked'") || !js.includes('const poortAnswerFor')) {
  errors.push('de poort ontvouwt zonder geldige code, of een tussenvraag verschuift de voortgang');
}
if (!css.includes('.max-poort') || !css.includes('.max-poort-documents') || /\bwhoa\b/i.test(poortScreen)) {
  errors.push('de poort mist eigen schermregie, of overschrijdt haar grens');
}
const consentGiven = js.indexOf("record('vervolgintake_accountant_consent_given'");
const dossierReady = js.indexOf("record('vervolgintake_dossier_ready'");
if (consentGiven < 0 || dossierReady < consentGiven || !js.includes('poortCurrentStep() || state.poortAccountantConsent')) {
  errors.push('de toestemming voor de accountant is geen afzonderlijke poort naar de volgende stap');
}
if (!js.includes("record('vervolgintake_expert_validated'") || js.includes('poortValidationTimer')
  || !js.includes("#frank-validate")
  || !poortScreen.includes('done && !validated') || !poortScreen.includes('state.poortValidatedAt')) {
  errors.push('Franks validatie is geen zichtbare handeling van hem, of valt samen met de aanlevering');
}
if (!js.includes("{ id: 'frank-werkruimte', label: 'Expertwerkruimte'") || !js.includes('const renderFrankWerkruimte') || !js.includes("record('frank_accountant_link_prepared'")) {
  errors.push('Franks werkruimte voor het aangeleverde dossier ontbreekt');
}
const werkStart = js.indexOf('const renderFrankWerkruimte');
const werkEnd = js.indexOf('const RA_SUPPLIABLE');
const werkScreen = werkStart < 0 || werkEnd < werkStart ? '' : js.slice(werkStart, werkEnd);
if (!werkScreen.includes('frank-propose') || !werkScreen.includes('disabled') || !/\bnog niet aangevuld|accountant heeft nog/i.test(werkScreen)) {
  errors.push('het voorstel kan worden opgemaakt voordat de accountant heeft aangevuld');
}
if (!js.includes('accountantNameFrom')) {
  errors.push('de accountant heeft geen herleidbare herkomst');
}
/* WHOA mag in Franks werkruimte vallen, maar alleen ná de aanvulling van de accountant,
   alleen als toetsing en niet als besluit, en alleen met herkomst per regel. */
const toetsAt = werkScreen.indexOf('WHOA');
const supplementGate = werkScreen.indexOf('supplemented ?');
if (toetsAt >= 0 && (supplementGate < 0 || toetsAt < supplementGate
  || !werkScreen.includes('geen routebesluit') || !werkScreen.includes('frank-werk-agora')
  || !werkScreen.includes('Onder voorbehoud'))) {
  errors.push('de werkruimte noemt de route zonder aanvulling, zonder voorbehoud of zonder herkomst per regel');
}
if (!werkScreen.includes('renderLiquidityChart') || !js.includes('Bekijk als tabel') || !js.includes('stroke-dasharray')) {
  errors.push('de financiële impressie mist haar tabelvariant of haar onderscheid tussen afgeleid en prognose');
}
if (!css.includes('.max-poort-documents li.validated') || !poortScreen.includes('Gevalideerd door') || !poortScreen.includes('EXPERT_NAME') || !poortScreen.includes('poortValidationStamp')) {
  errors.push('de validatie mist groene bevestiging, expertnaam of tijdstempel');
}
if (!js.includes("{ id: 'accountantpoort', label: 'Accountantpoort'") || !js.includes("record('accountant_portal_opened'") || !js.includes("record('accountant_supplement_submitted'") || !js.includes('const renderAccountantPoort')) {
  errors.push('de accountantpoort ontbreekt');
}
const raStart = js.indexOf('const renderAccountantPoort');
const raEnd = js.indexOf('const renderExpert');
const raScreen = raStart < 0 || raEnd < raStart ? '' : js.slice(raStart, raEnd);
if (!js.includes("record('accountant_interest_disclosed'") || !js.includes('!state.raDisclosed') || !raScreen.includes('state.raDisclosed')) {
  errors.push('de accountant kan aanleveren zonder zijn eigen belang te hebben verklaard');
}
if (!raScreen.includes('Wat dit niet is') || !raScreen.includes('ra-poort-withheld') || !raScreen.includes('Datapositie')) {
  errors.push('de accountantpoort toont de grondslag of de grens van wat niet wordt gedeeld niet');
}
if (/\bwhoa\b/i.test(raScreen) || /hoofdpijn|moeizaam|slepend|uitzichtloos/i.test(raScreen)) {
  errors.push('de accountantpoort benoemt de route of de zwaarte in plaats van ze uit context te laten blijken');
}
if (!css.includes('.ra-poort') || !css.includes('#1F4E79')) {
  errors.push('de accountantpoort mist de sobere professionele schermregie');
}
if (/caseVersion:\s*'[\d.]+'/.test(home)) {
  errors.push('de homepage stempelt een casusversie die zij niet kan kennen');
}
if (!js.includes("{ id: 'afronding', label: 'Afronding'") || !js.includes('const renderAfronding') || !js.includes('const EVENT_LABELS') || !js.includes('const AGORA_VERBS')) {
  errors.push('het eindscherm ontbreekt');
}
const slotStart = js.indexOf('const renderAfronding');
const slotEnd = js.indexOf('const RA_SUPPLIABLE');
const slotScreen = slotStart < 0 || slotEnd < slotStart ? '' : js.slice(slotStart, slotEnd);
/* De terugblik moet uit het logboek komen, niet uit een geschreven lijst, en het
   eindscherm mag geen besluit claimen dat nergens is genomen. */
if (!slotScreen.includes('state.events') || !slotScreen.includes('EVENT_LABELS[event.action]')
  || !slotScreen.includes('geen enkel besluit') || !slotScreen.includes('Rob de Rooij')) {
  errors.push('de terugblik komt niet uit het logboek, of het eindscherm mist zijn grens of zijn maker');
}
if (!js.includes("['leren', 'Leren', 'Niet in deze demonstratie te zien")) {
  errors.push('het eindscherm doet alsof Agora leert binnen één doorloop');
}

if (!js.includes("{ id: 'agora-uitleg', label: 'Agora KIS'") || !js.includes("{ id: 'geo-uitleg', label: 'Dynamic Knowledge'")
  || !js.includes('const renderAgoraUitleg') || !js.includes('const renderGeoUitleg')) {
  errors.push('de twee uitlegschermen na de afronding ontbreken');
}
const uitlegStart = js.indexOf('const renderAgoraUitleg');
const uitlegEnd = js.indexOf('const RA_SUPPLIABLE');
const uitleg = uitlegStart < 0 || uitlegEnd < uitlegStart ? '' : js.slice(uitlegStart, uitlegEnd);
/* De motorkap mag open, de mechaniek niet naar buiten: geen namen van bouwstenen,
   geen schema's, geen leveranciers. En het systeem mag hier niet gaan beslissen. */
if (/supabase|pgvector|postgres|edge function|embedding|vector|index.md|frontmatter|api[- ]?key/i.test(uitleg)) {
  errors.push('de uitleg noemt onderdelen van de uitvoering in plaats van de functie');
}
if (!uitleg.includes('beslist niets') || !uitleg.includes('Wat hier niet staat')) {
  errors.push('de uitleg mist haar grens of haar voorbehoud over wat niet wordt prijsgegeven');
}
if (!js.includes("data-goto=\"agora-uitleg\"") || !js.includes('slot-verder')) {
  errors.push('het eindscherm leidt niet naar de uitleg');
}
if (!/GEO|vindbaar/i.test(js.slice(js.indexOf('const renderAfronding'), js.indexOf('const RA_SUPPLIABLE')))) {
  errors.push('het eindscherm legt geen verband met vindbaarheid');
}

if (!js.includes('maxButton.onclick = openMaxLanding')) {
  errors.push('de dynamisch ingevoegde Max-aanbeveling opent de volgende stap niet');
}
const chatDemoStart = js.indexOf('const CHAT_DEMO');
const chatDemoEnd = js.indexOf('const maxRecommendation');
if (/\bwhoa\b/i.test(js.slice(chatDemoStart, chatDemoEnd))) {
  errors.push('de eerste AI-chat speelt de WHOA-route te vroeg uit');
}
if (!css.includes('.ai-chat-start > .afsluiter { display: none; }') || !css.includes('.ai-chat-start .poc-topbar')) {
  errors.push('scherm 1 verbergt presentator- en R.O.B./Max-chrome niet volledig');
}

for (const command of ['/zwaarweer', '/intake', '/delen', '/expert', '/whoa', '/leiding', '/bewijs', '/bouw']) {
  if (!js.includes(`command === '${command}'`)) errors.push(`commandoroute mist ${command}`);
}
if (!js.includes("location.replace('/#rob')")) errors.push('directe route zonder sessie keert niet terug naar het R.O.B.-contactpunt');
if (!js.includes("if (!state.consent || !state.accountantReviewed)")) errors.push('expertpoort controleert toestemming en accountantbeoordeling niet');
if (!js.includes("if (!state.routeDecision)")) errors.push('WHOA-werkruimte controleert het expertbesluit niet');

const earlyStart = js.indexOf('const renderChat =');
const earlyEnd = js.indexOf('const expertQuestions =');
const earlyScreens = js.slice(earlyStart, earlyEnd);
if (/WHOA-kandidaat|Voorbereidingsroute:\s*WHOA/.test(earlyScreens)) errors.push('WHOA wordt vóór de expertpoort als route onthuld');

for (const forbidden of ['archiveChatSession', 'sendMail', 'mailToRob', 'SUPABASE_', 'service_role', 'fetch(\'https://api.resend.com']) {
  if (fn.includes(forbidden)) errors.push(`POC-functie bevat verboden neveneffect: ${forbidden}`);
}
if (!fn.includes("path: '/api/poc-intake'")) errors.push('POC-functie mist het vaste API-pad');
if (!fn.includes("Cache-Control': 'no-store")) errors.push('POC-functie staat caching toe');
if (!fn.includes('FORBIDDEN_CONCLUSION')) errors.push('POC-functie bewaakt de beslisgrens niet');

if (!/from = "\/ervaring\/\*"[\s\S]*?to = "\/ervaring\/index\.html"[\s\S]*?status = 200/.test(toml)) errors.push('Netlify rewrite voor rolprojecties ontbreekt');
if (!/for = "\/ervaring\/\*"[\s\S]*?X-Robots-Tag = "noindex, nofollow, noarchive"/.test(toml)) errors.push('Netlify noindex-header ontbreekt');
if (!robots.includes('Disallow: /ervaring/')) errors.push('robots.txt sluit de ervaring niet uit');
if (!builder.includes("pad: 'ervaring'")) errors.push('publieke inclusielijst neemt de ervaringsapp niet op');

const previousKey = process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
const fallbackResponse = await pocIntake(new Request('https://rob-concepting.com/api/poc-intake', {
  method: 'POST',
  headers: { origin: 'https://rob-concepting.com', 'content-type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'poc-test-session-1234',
    message: 'Het bedrijf draait nog, maar de oude schulden halen ons in.',
    caseContext: { fictional: true, sector: 'metaalbewerking', stage: 'signalering' }
  })
}), { ip: 'verify-poc-fallback' });
if (previousKey) process.env.ANTHROPIC_API_KEY = previousKey;
if (fallbackResponse.status !== 200) errors.push(`fallback geeft HTTP ${fallbackResponse.status} in plaats van 200`);
else {
  const body = await fallbackResponse.json();
  if (body.mode !== 'fallback' || !Array.isArray(body.questions) || body.questions.length > 2) errors.push('fallbackcontract klopt niet');
  if (/\b(whoa|homologatie|faillissement|surseance)\b/i.test(JSON.stringify(body))) errors.push('fallback kiest of noemt een juridische route');
}

const invalidResponse = await pocIntake(new Request('https://rob-concepting.com/api/poc-intake', {
  method: 'POST',
  headers: { origin: 'https://rob-concepting.com', 'content-type': 'application/json' },
  body: JSON.stringify({ sessionId: 'te-kort', message: 'Help', caseContext: { fictional: false } })
}), { ip: 'verify-poc-invalid' });
if (invalidResponse.status !== 400) errors.push('ongeldig verzoek wordt niet met 400 geweigerd');

try {
  _test.parseModelJson('{"reflection":"WHOA is passend","questions":["Akkoord?"],"signals":[]}');
  errors.push('modelrespons kan vóór expertvalidatie toch een WHOA-conclusie geven');
} catch {}

if (errors.length) {
  console.error(`verify-whoa-poc: ROOD — ${errors.length} bevinding(en):`);
  errors.forEach((error) => console.error(`  · ${error}`));
  process.exit(sabotage ? 0 : 1);
}

if (sabotage) {
  console.error('verify-whoa-poc: sabotage mislukte — de poort bleef groen.');
  process.exit(1);
}

console.log('verify-whoa-poc: groen — route, privacygrenzen, fixture en veilige AI-fallback kloppen.');
