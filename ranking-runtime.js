(() => {
  const metric = new URLSearchParams(location.search).get('metric') || 'co2';
  const current = new URLSearchParams(location.search).get('country');
  const list = document.querySelector('#ranking');
  const status = document.querySelector('#status');
  const number = value => Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  const config = {
    co2: {
      key: 'co2_territorial_mt',
      title: 'CO₂ territorial,<br><em>classement européen.</em>',
      intro: 'Émissions territoriales de CO₂ fossile et industriel : elles excluent l’empreinte de consommation et les autres gaz à effet de serre.',
      definition: '<b>Définition.</b> MtCO₂ par an. Tous les pays utilisent le même millésime Global Carbon Budget.',
      suffix: '', ascending: false,
    },
    capita: {
      key: 'co2_per_capita_t',
      title: 'CO₂ par habitant,<br><em>classement européen.</em>',
      intro: 'Émissions territoriales rapportées à la population de la même année ; aucun dénominateur d’un autre millésime n’est utilisé.',
      definition: '<b>Définition.</b> tCO₂ par habitant. Calcul TerraScope : CO₂ Global Carbon Budget ÷ population Banque mondiale, même pays et même année.',
      suffix: '', ascending: false,
    },
    change: {
      derived: 'emissions_change_since_1990_pct',
      title: 'Émissions depuis 1990,<br><em>classement européen.</em>',
      intro: 'Le pourcentage compare chaque pays à son propre niveau de CO₂ territorial en 1990. Une baisse apparaît en tête du classement.',
      definition: '<b>Définition.</b> Variation des émissions territoriales entre 1990 et l’année commune, à périmètre Global Carbon Budget constant.',
      suffix: ' %', ascending: true,
    },
    renewables: {
      key: 'renewable_electricity_share_pct',
      title: 'Production renouvelable,<br><em>classement européen.</em>',
      intro: 'Part des renouvelables dans la production d’électricité ; ce n’est pas leur part dans toute la consommation d’énergie.',
      definition: '<b>Définition.</b> Pourcentage de la production d’électricité, même année pour les 27 pays. Ember annuel lorsque configuré, sinon Eurostat sur douze mois complets.',
      suffix: ' %', ascending: false,
    },
  }[metric];

  if (!config) { location.replace('ranking.html?metric=co2'); return; }
  document.querySelector('#title').innerHTML = config.title;
  document.querySelector('#intro').textContent = config.intro;
  document.querySelector('#definition').innerHTML = config.definition;
  document.querySelectorAll('[data-metric]').forEach(link => link.classList.toggle('active', link.dataset.metric === metric));

  const valueFor = country => {
    if (config.derived) {
      const value = country.derived?.[config.derived];
      return Number.isFinite(value) ? value : null;
    }
    const observation = country.metrics?.[config.key];
    return observation?.status === 'available' && Number.isFinite(observation.value) ? observation.value : null;
  };

  fetch('/data/annual-snapshot.json', { cache: 'no-cache' })
    .then(response => response.ok ? response.json() : Promise.reject(new Error('snapshot unavailable')))
    .then(snapshot => {
      if (!/^validated/.test(snapshot.status)) throw new Error('snapshot not validated');
      const values = Object.entries(snapshot.countries).map(([code, country]) => ({
        code,
        name: country.name_fr,
        iso2: country.iso2.toLowerCase(),
        value: valueFor(country),
      })).filter(country => country.value !== null);
      values.sort((a, b) => config.ascending ? a.value - b.value : b.value - a.value);
      list.innerHTML = values.map((country, index) => {
        const sign = metric === 'change' && country.value >= 0 ? '+' : '';
        return '<a class="rank-row '+(country.name === current ? 'is-current' : '')+'" href="country-live.html?country='+encodeURIComponent(country.name)+'">'
          +'<span class="rank-number">'+(index + 1)+'</span>'
          +'<span class="rank-country"><img src="https://flagcdn.com/'+country.iso2+'.svg" alt="">'+country.name+'</span>'
          +'<strong class="rank-value">'+sign+number(country.value)+config.suffix+'</strong>'
          +'<span class="rank-year">'+snapshot.reference_year+'</span></a>';
      }).join('') || '<p class="rank-empty">Aucune observation comparable disponible.</p>';
      status.textContent = 'DONNÉES VALIDÉES · '+values.length+' PAYS · ANNÉE '+snapshot.reference_year;
    })
    .catch(() => {
      status.textContent = 'LE SNAPSHOT ANNUEL VALIDÉ EST TEMPORAIREMENT INDISPONIBLE.';
      list.innerHTML = '<p class="rank-empty">Aucune valeur de remplacement n’est affichée.</p>';
    });
})();
