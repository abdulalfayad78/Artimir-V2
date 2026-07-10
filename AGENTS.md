# ARTIMIR V2 — DOCUMENT DE CONTEXTE POUR CODEX

## 1. Présentation générale

Artimir est une installation culturelle interactive développée par Kinophos.

Le projet prend la forme d’un miroir ou d’un écran interactif capable de :

- présenter des œuvres d’art ;
- afficher un mapping visuel sur un visage ou une œuvre ;
- détecter la position de l’utilisateur avec une caméra ;
- régler automatiquement la hauteur de la machine ;
- présenter oralement une œuvre ;
- permettre à l’utilisateur de discuter avec une œuvre ou un artiste grâce à une intelligence artificielle ;
- proposer une phase amusante avec le mapping ;
- prendre une photo souvenir.

L’objectif d’Artimir V2 est de repartir sur une base technique propre, fiable et professionnelle.

L’ancien site ne doit pas être repris comme architecture principale, car ses connexions et son fonctionnement étaient trop fragiles.

Artimir V2 doit être construit depuis zéro.

---

## 2. Identité de l’entreprise

Le projet est développé par Kinophos.

Site officiel prévu :

https://kinophos.com

Le nom du produit est :

Artimir

Artimir doit être présenté comme une expérience culturelle, immersive et technologique.

---

## 3. Objectif principal

L’utilisateur ne doit pas avoir l’impression d’utiliser un simple site web.

Il doit avoir l’impression d’entrer dans une expérience futuriste où l’œuvre :

- l’observe ;
- lui parle ;
- répond à ses questions ;
- réagit à ses mouvements ;
- prend vie devant lui.

L’expérience doit être fluide, spectaculaire, simple à comprendre et agréable à utiliser.

---

## 4. Direction artistique

### Style général

Le design doit être :

- futuriste ;
- haut de gamme ;
- immersif ;
- cinématographique ;
- minimaliste ;
- élégant ;
- très fluide ;
- impressionnant dès la première page.

L’objectif est de créer un effet « waouh ».

Le design ne doit pas ressembler à :

- un site scolaire ;
- un tableau de bord classique ;
- un site gaming bon marché ;
- une copie directe d’Apple ;
- une interface trop chargée.

Il faut s’inspirer de la qualité des meilleures interfaces technologiques, tout en créant une identité originale pour Artimir.

### Couleurs principales

Le code couleur doit rester basé sur :

- noir profond ;
- jaune lumineux ;
- blanc cassé ;
- gris subtil.

Palette de départ recommandée :

```css
--color-background: #050505;
--color-background-secondary: #0d0d0d;
--color-yellow: #ffd400;
--color-yellow-light: #ffe76a;
--color-white: #f5f5f5;
--color-grey: #9a9a9a;
--color-glass: rgba(255, 255, 255, 0.06);
--color-border: rgba(255, 212, 0, 0.25);
```

Le jaune ne doit pas être utilisé partout.

Il doit surtout servir pour :

- les actions principales ;
- les sélections ;
- les validations ;
- les halos lumineux ;
- certaines lignes ;
- quelques mots importants ;
- les animations.

### Arrière-plan

Le fond doit rester majoritairement noir.

Il peut comporter de manière subtile :

- des halos jaunes ;
- une grille légère ;
- de fines particules ;
- des lignes lumineuses ;
- une légère texture ;
- des effets de profondeur ;
- une lumière en mouvement très lent.

Les animations doivent rester fluides et élégantes.

### Typographie

Les titres doivent être modernes, imposants et lisibles.

Suggestions :

- Space Grotesk ;
- Sora ;
- Inter ;
- Manrope.

Éviter les polices trop décoratives.

### Boutons

Les boutons doivent être :

- larges ;
- parfaitement lisibles ;
- adaptés au tactile ;
- élégants ;
- animés au survol ou au toucher ;
- accessibles.

Un bouton principal peut contenir :

```text
COMMENCER L’EXPÉRIENCE →
```

