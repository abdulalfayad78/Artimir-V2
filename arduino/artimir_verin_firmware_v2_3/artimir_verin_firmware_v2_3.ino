/*
 * ARTIMIR - Firmware pilotage vérin (Elegoo Mega 2560 + module IBT-2 / BTS7960)
 * Communication : Série USB, commandes texte terminées par '\n'
 *
 * Commandes supportées :
 *   HOME              -> retour position de référence (butée basse, détectée par stall)
 *   MOVE:<mm>          -> déplace vers la position <mm> (ex: MOVE:120)
 *   STOP               -> arrêt immédiat
 *   STATUS             -> renvoie la position actuelle estimée (en mm)
 *   CALIB:<mm_par_sec> -> définit la vitesse de calibration (mm/s), débug uniquement
 *   ISTHRESH:<valeur>  -> définit le seuil de détection de stall (0-1023), débug
 *
 * Câblage module IBT-2 (nappe 8 fils, silkscreen en bas de la carte) :
 *   RPWM -> pin 5   (PWM, sens montée)
 *   LPWM -> pin 6   (PWM, sens descente)
 *   R_EN -> pin 7
 *   L_EN -> pin 8
 *   R_IS -> pin A0  (courant sens montée, analogique)
 *   L_IS -> pin A1  (courant sens descente, analogique)
 *   VCC  -> 5V
 *   GND  -> GND
 *
 * Détection de fin de course par STALL (pic de courant quand le vérin
 * bute mécaniquement) : plus besoin de fins de course physiques.
 * Le seuil ISEUIL_STALL est à calibrer sur le vérin réel.
 */

#define RPWM 5
#define LPWM 6
#define R_EN 7
#define L_EN 8

#define R_IS A1
#define L_IS A0

// --- À CALIBRER sur le vérin réel avant utilisation ---
float MM_PAR_SECONDE = 5.0;   // vitesse estimée du vérin en mm/s à pleine puissance
float COURSE_MAX_MM = 500.0;   // course totale du vérin en mm (mesurée)
int PWM_VITESSE = 200;         // 0-255
float DUREE_HOMING_MS = 40000; // temps mesuré pour aller du haut jusqu'en bas
unsigned long tempsDebutHoming = 0;
int ISEUIL_COUPURE = 30; // en dessous de ce seuil pendant DUREE_CONFIRMATION_COUPURE_MS = coupure interne détectée
unsigned long DUREE_CONFIRMATION_COUPURE_MS = 400; // le courant doit rester bas ce temps pour valider
unsigned long DELAI_IGNORER_DEMARRAGE_MS = 500; // ignore les premières ms après un ordre de mouvement

// --- État interne stall detection ---
unsigned long debutPicCourant = 0;
bool picCourantEnCours = false;

// --- État interne ---
float positionActuelle = 0.0;  // en mm, valide seulement après HOME
bool positionConnue = false;
unsigned long tempsDebutMouvement = 0;
float positionCible = 0.0;
int directionCourante = 0; // 1 = monte, -1 = descend, 0 = arrêt
bool enHoming = false;

String bufferSerie = "";

void setup() {
  Serial.begin(115200);

  pinMode(RPWM, OUTPUT);
  pinMode(LPWM, OUTPUT);
  pinMode(R_EN, OUTPUT);
  pinMode(L_EN, OUTPUT);

  pinMode(R_IS, INPUT);
  pinMode(L_IS, INPUT);

  digitalWrite(R_EN, HIGH);
  digitalWrite(L_EN, HIGH);
  arreterMoteur();


arreterMoteur();

positionActuelle = 0.0;
positionConnue = false;
directionCourante = 0;
enHoming = false;

Serial.println("READY");
}

// Attend soit une coupure interne détectée (courant bas et stable), soit un timeout de sécurité
void attendreCoupureOuTimeout(int pinCourant, unsigned long timeoutMs) {
  unsigned long debut = millis();
  unsigned long debutBas = 0;
  bool courantBasEnCours = false;

  while (millis() - debut < timeoutMs) {
    if (millis() - debut < DELAI_IGNORER_DEMARRAGE_MS) continue; // laisse le courant s'établir

    int courant = lireCourantLisse(pinCourant);
    if (courant <= ISEUIL_COUPURE) {
      if (!courantBasEnCours) {
        courantBasEnCours = true;
        debutBas = millis();
      } else if (millis() - debutBas >= DUREE_CONFIRMATION_COUPURE_MS) {
        return; // coupure confirmée, on sort avant le timeout
      }
    } else {
      courantBasEnCours = false;
    }
  }
  // timeout atteint sans coupure détectée : on s'arrête quand même par sécurité
}

void loop() {
  lireSerie();
  verifierStall();
  gererMouvement();
}

void lireSerie() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      traiterCommande(bufferSerie);
      bufferSerie = "";
    } else if (c != '\r') {
      bufferSerie += c;
    }
  }
}

