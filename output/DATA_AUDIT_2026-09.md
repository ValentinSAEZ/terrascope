# TerraScope — audit des données et du classement

Millésime contrôlé : 2024. Les dates exactes de récupération et empreintes des réponses sont conservées dans `data/annual-snapshot.json`, rubrique `source_audit`.

## Résultats

- 135 observations vérifiées auprès des fournisseurs sur 27 pays : CO₂ territorial, population, PIB PPA, électricité renouvelable, surface brûlée. Toutes concordent à l’arrondi stocké.
- 54 valeurs climatiques concordent avec les fichiers agrégés locaux. Cela ne constitue pas un recalcul indépendant à partir des NetCDF.
- Les projections CMIP6 n’ont pas été contre-vérifiées dans cet audit.
- Le mix est désormais ventilé avec RA130 (pompage) et X9900 (autres). Luxembourg : environ 45,36 % de pompage. Autriche : environ 13,62 % classés « autres » par Eurostat. France : environ 1,21 % restent non ventilés.

## Ce qui a été corrigé

Le classement présente les unités, conserve le pays repère lors du changement d’indicateur, classe les ex æquo au même rang et garde le rang européen pendant une recherche. Les valeurs négatives utilisent une origine centrale commune. Les pays sans observation comparable sont exclus avec un compte explicite.

Les contrôles bloquent les conversions de données absentes en zéro, les jointures de mauvaises années, les historiques dupliqués ou incohérents, les faux ratios, les mélanges de fournisseurs et les couvertures déclarées incorrectes. Le contrôle s’exécute aussi pendant la construction du site. Les mises à jour passent par un candidat distinct : un échec ne remplace plus le fichier publié.

Le traitement quotidien refuse les dates dupliquées, les changements de grille, les mauvaises unités et les valeurs manquantes sur les cellules sélectionnées. Le traitement mensuel vérifie l’ordre du calendrier avant pondération. Ces nouveaux garde-fous ne certifient pas rétrospectivement les anciens fichiers.

## Limites à conserver visibles

Les agrégations climatiques utilisent une fenêtre européenne ; tous les territoires nationaux éloignés ne sont pas couverts. L’audit du masque géographique et des fichiers bruts reste nécessaire avant de revendiquer une validation scientifique exhaustive. Une réanalyse, une observation de station et une moyenne nationale peuvent différer sans constituer une erreur de calcul.

Les chiffres RTE et Eurostat doivent être comparés à périmètre équivalent. La publication RTE de mars 2025 indique 27,8 % d’électricité renouvelable pour 2024 ; la série nette Eurostat utilisée par TerraScope donne environ 27,19 %. Cet écart n’a pas été supprimé par une exception française.

## Sources consultées

- Eurostat : https://ec.europa.eu/eurostat/databrowser/view/nrg_cb_pem/default/table
- Définition Eurostat : https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20250319-1
- RTE, fiche production 2024 : https://assets.rte-france.com/analyse-et-donnees/2025-03/BE2024%20-%20Fiche%20Production.pdf
- Global Carbon Budget, diffusé via OWID : https://globalcarbonbudget.org/gcb-2025/
- Banque mondiale : https://data.worldbank.org/indicator/SP.POP.TOTL et https://data.worldbank.org/indicator/NY.GDP.MKTP.PP.KD
- JRC / GWIS : https://gwis.jrc.ec.europa.eu/apps/country.profile/downloads
