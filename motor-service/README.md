# Artimir local motor service

Service Python local indépendant pour dialoguer avec l'Arduino du réglage de hauteur.

Le frontend React n'est pas connecté à ce service dans cette étape.

## Périmètre

- API FastAPI locale sur `127.0.0.1:8000`.
- Mode `simulation` par défaut.
- Mode `hardware` configurable avec `pyserial`.
- Commandes autorisées vers Arduino : `STATUS`, `STOP`, `MOVE:<mm>`, `HOME`.
- Lecture continue des événements asynchrones dans un seul thread série.
- Aucun endpoint relatif, `HOME` ou `CALIB`.

## Installation

```bash
cd motor-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
```

## Lancement

```bash
python -m uvicorn app.api:app --host 127.0.0.1 --port 8000 --reload
```

## Configuration

Copier `.env.example` vers `.env`.

Valeurs principales :

```env
MOTOR_HOST=127.0.0.1
MOTOR_PORT=8000
MOTOR_MODE=simulation
```

URLs locales utiles :

```text
http://127.0.0.1:8000
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/health
```

Pour le hardware :

```env
MOTOR_MODE=hardware
MOTOR_SERIAL_PORT=COM3
MOTOR_SERIAL_BAUDRATE=115200
```

Si `hardware` est configuré sans port valide, le service démarre mais expose un état `disconnected` avec une erreur normalisée.

## Endpoints

```http
GET /health
GET /motor/status
POST /motor/stop
POST /motor/move-to
POST /motor/home
GET /motor/events
```

## Protocole Arduino attendu

Lignes parsées :

```text
READY
POS:<valeur>:KNOWN:<0 ou 1>
OK:STOPPED
OK:MOVING_TO:<valeur>
OK:HOMING
EVENT:*
ERR:*
```

Exemples STATUS :

```text
POS:250.00:KNOWN:1
POS:-1:KNOWN:0
```

Les événements `EVENT:*` sont stockés dans un buffer circulaire horodaté.

## Mouvement limité

`POST /motor/move-to` accepte uniquement :

```json
{
  "target_mm": 55.0
}
```

Règles :

- position actuelle connue obligatoire ;
- cible entre 0 et 500 mm ;
- écart maximal de 10 mm par requête par défaut ;
- aucun enchaînement automatique ;
- le service attend `OK:MOVING_TO:<valeur>` puis `EVENT:ARRIVED` ;
- en cas de timeout de mouvement, le service tente `STOP` et retourne une erreur normalisée.

## Homing contrôlé

`POST /motor/home` déclenche explicitement :

```text
HOME
← OK:HOMING
← EVENT:HOMED
```

La position n'est marquée connue à `0.0 mm` qu'après `EVENT:HOMED`.
En cas de timeout, le service tente `STOP`, conserve la position inconnue et retourne une erreur normalisée.

## Tests

```bash
python -m pytest
```

Les tests ne nécessitent aucun Arduino réel.