Les boutons doivent posséder :

- un contour subtil ;
- un halo léger ;
- une animation fluide ;
- un état désactivé ;
- un état sélectionné ;
- un état de chargement.

---

## 5. Technologies prévues

### Frontend

- React
- Vite
- JavaScript
- CSS moderne
- possibilité d’ajouter React Router
- possibilité d’ajouter Framer Motion plus tard pour certaines animations

### Backend futur

- Python
- FastAPI

### Communication en temps réel

- WebSocket

### Hébergement

Le site doit fonctionner principalement en local sur le PC d’Artimir.

Le système principal ne doit pas dépendre de Cloudflared.

Le fonctionnement local doit rester disponible même si Internet est coupé.

Internet pourra uniquement servir à certaines fonctions externes, par exemple :

- intelligence artificielle distante ;
- reconnaissance vocale distante ;
- synthèse vocale distante ;
- téléchargement éventuel de la photo.

---

## 6. Architecture globale prévue

Le projet devra progressivement être organisé ainsi :

```text
Artimir-V2/
├── AGENTS.md
├── README.md
├── frontend/
├── backend/
├── mapping/
├── motor-controller/
├── shared/
└── tests/
```

Pour le moment, seul le frontend est en cours de création.

Ne pas créer immédiatement tout le backend ou le mapping sans demande précise.

---

## 7. Parcours utilisateur définitif

Le parcours Artimir V2 contient dix étapes.

### Étape 1 — Page d’accueil

Objectif :

- présenter Artimir ;
- créer immédiatement un effet impressionnant ;
- inviter l’utilisateur à commencer.

Contenu possible :

```text
KINOPHOS PRÉSENTE

ARTIMIR

L’ART
PREND VIE.

Découvrez une expérience immersive où l’œuvre vous observe,
vous parle et vous répond.

COMMENCER L’EXPÉRIENCE →
```

Le démarrage peut comporter une courte introduction animée :

1. écran noir ;
2. apparition d’une ligne jaune ;
3. apparition de Kinophos ;
4. apparition d’Artimir ;
5. apparition du slogan ;
6. apparition du bouton.

L’introduction ne doit pas être trop longue.

Durée idéale :

2 à 3 secondes maximum.

---

### Étape 2 — Choix de la langue

L’utilisateur sélectionne sa langue.

Langues envisagées au départ :

- français ;
- anglais ;
- arabe ;
- espagnol.

La langue choisie devra ensuite être utilisée pour :

- les textes ;
- les consignes ;
- la présentation orale ;
- les réponses de l’intelligence artificielle ;
- la photo souvenir.

Le système doit être conçu de manière à pouvoir ajouter facilement d’autres langues plus tard.

Les traductions ne doivent pas être écrites directement partout dans les composants.

Prévoir un système centralisé de traduction.

---

### Étape 3 — Âge et familiarité avec l’art

Ces deux informations sont demandées sur une seule page.

#### Tranches d’âge envisagées

- moins de 8 ans ;
- 8 à 12 ans ;
- 13 à 17 ans ;
- 18 à 30 ans ;
- 31 à 60 ans ;
- plus de 60 ans.

L’utilisateur ne doit pas entrer son âge exact.

#### Familiarité avec l’art

Choix envisagés :

- je découvre complètement l’art ;
- j’ai quelques connaissances ;
- je m’intéresse régulièrement à l’art ;
- j’ai de bonnes connaissances artistiques.

Ces deux informations servent à adapter la présentation orale de l’œuvre.

Elles doivent être conservées pendant toute la session.

---

### Étape 4 — Tutoriel de positionnement

Cette page explique à l’utilisateur comment se placer devant Artimir.

Le système devra plus tard utiliser les informations de la caméra.

Instructions possibles :

- avancez légèrement ;
- reculez légèrement ;
- déplacez-vous vers la gauche ;
- déplacez-vous vers la droite ;
- regardez la caméra ;
- restez immobile.

