# Déploiement Render — Artimir V2

Ce document prépare un déploiement provisoire sur Render avec deux services publics :

- frontend Vite : `https://artimir-app.onrender.com`
- serveur Node.js / Socket.IO : `https://artimir-api.onrender.com`

Le service moteur Python ne doit jamais être déployé sur Render. Il reste uniquement sur l’ordinateur Artimir :

```text
http://127.0.0.1:8000
```

## Prérequis GitHub

1. Avoir le dépôt Artimir-V2 sur GitHub.
2. Vérifier que les fichiers suivants sont présents à la racine :
   - `package.json`
   - `server/index.js`
   - `render.yaml`
   - `frontend/package.json`
3. Ne pas pousser de fichier `.env`, `.env.local` ou secret réel.

## Déploiement avec render.yaml

Dans Render :

1. Créer un nouveau Blueprint.
2. Connecter le dépôt GitHub Artimir-V2.
3. Sélectionner le fichier `render.yaml`.
4. Render doit créer exactement deux services :
   - `artimir-app`
   - `artimir-api`

## Services attendus

### artimir-app

Type : Static Site

Configuration :

```text
rootDir: frontend
buildCommand: npm ci && npm run build
staticPublishPath: ./dist
```

Variables :

```env
VITE_SOCKET_URL=https://artimir-api.onrender.com
VITE_PUBLIC_APP_URL=https://artimir-app.onrender.com
VITE_MOTOR_SERVICE_URL=http://127.0.0.1:8000
```

### artimir-api

Type : Web Service Node.js

Configuration :

```text
buildCommand: npm ci
startCommand: npm run start:server
healthCheckPath: /health
```

Variables :

```env
NODE_ENV=production
PUBLIC_APP_ORIGIN=https://artimir-app.onrender.com
```

Ajouter manuellement dans Render, sans valeur dans Git :

```env
DEVICE_SECRET
```

`PORT` ne doit pas être défini manuellement : Render le fournit automatiquement.

## Test en 4G/5G

1. Ouvrir `https://artimir-app.onrender.com/#/display` sur l’écran Artimir.
2. Vérifier que le serveur répond sur `https://artimir-api.onrender.com/health`.
3. Créer une session depuis l’écran display.
4. Scanner le QR code avec un téléphone connecté en 4G/5G.
5. Vérifier que le téléphone ouvre une URL du type :

```text
https://artimir-app.onrender.com/#/phone/languages?session=XXXXXX
```

6. Vérifier que l’écran et le téléphone avancent dans la même session.

## Retour au mode local

Pour travailler en local :

```bash
npm run dev
```

Dans `frontend/.env.local`, garder :

```env
VITE_SOCKET_URL=
VITE_PUBLIC_APP_URL=
VITE_MOTOR_SERVICE_URL=http://127.0.0.1:8000
```

Les deux premières variables vides conservent le comportement local automatique.

## Service moteur local

Le service moteur reste local :

```bash
cd motor-service
python -m uvicorn app.api:app --host 127.0.0.1 --port 8000 --reload
```

Ne pas déployer `motor-service` sur Render.
Ne pas exposer le port `8000` sur Internet.
Le téléphone ne doit jamais appeler directement le service moteur.

## Sessions et redémarrages Render

Les sessions sont actuellement stockées en mémoire dans le serveur Node.js.

Conséquences :

- si Render redémarre `artimir-api`, les sessions actives sont perdues ;
- le QR code déjà affiché ne correspond plus à une session existante ;
- l’écran Artimir doit régénérer une nouvelle session et afficher un nouveau QR code.

Une persistance externe, par exemple Redis, pourra être étudiée plus tard si nécessaire.
