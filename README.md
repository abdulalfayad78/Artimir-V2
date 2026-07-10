# Artimir V2

Artimir utilise deux interfaces synchronisées par un serveur Socket.IO
local :

- écran principal : `http://localhost:5173/#/display` ;
- téléphone : URL réseau encodée dans le QR code de l’écran.

Le téléphone collecte uniquement la langue, le profil et le style
d’expérience. La webcam et MediaPipe sont chargés exclusivement sur la
route display de positionnement.

## Installation

```text
npm install
npm --prefix frontend install
```

## Développement

```text
npm run dev
```

Cette commande lance :

- Vite sur `0.0.0.0:5173` ;
- le serveur Socket.IO sur `0.0.0.0:3001`.

Les ports et la durée de session peuvent être modifiés avec les
variables documentées dans `.env.example`.

## Test sur un seul PC

1. Ouvrir `http://localhost:5173/#/display`.
2. Ouvrir l’URL du QR code dans une fenêtre privée ou un autre profil.
3. Compléter le parcours téléphone.
4. Vérifier qu’après « Continuer », le téléphone affiche « Regardez
   maintenant Artimir » et que seul le display ouvre le positionnement.

## Test avec un téléphone

Le PC et le téléphone doivent être sur le même réseau local. Ouvrir la
route display sur le PC puis scanner le QR code. Si Windows le demande,
autoriser Node.js sur les réseaux privés pour les ports TCP 5173 et
3001. Aucun service cloud n’est utilisé.

## Vérifications

```text
npm test
npm run lint
npm run build
```