L’interface doit afficher une animation simple représentant un utilisateur devant Artimir.

Lorsqu’une instruction est validée :

- elle passe au vert ;
- une petite onde lumineuse apparaît ;
- un léger son peut être joué ;
- un retour haptique pourra être envisagé si le matériel le permet.

Pour le moment, le frontend utilisera des états simulés.

---

### Étape 5 — Réglage automatique de la hauteur

La caméra détectera la position verticale du visage.

Le système devra commander la montée ou la descente de la machine.

Le site devra afficher un message comme :

```text
Artimir ajuste automatiquement sa hauteur.
Restez immobile et regardez la caméra.
```

Lorsque le réglage est terminé :

```text
Réglage terminé.
```

Un bouton discret doit permettre d’ouvrir le réglage manuel en cas de problème.

Le frontend ne devra pas commander directement le moteur tant que l’architecture n’est pas validée.

La commande du moteur sera normalement gérée par un service séparé.

Le frontend affichera seulement les états reçus.

---

### Étape 6 — Choix de l’œuvre

L’utilisateur choisit l’œuvre ou l’artiste qu’il souhaite découvrir.

Exemples futurs :

- La Joconde ;
- Vincent van Gogh ;
- La Jeune Fille à la perle ;
- Napoléon franchissant les Alpes.

Chaque œuvre devra être affichée dans une carte élégante et immersive.

Pour chaque œuvre, prévoir :

- image ;
- titre ;
- artiste ;
- époque ;
- courte phrase d’introduction ;
- état sélectionné.

---

### Étape 7 — Présentation orale personnalisée et conversation

Le choix de l’œuvre, la présentation orale et la conversation font partie de la même expérience générale.

Après le choix de l’œuvre :

1. le système récupère la langue ;
2. il récupère la tranche d’âge ;
3. il récupère le niveau de familiarité ;
4. il choisit une présentation adaptée ;
5. l’œuvre ou l’artiste présente oralement son histoire ;
6. le personnage demande ensuite :

```text
Avez-vous des questions ?
```

7. l’utilisateur peut parler ;
8. sa voix est transformée en texte ;
9. le texte est envoyé à l’intelligence artificielle ;
10. la réponse est transformée en voix ;
11. l’œuvre répond oralement ;
12. la discussion peut continuer.

Pour la première version, prévoir une simulation sans véritable IA.

Le frontend doit être préparé pour gérer les états suivants :

- présentation en cours ;
- écoute de l’utilisateur ;
- réflexion de l’intelligence artificielle ;
- réponse en cours ;
- erreur ;
- fin de conversation.

---

### Étape 8 — Temps libre avec le mapping

Après la conversation, l’utilisateur peut profiter librement du mapping.

Il peut :

- bouger ;
- sourire ;
- faire des grimaces ;
- imiter l’œuvre ;
- observer les réactions visuelles ;
- prendre différentes poses.

Message possible :

```text
Amusez-vous avec l’œuvre.
Souriez, bougez ou faites une grimace.
```

Le site devra afficher un bouton permettant de passer à la photo souvenir.

Cette étape pourra également passer automatiquement à la suite après un temps défini.

---

### Étape 9 — Photo souvenir

L’utilisateur peut prendre une photo.

Lorsqu’il clique sur le bouton :

1. une phrase amusante apparaît ;
2. un compte à rebours démarre ;
3. la photo est prise.

Exemple :

```text
Préparez votre plus beau sourire.

3
2
1
PHOTO !
```

Phrases possibles :

- faites une grimace avec la Joconde ;
- imitez son sourire ;
- préparez votre plus belle pose.

Après la photo, l’utilisateur pourra plus tard :

- voir la photo ;
- recommencer ;
- la récupérer avec un QR code ;
- la supprimer ;
- continuer.

Les photos devront être temporaires et supprimées automatiquement.

---

### Étape 10 — Page Kinophos

Dernière page de l’expérience.

Elle présente :