void traiterCommande(String cmd) {
  cmd.trim();
  if (cmd == "SETHOME") {
    positionActuelle = 0.0;
    positionConnue = true;
    directionCourante = 0;
    arreterMoteur();
    Serial.println("OK:HOME_SET_MANUALLY");
  } else if (cmd == "HOME") {
    demarrerHoming();
    Serial.println("OK:HOMING");
  } else if (cmd.startsWith("MOVE:")) {
    if (!positionConnue) {
      Serial.println("ERR:POSITION_INCONNUE_FAIRE_HOME_DABORD");
      return;
    }
    float cible = cmd.substring(5).toFloat();
    cible = constrain(cible, 0, COURSE_MAX_MM);
    demarrerMouvementVers(cible);
    Serial.print("OK:MOVING_TO:");
    Serial.println(cible);
  } else if (cmd == "STOP") {
    arreterMoteur();
    directionCourante = 0;
    enHoming = false;
    Serial.println("OK:STOPPED");
  } else if (cmd == "STATUS") {
    Serial.print("POS:");
    Serial.print(positionConnue ? positionActuelle : -1);
    Serial.print(":KNOWN:");
    Serial.println(positionConnue ? "1" : "0");
  } else if (cmd.startsWith("CALIB:")) {
    MM_PAR_SECONDE = cmd.substring(6).toFloat();
    Serial.print("OK:CALIB_SET:");
    Serial.println(MM_PAR_SECONDE);
  } else if (cmd.startsWith("ISTHRESH:")) {
    ISEUIL_COUPURE = cmd.substring(9).toInt();
    Serial.print("OK:ISTHRESH_SET:");
    Serial.println(ISEUIL_COUPURE);
  } else if (cmd.startsWith("HOMEDUR:")) {
    DUREE_HOMING_MS = cmd.substring(8).toFloat();
    Serial.print("OK:HOMEDUR_SET:");
    Serial.println(DUREE_HOMING_MS);
  } else if (cmd == "ISDEBUG") {
    Serial.print("R_IS:");
    Serial.print(lireCourantLisse(R_IS));
    Serial.print(":L_IS:");
    Serial.println(lireCourantLisse(L_IS));
  } else {
    Serial.println("ERR:COMMANDE_INCONNUE");
  }
}

void demarrerHoming() {
  enHoming = true;
  positionConnue = false;
  tempsDebutHoming = millis();
  tempsDebutMouvement = millis();
  descendre();
}

void demarrerMouvementVers(float cible) {
  positionCible = cible;
  if (cible > positionActuelle) {
    monter();
  } else if (cible < positionActuelle) {
    descendre();
  } else {
    arreterMoteur();
  }
  tempsDebutMouvement = millis();
}

void gererMouvement() {
  if (directionCourante == 0) return;

  if (enHoming) {
    if (millis() - tempsDebutHoming >= DUREE_HOMING_MS) {
      arreterMoteur();
      enHoming = false;
      positionActuelle = 0.0;
      positionConnue = true;
      directionCourante = 0;
      Serial.println("EVENT:HOMED");
    }
    return;
  } // le homing s'arrête via verifierStall()

  unsigned long maintenant = millis();
  float deltaSec = (maintenant - tempsDebutMouvement) / 1000.0;
  float deplacement = deltaSec * MM_PAR_SECONDE * directionCourante;

  float positionEstimee = positionActuelle + deplacement;

  bool arrive = (directionCourante == 1 && positionEstimee >= positionCible) ||
                (directionCourante == -1 && positionEstimee <= positionCible);

  if (arrive) {
    positionActuelle = positionCible;
    arreterMoteur();
    directionCourante = 0;
    Serial.println("EVENT:ARRIVED");
  }
}

int lireCourantLisse(int pin) {
  int maxVal = 0;
  for (int i = 0; i < 10; i++) {
    int v = analogRead(pin);
    if (v > maxVal) maxVal = v;
  }
  return maxVal;
}

void verifierStall() {
  if (directionCourante == 0) return; // moteur à l'arrêt, rien à vérifier

  // Laisse le temps au courant de s'établir après le démarrage du mouvement
  if (millis() - tempsDebutMouvement < DELAI_IGNORER_DEMARRAGE_MS) return;

  int courant = (directionCourante == -1) ? lireCourantLisse(L_IS) : lireCourantLisse(R_IS);
  bool courantBas = (courant <= ISEUIL_COUPURE);

  if (courantBas) {
    if (!picCourantEnCours) {
      picCourantEnCours = true;
      debutPicCourant = millis();
    } else if (millis() - debutPicCourant >= DUREE_CONFIRMATION_COUPURE_MS) {
      // Coupure interne confirmée (le vérin s'est arrêté tout seul en fin de course)
      traiterStallConfirme();
    }
  } else {
    picCourantEnCours = false;
  }
}

void traiterStallConfirme() {
  arreterMoteur();
  picCourantEnCours = false;

  if (enHoming) {
    enHoming = false;
    positionActuelle = 0.0;
    positionConnue = true;
    directionCourante = 0;
    Serial.println("EVENT:HOMED");
  } else if (directionCourante == -1) {
    directionCourante = 0;
    positionActuelle = 0.0;
    Serial.println("EVENT:STALL_BAS");
  } else if (directionCourante == 1) {
    directionCourante = 0;
    positionActuelle = COURSE_MAX_MM;
    Serial.println("EVENT:STALL_HAUT");
  }
}

void monter() {
  analogWrite(RPWM, PWM_VITESSE);
  analogWrite(LPWM, 0);
  directionCourante = 1;
}

void descendre() {
  analogWrite(RPWM, 0);
  analogWrite(LPWM, PWM_VITESSE);
  directionCourante = -1;
}

void arreterMoteur() {
  analogWrite(RPWM, 0);
  analogWrite(LPWM, 0);
}
