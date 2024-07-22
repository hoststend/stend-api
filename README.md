# Stend | API

Stend est un projet visant à être l'une des meilleures solutions pour configurer son propre service de partage de fichiers. Il a été conçu pour être aussi complet que la plupart des services propriétaires, mais avec une facilité d'installation et de configuration incomparable aux autres projets open-source.

Ce repo GitHub contient le code source de l'API de Stend, permettant d'héberger une instance du service.

![Accueil](https://stend-docs.johanstick.fr/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fdemo_homepage.90c32aac.png&w=1920&q=75)
![Téléchargement](https://stend-docs.johanstick.fr/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fdemo_downloadPage.5b317e36.png&w=1920&q=75)
*illustration : [client web](https://github.com/hoststend/stend-web)*

Pour plus d'informations, vous pouvez lire [la documentation](https://stend.johanstick.fr/api-docs/intro).

### Gérer une instance en tant qu'administrateur

Aucun endpoint de l'API ou tableau de bord n'a été implémenté pour gérer plus facilement une instance Stend. Dans un terminal, vous pouvez exécuter un script via la commande `npm run admin` pour gérer différents éléments de votre instance, tels que la suppression de transfert.

Si vous n'avez pas la possibilité d'utiliser une interface dans votre terminal, vous pouvez directement entrer les arguments dans la commande :

```bash
node admin.js info <clé de partage> # Affiche les informations d'un transfert
node admin.js delete <clé de partage> # Supprime un transfert, sans demander confirmation
node admin.js storage # Affiche l'espace de stockage utilisé par les fichiers enregistrés
```

### Disclaimer sur l'utilisation de Stend

L'utilisation de Stend pour des activités illégales n'est pas soutenue par le créateur et celui-ci ne peut être tenu responsable des problèmes matériels, logiciels ou légaux liés à ces utilisations non prévues. Utilisez à vos propres risques et prenez les précautions nécessaires, comme l'ajout d'un mot de passe obligatoire pour envoyer un fichier sur la plateforme.

### Licence

MIT © [Johan](https://johanstick.fr). Soutenez ce projet via [Ko-Fi](https://ko-fi.com/johan_stickman) ou [PayPal](https://paypal.me/moipastoii) si vous souhaitez m'aider 💙