- Kinophos ;
- l’équipe ;
- la mission ;
- le projet Artimir ;
- Kinophos.com ;
- un QR code ;
- un bouton pour recommencer.

Texte possible :

```text
Artimir est une expérience développée par Kinophos,
une jeune équipe qui associe l’art,
l’intelligence artificielle
et les technologies interactives.
```

---

## 8. Gestion de la session utilisateur

Le frontend devra conserver pendant toute l’expérience :

```js
{
  language: null,
  ageRange: null,
  artFamiliarity: null,
  selectedArtwork: null
}
```

Pour le moment, ces données peuvent être conservées dans :

- un Context React ;
- ou un store simple centralisé.

Éviter de passer toutes les informations manuellement dans de nombreuses propriétés.

Les données ne doivent pas être enregistrées de manière permanente sans nécessité.

Une nouvelle session doit pouvoir être créée à la fin de l’expérience.

---

## 9. Communication future avec le mapping

Le mapping sera développé par un autre membre de l’équipe.

Il devra envoyer au site des informations comme :

```json
{
  "type": "position_update",
  "faceDetected": true,
  "distance": "correct",
  "horizontalPosition": "center",
  "verticalPosition": "too_low",
  "lookingAtCamera": true
}
```

États possibles :

```text
face_not_detected
too_close
too_far
move_left
move_right
look_at_camera
position_correct
height_too_high
height_too_low
height_correct
mapping_ready
mapping_error
```

Le site devra seulement interpréter ces messages et mettre à jour l’interface.

Pour le moment, utiliser un module de simulation.

---

## 10. Communication future avec le moteur

Le moteur doit être géré dans un service séparé.

États possibles :

```json
{
  "type": "motor_status",
  "status": "moving_up"
}
```

```json
{
  "type": "motor_status",
  "status": "moving_down"
}
```

```json
{
  "type": "motor_status",
  "status": "stopped"
}
```

```json
{
  "type": "motor_error",
  "message": "upper_limit_reached"
}
```

Le site devra afficher ces états de manière compréhensible.

Le système mécanique devra plus tard prévoir :

- limite haute ;
- limite basse ;
- arrêt d’urgence ;
- vitesse lente ;
- délai maximal ;
- arrêt automatique ;
- gestion des obstacles ;
- réglage manuel de secours.

---

## 11. Conversation avec l’intelligence artificielle

Cette fonction sera ajoutée plus tard.

Chaîne prévue :

```text
microphone
→ reconnaissance vocale
→ texte
→ intelligence artificielle
→ réponse texte
→ synthèse vocale
→ lecture audio
→ animation du mapping
```

Première œuvre prévue pour les essais :

La Joconde.

Première langue prévue pour les essais :

français.

Première version :

- réponses courtes ;
- une seule œuvre ;
- pas de synchronisation labiale complexe ;
- possibilité d’arrêter la discussion ;
- gestion claire des erreurs.

L’intelligence artificielle devra adapter ses réponses selon :

- la langue ;
- l’âge ;
- le niveau artistique ;
- l’œuvre ;
- la conversation précédente.

---

## 12. Règles de développement

Toujours respecter les règles suivantes.

### Avant de modifier le code

- analyser les fichiers existants ;
- expliquer brièvement le plan ;
- vérifier les dépendances disponibles ;
- ne pas supprimer des fichiers sans raison ;
- ne pas remplacer toute l’architecture pour une petite modification.

### Pendant les modifications

- créer des composants réutilisables ;
- éviter les fichiers gigantesques ;
- utiliser des noms clairs ;
- garder le code lisible ;
- éviter les dépendances inutiles ;
- éviter les fonctions non utilisées ;
- conserver un design cohérent ;
- prévoir le responsive ;
- prévoir une utilisation tactile ;
- prévoir l’accessibilité minimale ;
- prévoir les états de chargement et d’erreur.

### Après les modifications

