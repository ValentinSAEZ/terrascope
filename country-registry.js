/* TerraScope — registre des 27 pays couverts (UE-27).
   Source unique pour : résoudre un paramètre d'URL, afficher le nom canonique,
   accorder les phrases (article, « de », pluriel) et trouver le drapeau.
   Un pays absent de ce registre n'est jamais remplacé par un autre. */
(function (global) {
  'use strict';
  // [nom, ISO3, code Eurostat, nom anglais, code drapeau, forme avec article, forme « de … », pluriel, slug]
  const rows = [
    ['Allemagne', 'DEU', 'DE', 'Germany', 'de', 'l’Allemagne', 'de l’Allemagne', false, 'allemagne'],
    ['Autriche', 'AUT', 'AT', 'Austria', 'at', 'l’Autriche', 'de l’Autriche', false, 'autriche'],
    ['Belgique', 'BEL', 'BE', 'Belgium', 'be', 'la Belgique', 'de la Belgique', false, 'belgique'],
    ['Bulgarie', 'BGR', 'BG', 'Bulgaria', 'bg', 'la Bulgarie', 'de la Bulgarie', false, 'bulgarie'],
    ['Chypre', 'CYP', 'CY', 'Cyprus', 'cy', 'Chypre', 'de Chypre', false, 'chypre'],
    ['Croatie', 'HRV', 'HR', 'Croatia', 'hr', 'la Croatie', 'de la Croatie', false, 'croatie'],
    ['Danemark', 'DNK', 'DK', 'Denmark', 'dk', 'le Danemark', 'du Danemark', false, 'danemark'],
    ['Espagne', 'ESP', 'ES', 'Spain', 'es', 'l’Espagne', 'de l’Espagne', false, 'espagne'],
    ['Estonie', 'EST', 'EE', 'Estonia', 'ee', 'l’Estonie', 'de l’Estonie', false, 'estonie'],
    ['Finlande', 'FIN', 'FI', 'Finland', 'fi', 'la Finlande', 'de la Finlande', false, 'finlande'],
    ['France', 'FRA', 'FR', 'France', 'fr', 'la France', 'de la France', false, 'france'],
    ['Grèce', 'GRC', 'EL', 'Greece', 'gr', 'la Grèce', 'de la Grèce', false, 'grece'],
    ['Hongrie', 'HUN', 'HU', 'Hungary', 'hu', 'la Hongrie', 'de la Hongrie', false, 'hongrie'],
    ['Irlande', 'IRL', 'IE', 'Ireland', 'ie', 'l’Irlande', 'de l’Irlande', false, 'irlande'],
    ['Italie', 'ITA', 'IT', 'Italy', 'it', 'l’Italie', 'de l’Italie', false, 'italie'],
    ['Lettonie', 'LVA', 'LV', 'Latvia', 'lv', 'la Lettonie', 'de la Lettonie', false, 'lettonie'],
    ['Lituanie', 'LTU', 'LT', 'Lithuania', 'lt', 'la Lituanie', 'de la Lituanie', false, 'lituanie'],
    ['Luxembourg', 'LUX', 'LU', 'Luxembourg', 'lu', 'le Luxembourg', 'du Luxembourg', false, 'luxembourg'],
    ['Malte', 'MLT', 'MT', 'Malta', 'mt', 'Malte', 'de Malte', false, 'malte'],
    ['Pays-Bas', 'NLD', 'NL', 'Netherlands', 'nl', 'les Pays-Bas', 'des Pays-Bas', true, 'pays-bas'],
    ['Pologne', 'POL', 'PL', 'Poland', 'pl', 'la Pologne', 'de la Pologne', false, 'pologne'],
    ['Portugal', 'PRT', 'PT', 'Portugal', 'pt', 'le Portugal', 'du Portugal', false, 'portugal'],
    ['Roumanie', 'ROU', 'RO', 'Romania', 'ro', 'la Roumanie', 'de la Roumanie', false, 'roumanie'],
    ['Slovaquie', 'SVK', 'SK', 'Slovakia', 'sk', 'la Slovaquie', 'de la Slovaquie', false, 'slovaquie'],
    ['Slovénie', 'SVN', 'SI', 'Slovenia', 'si', 'la Slovénie', 'de la Slovénie', false, 'slovenie'],
    ['Suède', 'SWE', 'SE', 'Sweden', 'se', 'la Suède', 'de la Suède', false, 'suede'],
    ['Tchéquie', 'CZE', 'CZ', 'Czechia', 'cz', 'la Tchéquie', 'de la Tchéquie', false, 'tchequie'],
  ];
  const list = rows.map(([name, iso3, eurostat, english, flag, the, of, plural, slug]) =>
    Object.freeze({name, iso3, eurostat, english, flag, the, of, plural, slug}));

  /* Insensible à la casse, aux accents, aux espaces et aux tirets. */
  const key = value => String(value ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[\s_’'-]+/g, '').trim();

  const index = new Map();
  for (const c of list) {
    const aliases = [c.name, c.iso3, c.eurostat, c.english, c.flag, c.slug];
    if (c.iso3 === 'CZE') aliases.push('Czech Republic', 'République tchèque');
    if (c.iso3 === 'NLD') aliases.push('Hollande', 'Holland');
    for (const alias of aliases) index.set(key(alias), c);
  }

  /** Renvoie le pays couvert correspondant, ou null. Jamais de repli sur un autre pays. */
  function resolve(input) {
    if (input === null || input === undefined) return null;
    const k = key(input);
    if (!k || k.length > 40) return null;
    return index.get(k) || null;
  }

  const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);
  /** Accord du verbe : verb(c, 'a émis', 'ont émis'). */
  const verb = (c, singular, plural) => (c.plural ? plural : singular);

  /** Échappement pour les rares gabarits HTML restants. */
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
  }

  /** Adresse canonique de la fiche (page statique générée au build). */
  const path = c => '/pays/' + c.slug + '/';

  global.TerraCountries = Object.freeze({list, resolve, path, capitalize, verb, escapeHtml, byIso3: iso3 => list.find(c => c.iso3 === iso3) || null});
})(typeof window !== 'undefined' ? window : globalThis);