- lancer le projet ;
- vérifier les erreurs dans le terminal ;
- vérifier les erreurs de compilation ;
- vérifier les erreurs du linter ;
- expliquer les fichiers modifiés ;
- ne pas affirmer que tout fonctionne sans l’avoir testé.

---

## 13. Responsive et matériel cible

L’interface pourra être affichée sur :

- écran vertical ;
- écran tactile ;
- tablette ;
- téléphone ;
- ordinateur.

Le design doit être responsive.

Les boutons tactiles doivent être suffisamment grands.

Taille minimale recommandée :

```css
min-height: 48px;
```

Le contenu principal doit rester lisible sur un écran vertical.

Le projet peut utiliser une largeur maximale pour le contenu afin de conserver un aspect premium.

---

## 14. Accessibilité

Prévoir au minimum :

- contrastes suffisants ;
- boutons accessibles au clavier ;
- textes alternatifs pour les images ;
- labels lisibles ;
- réduction des animations si l’utilisateur préfère moins de mouvement ;
- indication claire des états ;
- éviter les informations transmises uniquement par la couleur.

Utiliser :

```css
@media (prefers-reduced-motion: reduce)
```

pour limiter les animations.

---

## 15. Gestion des erreurs

Le site devra plus tard gérer :

- caméra indisponible ;
- microphone refusé ;
- visage non détecté ;
- mapping déconnecté ;
- moteur indisponible ;
- intelligence artificielle indisponible ;
- synthèse vocale indisponible ;
- photo impossible ;
- connexion perdue.

Les messages doivent être simples.

Exemple :

```text
Le réglage automatique n’est pas disponible.
Vous pouvez utiliser le réglage manuel.
```

---

## 16. Sécurité et confidentialité

L’utilisateur devra être informé lorsque :

- la caméra est utilisée ;
- le microphone est utilisé ;
- une photo est prise.

Ne pas conserver inutilement :

- voix ;
- images ;
- âge exact ;
- données personnelles ;
- historique permanent.

Les photos doivent être temporaires.

Les données de session doivent être supprimées à la fin de l’expérience.

---

## 17. État actuel du projet

Le projet vient d’être créé avec :

- React ;
- Vite ;
- JavaScript ;
- npm ;
- Git.

Le frontend se trouve dans :

```text
Artimir-V2/frontend
```

Le projet doit encore être nettoyé et organisé.

Aucune vraie page Artimir n’a encore été développée.

---

## 18. Priorité actuelle

La priorité actuelle est uniquement de créer la première base du frontend.

Ne pas développer maintenant :

- le backend ;
- l’IA ;
- le mapping ;
- le moteur ;
- la caméra ;
- le microphone ;
- le QR code ;
- le système photo réel.

La première étape doit créer :

- la structure du frontend ;
- la direction artistique ;
- la page d’accueil ;
- la transition vers une page de langue simple ;
- le système de navigation de base ;
- une première sauvegarde Git propre.

---

## 19. Première structure React recommandée

```text
frontend/src/
├── components/
│   ├── AnimatedBackground.jsx
│   ├── PrimaryButton.jsx
│   ├── PageTransition.jsx
│   └── ProgressIndicator.jsx
├── pages/
│   ├── HomePage.jsx
│   └── LanguagePage.jsx
├── context/
│   └── ExperienceContext.jsx
├── data/
│   └── languages.js
├── styles/
│   ├── variables.css
│   ├── global.css
│   └── animations.css
├── App.jsx
└── main.jsx
```

Cette structure peut être adaptée si une solution plus simple est préférable.

Ne pas créer une architecture inutilement complexe.

---

## 20. Résultat attendu à long terme

À terme, Artimir V2 doit être :

- stable ;
- rapide ;
- impressionnant ;
- facile à maintenir ;
- utilisable sans Cloudflared ;
- capable de fonctionner localement ;
- connecté au mapping ;
- connecté au moteur ;
- connecté à une intelligence artificielle ;
- adapté aux expositions ;
- facile à redémarrer ;
- facile à diagnostiquer en cas d’erreur.
