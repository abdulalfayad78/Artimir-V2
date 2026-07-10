const defaultLanguage = 'fr'

const synchronizedExperienceTranslations = {
  fr: {
    customization: {
      step: 'ÉTAPE 03 — PERSONNALISATION',
      title: 'CHOISISSEZ VOTRE EXPÉRIENCE',
      description:
        'Indiquez la manière dont vous souhaitez découvrir Artimir.',
      optionsLabel: 'Styles d’expérience',
      options: {
        guided: {
          title: 'DÉCOUVERTE GUIDÉE',
          description: 'Une expérience claire, progressive et accompagnée.',
        },
        interactive: {
          title: 'DIALOGUE INTERACTIF',
          description: 'Une expérience rythmée par les échanges.',
        },
        surprise: {
          title: 'SURPRENEZ-MOI',
          description: 'Laissez Artimir choisir le rythme de la rencontre.',
        },
      },
      status:
        'Votre choix reste temporaire et sert uniquement à cette session.',
    },
    lookAtArtimir: {
      kicker: 'CONFIGURATION TERMINÉE',
      title: 'REGARDEZ MAINTENANT ARTIMIR',
      description:
        'Votre expérience est prête. Placez-vous devant l’installation et suivez les indications affichées sur l’écran principal.',
      syncLabel: 'Synchronisation avec Artimir',
    },
    displayWaiting: {
      kicker: 'EXPÉRIENCE CONNECTÉE',
      title: 'SCANNEZ POUR COMMENCER',
      scan: 'Scannez le QR code avec votre téléphone pour commencer.',
      phoneConnected: 'Téléphone connecté',
      profileProgress: 'Configuration de votre profil en cours',
      customizationProgress:
        'Personnalisation de l’expérience en cours',
      preparing: 'Préparation de votre expérience',
      connecting: 'Connexion au serveur local…',
      systemReady: 'SYSTÈME LOCAL PRÊT',
      sessionCode: 'CODE DE SESSION',
      qrAlt: 'QR code pour rejoindre la session Artimir',
    },
    sync: {
      session: 'SESSION ARTIMIR',
      sending: 'ENVOI EN COURS…',
      retry: 'RÉESSAYER',
      cancel: 'ANNULER',
      networkError:
        'La synchronisation a échoué. Vérifiez le réseau local puis réessayez.',
      preparing: 'Artimir prépare votre expérience…',
      positioningActive: 'Positionnement en cours sur Artimir',
      experienceActive: 'Expérience en cours',
      generating: 'Création en cours',
      resultSoon: 'Résultat bientôt disponible',
      unauthorizedTitle: 'ACCÈS CAMÉRA BLOQUÉ',
      unauthorizedCamera:
        'La caméra est réservée à l’écran principal d’Artimir.',
      legacyCameraRoute:
        'Cette ancienne adresse ne peut plus ouvrir la caméra. Rejoignez une session depuis le QR code Artimir.',
      connectingTitle: 'CONNEXION À ARTIMIR',
      connectingMessage:
        'Connexion au serveur local et récupération de la session…',
      alreadyUsedTitle: 'SESSION DÉJÀ UTILISÉE',
      alreadyUsedMessage:
        'Un autre téléphone est déjà associé à cette session.',
      invalidSessionTitle: 'SESSION INDISPONIBLE',
      invalidSessionMessage:
        'Cette session est invalide ou a expiré. Scannez le nouveau QR code affiché sur Artimir.',
      expiredTitle: 'SESSION EXPIRÉE',
      expiredMessage:
        'Cette session a expiré. Scannez le nouveau QR code affiché sur Artimir.',
      completeTitle: 'EXPÉRIENCE TERMINÉE',
      completeMessage:
        'Merci. Artimir est prêt à accueillir une nouvelle expérience.',
    },
    displayPlaceholder: {
      kicker: 'ÉCRAN PRINCIPAL ARTIMIR',
      experienceTitle: 'EXPÉRIENCE EN PRÉPARATION',
      experienceDescription:
        'Cette étape sera raccordée à l’expérience principale ultérieurement.',
      resultTitle: 'RÉSULTAT',
      resultDescription:
        'La page de résultat sera développée lors d’une prochaine étape.',
    },
  },
  en: {
    customization: {
      step: 'STEP 03 — PERSONALIZATION',
      title: 'CHOOSE YOUR EXPERIENCE',
      description: 'Choose how you would like to discover Artimir.',
      optionsLabel: 'Experience styles',
      options: {
        guided: {
          title: 'GUIDED DISCOVERY',
          description: 'A clear, progressive and guided experience.',
        },
        interactive: {
          title: 'INTERACTIVE DIALOGUE',
          description: 'An experience shaped by conversation.',
        },
        surprise: {
          title: 'SURPRISE ME',
          description: 'Let Artimir choose the rhythm of the encounter.',
        },
      },
      status:
        'Your choice is temporary and is used only for this session.',
    },
    lookAtArtimir: {
      kicker: 'SETUP COMPLETE',
      title: 'NOW LOOK AT ARTIMIR',
      description:
        'Your experience is ready. Stand in front of the installation and follow the instructions on the main screen.',
      syncLabel: 'Synchronizing with Artimir',
    },
    displayWaiting: {
      kicker: 'CONNECTED EXPERIENCE',
      title: 'SCAN TO BEGIN',
      scan: 'Scan the QR code with your phone to begin.',
      phoneConnected: 'Phone connected',
      profileProgress: 'Your profile is being configured',
      customizationProgress: 'Your experience is being personalized',
      preparing: 'Preparing your experience',
      connecting: 'Connecting to the local server…',
      systemReady: 'LOCAL SYSTEM READY',
      sessionCode: 'SESSION CODE',
      qrAlt: 'QR code to join the Artimir session',
    },
    sync: {
      session: 'ARTIMIR SESSION',
      sending: 'SENDING…',
      retry: 'TRY AGAIN',
      cancel: 'CANCEL',
      networkError:
        'Synchronization failed. Check the local network and try again.',
      preparing: 'Artimir is preparing your experience…',
      positioningActive: 'Positioning in progress on Artimir',
      experienceActive: 'Experience in progress',
      generating: 'Creation in progress',
      resultSoon: 'Your result will be ready soon',
      unauthorizedTitle: 'CAMERA ACCESS BLOCKED',
      unauthorizedCamera:
        'The camera is reserved for the main Artimir display.',
      legacyCameraRoute:
        'This old address can no longer open the camera. Join a session using the QR code on Artimir.',
      connectingTitle: 'CONNECTING TO ARTIMIR',
      connectingMessage:
        'Connecting to the local server and retrieving the session…',
      alreadyUsedTitle: 'SESSION ALREADY IN USE',
      alreadyUsedMessage:
        'Another phone is already connected to this session.',
      invalidSessionTitle: 'SESSION UNAVAILABLE',
      invalidSessionMessage:
        'This session is invalid or has expired. Scan the new QR code shown on Artimir.',
      expiredTitle: 'SESSION EXPIRED',
      expiredMessage:
        'This session has expired. Scan the new QR code shown on Artimir.',
      completeTitle: 'EXPERIENCE COMPLETE',
      completeMessage:
        'Thank you. Artimir is ready for a new experience.',
    },
    displayPlaceholder: {
      kicker: 'ARTIMIR MAIN DISPLAY',
      experienceTitle: 'EXPERIENCE IN PREPARATION',
      experienceDescription:
        'This step will be connected to the main experience later.',
      resultTitle: 'RESULT',
      resultDescription:
        'The result page will be developed in a future step.',
    },
  },
  ar: {
    customization: {
      step: 'الخطوة 03 — التخصيص',
      title: 'اختر تجربتك',
      description: 'حدّد الطريقة التي ترغب بها في اكتشاف Artimir.',
      optionsLabel: 'أنماط التجربة',
      options: {
        guided: {
          title: 'اكتشاف موجّه',
          description: 'تجربة واضحة ومتدرجة ومصحوبة بالإرشاد.',
        },
        interactive: {
          title: 'حوار تفاعلي',
          description: 'تجربة يتشكل إيقاعها من خلال الحوار.',
        },
        surprise: {
          title: 'فاجئني',
          description: 'دع Artimir يختار إيقاع اللقاء.',
        },
      },
      status: 'اختيارك مؤقت ويُستخدم لهذه الجلسة فقط.',
    },
    lookAtArtimir: {
      kicker: 'اكتمل الإعداد',
      title: 'انظر الآن إلى ARTIMIR',
      description:
        'تجربتك جاهزة. قف أمام التركيب واتبع التعليمات المعروضة على الشاشة الرئيسية.',
      syncLabel: 'المزامنة مع Artimir',
    },
    displayWaiting: {
      kicker: 'تجربة متصلة',
      title: 'امسح الرمز للبدء',
      scan: 'امسح رمز QR بهاتفك للبدء.',
      phoneConnected: 'تم اتصال الهاتف',
      profileProgress: 'جارٍ إعداد ملفك',
      customizationProgress: 'جارٍ تخصيص تجربتك',
      preparing: 'جارٍ تحضير تجربتك',
      connecting: 'جارٍ الاتصال بالخادم المحلي…',
      systemReady: 'النظام المحلي جاهز',
      sessionCode: 'رمز الجلسة',
      qrAlt: 'رمز QR للانضمام إلى جلسة Artimir',
    },
    sync: {
      session: 'جلسة ARTIMIR',
      sending: 'جارٍ الإرسال…',
      retry: 'إعادة المحاولة',
      cancel: 'إلغاء',
      networkError:
        'فشلت المزامنة. تحقق من الشبكة المحلية ثم أعد المحاولة.',
      preparing: 'يقوم Artimir بتحضير تجربتك…',
      positioningActive: 'جارٍ تحديد الوضعية على Artimir',
      experienceActive: 'التجربة جارية',
      generating: 'جارٍ الإنشاء',
      resultSoon: 'ستظهر النتيجة قريبًا',
      unauthorizedTitle: 'تم حظر الوصول إلى الكاميرا',
      unauthorizedCamera:
        'الكاميرا مخصصة للشاشة الرئيسية لـ Artimir.',
      legacyCameraRoute:
        'لم يعد هذا العنوان القديم قادرًا على فتح الكاميرا. انضم إلى جلسة عبر رمز QR المعروض على Artimir.',
      connectingTitle: 'جارٍ الاتصال بـ ARTIMIR',
      connectingMessage:
        'جارٍ الاتصال بالخادم المحلي واستعادة الجلسة…',
      alreadyUsedTitle: 'الجلسة مستخدمة بالفعل',
      alreadyUsedMessage: 'هناك هاتف آخر متصل بهذه الجلسة.',
      invalidSessionTitle: 'الجلسة غير متاحة',
      invalidSessionMessage:
        'هذه الجلسة غير صالحة أو منتهية. امسح رمز QR الجديد المعروض على Artimir.',
      expiredTitle: 'انتهت صلاحية الجلسة',
      expiredMessage:
        'انتهت صلاحية هذه الجلسة. امسح رمز QR الجديد المعروض على Artimir.',
      completeTitle: 'اكتملت التجربة',
      completeMessage: 'شكرًا لك. Artimir جاهز لتجربة جديدة.',
    },
    displayPlaceholder: {
      kicker: 'شاشة ARTIMIR الرئيسية',
      experienceTitle: 'جارٍ تحضير التجربة',
      experienceDescription:
        'سيتم ربط هذه الخطوة بالتجربة الرئيسية لاحقًا.',
      resultTitle: 'النتيجة',
      resultDescription: 'سيتم تطوير صفحة النتيجة في خطوة لاحقة.',
    },
  },
  es: {
    customization: {
      step: 'PASO 03 — PERSONALIZACIÓN',
      title: 'ELIGE TU EXPERIENCIA',
      description: 'Indica cómo quieres descubrir Artimir.',
      optionsLabel: 'Estilos de experiencia',
      options: {
        guided: {
          title: 'DESCUBRIMIENTO GUIADO',
          description: 'Una experiencia clara, progresiva y acompañada.',
        },
        interactive: {
          title: 'DIÁLOGO INTERACTIVO',
          description: 'Una experiencia marcada por la conversación.',
        },
        surprise: {
          title: 'SORPRÉNDEME',
          description: 'Deja que Artimir elija el ritmo del encuentro.',
        },
      },
      status:
        'Tu elección es temporal y solo se usa durante esta sesión.',
    },
    lookAtArtimir: {
      kicker: 'CONFIGURACIÓN COMPLETADA',
      title: 'MIRA AHORA A ARTIMIR',
      description:
        'Tu experiencia está lista. Colócate frente a la instalación y sigue las indicaciones de la pantalla principal.',
      syncLabel: 'Sincronización con Artimir',
    },
    displayWaiting: {
      kicker: 'EXPERIENCIA CONECTADA',
      title: 'ESCANEA PARA EMPEZAR',
      scan: 'Escanea el código QR con tu teléfono para empezar.',
      phoneConnected: 'Teléfono conectado',
      profileProgress: 'Configurando tu perfil',
      customizationProgress: 'Personalizando tu experiencia',
      preparing: 'Preparando tu experiencia',
      connecting: 'Conectando con el servidor local…',
      systemReady: 'SISTEMA LOCAL LISTO',
      sessionCode: 'CÓDIGO DE SESIÓN',
      qrAlt: 'Código QR para unirse a la sesión Artimir',
    },
    sync: {
      session: 'SESIÓN ARTIMIR',
      sending: 'ENVIANDO…',
      retry: 'REINTENTAR',
      cancel: 'CANCELAR',
      networkError:
        'La sincronización ha fallado. Comprueba la red local e inténtalo de nuevo.',
      preparing: 'Artimir está preparando tu experiencia…',
      positioningActive: 'Posicionamiento en curso en Artimir',
      experienceActive: 'Experiencia en curso',
      generating: 'Creación en curso',
      resultSoon: 'El resultado estará disponible pronto',
      unauthorizedTitle: 'ACCESO A LA CÁMARA BLOQUEADO',
      unauthorizedCamera:
        'La cámara está reservada para la pantalla principal de Artimir.',
      legacyCameraRoute:
        'Esta dirección antigua ya no puede abrir la cámara. Únete a una sesión con el código QR de Artimir.',
      connectingTitle: 'CONECTANDO CON ARTIMIR',
      connectingMessage:
        'Conectando con el servidor local y recuperando la sesión…',
      alreadyUsedTitle: 'SESIÓN YA EN USO',
      alreadyUsedMessage:
        'Ya hay otro teléfono conectado a esta sesión.',
      invalidSessionTitle: 'SESIÓN NO DISPONIBLE',
      invalidSessionMessage:
        'Esta sesión no es válida o ha caducado. Escanea el nuevo código QR mostrado en Artimir.',
      expiredTitle: 'SESIÓN CADUCADA',
      expiredMessage:
        'Esta sesión ha caducado. Escanea el nuevo código QR mostrado en Artimir.',
      completeTitle: 'EXPERIENCIA COMPLETADA',
      completeMessage:
        'Gracias. Artimir está listo para una nueva experiencia.',
    },
    displayPlaceholder: {
      kicker: 'PANTALLA PRINCIPAL ARTIMIR',
      experienceTitle: 'EXPERIENCIA EN PREPARACIÓN',
      experienceDescription:
        'Este paso se conectará más adelante con la experiencia principal.',
      resultTitle: 'RESULTADO',
      resultDescription:
        'La página de resultados se desarrollará en una etapa posterior.',
    },
  },
}

const translations = {
  fr: {
    ...synchronizedExperienceTranslations.fr,
    meta: {
      title: 'Artimir — L’art prend vie',
    },
    common: {
      artimir: 'ARTIMIR',
      kinophos: 'KINOPHOS',
      openKinophosSite: 'Ouvrir le site Kinophos',
      back: 'RETOUR',
      continue: 'CONTINUER',
      progress: 'Étape {{current}} sur {{total}}',
    },
    home: {
      presenter: 'KINOPHOS PRÉSENTE',
      statementAria: 'L’art prend vie.',
      statementLine1: 'L’ART',
      statementLine2: 'PREND',
      statementAccent: 'VIE.',
      descriptionLine1:
        'Découvrez une expérience immersive où l’œuvre vous observe,',
      descriptionLine2: 'vous parle et vous répond.',
      start: 'COMMENCER L’EXPÉRIENCE',
      footerExperience: 'EXPÉRIENCE CULTURELLE IMMERSIVE',
      footerReady: 'SYSTÈME PRÊT',
    },
    languagePage: {
      customize: 'PERSONNALISEZ VOTRE EXPÉRIENCE',
      title: 'CHOISISSEZ VOTRE LANGUE',
      description:
        'Sélectionnez la langue qui vous accompagnera tout au long de l’expérience.',
      availableLabel: 'Langues disponibles',
      statusPreparing:
        'Langue sélectionnée. Préparation de votre expérience…',
      statusSelected:
        'Langue sélectionnée. Touchez une autre langue pour la modifier.',
      statusPrompt: 'Touchez une langue pour la sélectionner.',
      footerStep: '01 — LANGUE',
    },
    profile: {
      step: 'ÉTAPE 02 — VOTRE PROFIL',
      title: 'PERSONNALISEZ VOTRE EXPÉRIENCE',
      description:
        'Quelques informations suffisent pour adapter la présentation de l’œuvre.',
      ageTitle: 'QUELLE EST VOTRE TRANCHE D’ÂGE ?',
      familiarityTitle:
        'QUEL EST VOTRE NIVEAU DE FAMILIARITÉ AVEC L’ART ?',
      statusComplete:
        'Vos deux réponses sont enregistrées pour cette session.',
      statusIncomplete:
        'Sélectionnez une réponse dans chaque section pour continuer.',
      age: {
        under_8: 'Moins de 8 ans',
        '8_12': '8 à 12 ans',
        '13_17': '13 à 17 ans',
        '18_30': '18 à 30 ans',
        '31_60': '31 à 60 ans',
        over_60: 'Plus de 60 ans',
      },
      familiarity: {
        beginner: 'Je découvre complètement l’art',
        basic: 'J’ai quelques connaissances',
        regular: 'Je m’intéresse régulièrement à l’art',
        advanced: 'J’ai de bonnes connaissances artistiques',
      },
    },
    positioning: {
      step: 'ÉTAPE 04 — POSITIONNEMENT',
      title: 'PLACEZ-VOUS DEVANT ARTIMIR',
      description:
        'Suivez les indications pour permettre à Artimir de préparer votre expérience.',
      instructionLabel: 'INSTRUCTION',
      camera: {
        stageLabel: 'Zone de positionnement assisté',
        previewLabel: 'Aperçu en direct de la caméra',
        localProcessing: 'TRAITEMENT LOCAL',
        loading: 'Autorisez l’accès vidéo pour démarrer la caméra…',
        privacy:
          'Caméra active — aucune image n’est enregistrée. Le traitement reste local.',
      },
      mode: {
        camera: 'CAMÉRA ACTIVE',
        demo: 'MODE MANUEL — DEBUG',
        demoDescription:
          'Mode manuel de développement : aucune détection réelle n’est effectuée.',
      },
      detection: {
        loading: 'Initialisation de la détection du visage…',
        unavailable:
          'La vidéo reste active, mais la détection du visage est indisponible.',
        detection_unavailable:
          'La vidéo reste active, mais aucun moteur de détection du visage n’a pu démarrer.',
        landmarks_unavailable:
          'La vidéo reste active, mais la validation complète des repères du visage est indisponible.',
        engine: 'DÉTECTION {{engine}}',
      },
      stability: {
        label: 'Progression de l’immobilité',
      },
      actions: {
        retry: 'RÉESSAYER',
        useDemo: 'ACTIVER LE MODE MANUEL',
        useCamera: 'RÉACTIVER LA CAMÉRA',
      },
      errors: {
        title: 'CAMÉRA INDISPONIBLE',
        permission_denied:
          'L’accès à la caméra a été refusé. Autorisez la caméra dans les réglages du navigateur puis réessayez.',
        no_camera:
          'Aucune caméra n’a été détectée.',
        camera_busy:
          'La caméra est peut-être déjà utilisée par une autre application.',
        camera_overconstrained:
          'La caméra ne prend pas en charge la configuration demandée.',
        camera_security:
          'L’accès à la caméra nécessite une connexion sécurisée.',
        camera_unsupported:
          'Ce navigateur ne permet pas d’utiliser la caméra.',
        stream_interrupted:
          'Le flux de la caméra a été interrompu.',
        detection_failed:
          'La détection du visage a rencontré une erreur. Aucune image n’a été conservée.',
        unknown:
          'Une erreur inattendue empêche l’utilisation de la caméra.',
      },
      instructions: {
        primary_camera_unavailable:
          'La caméra de positionnement est indisponible',
        detection_error: 'La détection doit être relancée',
        invalid_data: 'Replacez-vous clairement face à Artimir',
        face_not_detected: 'Placez votre visage dans le cadre',
        face_outside_roi: 'Placez-vous dans la zone de détection',
        multiple_faces:
          'Une seule personne doit se trouver dans la zone de détection',
        data_stale: 'Repositionnez-vous légèrement',
        reacquiring: 'Restez en place, détection en cours',
        too_far: 'Avancez légèrement',
        too_close: 'Reculez légèrement',
        move_left: 'Déplacez-vous vers la gauche',
        move_right: 'Déplacez-vous vers la droite',
        move_up: 'Relevez-vous légèrement',
        move_down: 'Baissez-vous légèrement',
        straighten_head: 'Redressez légèrement la tête',
        look_forward: 'Regardez droit devant vous',
        lower_head: 'Baissez légèrement la tête',
        raise_head: 'Relevez légèrement la tête',
        movement_too_high: 'Ne bougez plus',
        secondary_blocked: 'Repositionnez-vous légèrement',
        look_at_camera: 'Regardez la caméra — simulation',
        hold_still: 'Parfait, restez immobile',
        position_correct: 'Position correcte',
      },
      criteria: {
        kicker: 'CONTRÔLE EN TEMPS RÉEL',
        title: 'REPÈRES DE POSITION',
        face: 'Visage détecté',
        distance: 'Distance correcte',
        center: 'Position centrée',
        orientation: 'Orientation du visage',
        stillness: 'Immobilité',
        status: {
          waiting: 'En attente',
          current: 'En cours',
          valid: 'Validé',
          lost: 'Perdu — à reprendre',
        },
      },
      cameraSelector: {
        label: 'Caméra de test',
        defaultCamera: 'Caméra par défaut',
        cameraNumber: 'Caméra {{number}}',
      },
      debug: {
        kicker: 'MAINTENANCE',
        title: 'OUTILS DE POSITIONNEMENT',
      },
      validation: {
        single: 'VALIDATION CAMÉRA DE TEST',
        multi: 'VALIDATION MULTI-CAMÉRAS',
      },
      diagnostics: {
        kicker: 'DIAGNOSTIC DÉVELOPPEMENT',
        title: 'ÉTAT DU POSITIONNEMENT',
        singleModeNotice:
          'Mode développement : seule la caméra supérieure est active.',
      },
      demo: {
        kicker: 'OUTIL DE DÉVELOPPEMENT',
        title: 'SIMULATION MANUELLE',
        description:
          'Choisissez un état pour tester l’interface. Ces commandes ne représentent pas une détection réelle.',
        controlsLabel: 'États simulés de positionnement',
      },
    },
    heightAdjustment: {
      step: 'ÉTAPE 05 — RÉGLAGE DE LA HAUTEUR',
      title: 'ARTIMIR AJUSTE SA HAUTEUR',
      description:
        'Restez à distance de la structure pendant son déplacement simulé.',
      currentStatus: 'ÉTAT ACTUEL',
      currentPosition: 'Position simulée',
      targetPosition: 'Position cible de démonstration',
      direction: 'Sens du mouvement',
      mode: 'Contrôleur',
      progress: 'Progression du mouvement',
      notAvailable: '—',
      safety:
        'Restez à distance de la machine jusqu’à la confirmation finale.',
      completeMessage:
        'Réglage terminé. Artimir passe à la sélection de l’œuvre.',
      status: {
        disconnected: 'Connexion au contrôleur',
        idle: 'Prêt',
        measuring: 'Mesure simulée en cours',
        moving_up: 'Montée en cours',
        moving_down: 'Descente en cours',
        homing: 'Référence de hauteur en cours',
        settling: 'Stabilisation',
        verifying: 'Vérification',
        complete: 'Réglage terminé',
        stopped: 'Mouvement arrêté',
        error: 'Erreur du contrôleur',
        emergency_stop: 'Arrêt d’urgence actif',
      },
      directionValue: {
        up: 'Montée',
        down: 'Descente',
        none: 'Immobile',
      },
      modeValue: {
        simulation: 'Simulation',
        localService: 'Service local',
        hardware: 'Matériel',
      },
      actions: {
        stop: 'ARRÊTER',
      },
      errors: {
        MOVEMENT_TIMEOUT: 'Le mouvement simulé a dépassé le délai autorisé.',
        SIMULATED_ERROR: 'Une erreur de développement a été simulée.',
        HARDWARE_NOT_IMPLEMENTED:
          'Le contrôleur matériel n’est pas encore implémenté.',
        LOCAL_SERVICE_UNAVAILABLE:
          'Le service moteur local est indisponible.',
        LOCAL_SERVICE_TIMEOUT:
          'Le service moteur local ne répond pas dans le délai prévu.',
        POSITION_UNKNOWN:
          'Référence de hauteur requise avant tout mouvement.',
        COMMAND_IN_PROGRESS: 'Une commande moteur est déjà en cours.',
      },
      visual: {
        ariaLabel:
          'Position verticale simulée du mécanisme de hauteur',
      },
      debug: {
        kicker: 'OUTIL DE DÉVELOPPEMENT',
        title: 'COMMANDES DU SIMULATEUR',
        noHardwareNotice:
          'Simulation uniquement. Aucun vérin ou matériel physique n’est commandé.',
        refreshStatus: 'Actualiser le statut',
        home: 'HOME',
        confirmHome:
          'Confirmer HOME ? La machine cherchera sa référence basse.',
        to5: 'Aller à 5 mm',
        to10: 'Aller à 10 mm',
        clearError: 'Effacer l’erreur locale',
        up10: 'Monter de 10 mm',
        down10: 'Descendre de 10 mm',
        to100: 'Aller à 100 mm',
        to300: 'Aller à 300 mm',
        error: 'Simuler une erreur',
        emergency: 'Simuler un arrêt d’urgence',
        rearm: 'Réarmer',
        reset: 'Réinitialiser',
        armAutomatic: 'Armer le test automatique unique',
        rearmAutomatic: 'Réarmer un déplacement automatique',
      },
      observation: {
        kicker: 'ANALYSE CAMÉRA',
        title: 'Analyse de votre hauteur',
        stageLabel: 'Zone d’observation caméra pour la hauteur',
        stability: 'Échantillons stables : {{count}}',
        recommendations: {
          artimir_should_move_up: 'Artimir devra monter',
          artimir_should_move_down: 'Artimir devra descendre',
          height_correct: 'Hauteur correcte',
          face_unstable: 'Restez immobile',
          face_not_detected: 'Replacez-vous face à Artimir',
          reacquiring: 'Analyse en cours',
        },
        camera: {
          camera_loading: 'Caméra en préparation',
          camera_active: 'Caméra active',
          camera_error: 'Caméra indisponible',
        },
        detection: {
          detection_loading: 'Détection en préparation',
          detection_active: 'Détection active',
          detection_error: 'Détection indisponible',
        },
      },
      automatic: {
        target: 'Cible prévue : {{target}} mm',
        status: {
          disabled: 'Observation uniquement',
          observing_unarmed: 'Observation uniquement — test non armé',
          observing: 'Analyse de votre hauteur. Restez immobile',
          armed: 'Ajustement automatique prêt',
          moving_once: 'Artimir se déplace légèrement',
          waiting_for_settle: 'Vérification de la nouvelle hauteur',
          remeasuring: 'Nouvelle mesure en cours',
          completed_once: 'Premier ajustement terminé',
          blocked: 'Ajustement automatique bloqué',
          error: 'Erreur pendant l’ajustement automatique',
        },
      },
      referenceRequired: 'Référence de hauteur requise',
    },
    artworkSelection: {
      step: 'ÉTAPE 06 — CHOIX DE L’ŒUVRE',
      title: 'CHOIX DE L’ŒUVRE',
      placeholder: 'Choix de l’œuvre — bientôt disponible',
    },
  },
  en: {
    ...synchronizedExperienceTranslations.en,
    meta: {
      title: 'Artimir — Art comes alive',
    },
    common: {
      artimir: 'ARTIMIR',
      kinophos: 'KINOPHOS',
      openKinophosSite: 'Open the Kinophos website',
      back: 'BACK',
      continue: 'CONTINUE',
      progress: 'Step {{current}} of {{total}}',
    },
    home: {
      presenter: 'KINOPHOS PRESENTS',
      statementAria: 'Art comes alive.',
      statementLine1: 'ART',
      statementLine2: 'COMES',
      statementAccent: 'ALIVE.',
      descriptionLine1:
        'Discover an immersive experience where the artwork watches you,',
      descriptionLine2: 'speaks to you and answers you.',
      start: 'START THE EXPERIENCE',
      footerExperience: 'IMMERSIVE CULTURAL EXPERIENCE',
      footerReady: 'SYSTEM READY',
    },
    languagePage: {
      customize: 'PERSONALIZE YOUR EXPERIENCE',
      title: 'CHOOSE YOUR LANGUAGE',
      description:
        'Select the language that will guide you throughout the experience.',
      availableLabel: 'Available languages',
      statusPreparing: 'Language selected. Preparing your experience…',
      statusSelected:
        'Language selected. Choose another language to change it.',
      statusPrompt: 'Select a language to continue.',
      footerStep: '01 — LANGUAGE',
    },
    profile: {
      step: 'STEP 02 — YOUR PROFILE',
      title: 'PERSONALIZE YOUR EXPERIENCE',
      description:
        'A few details are enough to tailor the artwork presentation.',
      ageTitle: 'WHAT IS YOUR AGE RANGE?',
      familiarityTitle: 'HOW FAMILIAR ARE YOU WITH ART?',
      statusComplete: 'Your two answers are saved for this session.',
      statusIncomplete: 'Select one answer in each section to continue.',
      age: {
        under_8: 'Under 8',
        '8_12': '8 to 12',
        '13_17': '13 to 17',
        '18_30': '18 to 30',
        '31_60': '31 to 60',
        over_60: 'Over 60',
      },
      familiarity: {
        beginner: 'I am completely new to art',
        basic: 'I have some knowledge',
        regular: 'I take a regular interest in art',
        advanced: 'I have a good knowledge of art',
      },
    },
    positioning: {
      step: 'STEP 04 — POSITIONING',
      title: 'STAND IN FRONT OF ARTIMIR',
      description:
        'Follow the guidance so Artimir can prepare your experience.',
      instructionLabel: 'INSTRUCTION',
      camera: {
        stageLabel: 'Assisted positioning area',
        previewLabel: 'Live camera preview',
        localProcessing: 'LOCAL PROCESSING',
        loading: 'Allow video access to start the camera…',
        privacy:
          'Camera active — no image is recorded. Processing stays local.',
      },
      mode: {
        camera: 'CAMERA ACTIVE',
        demo: 'MANUAL MODE — DEBUG',
        demoDescription:
          'Manual development mode: no real detection is taking place.',
      },
      detection: {
        loading: 'Initializing face detection…',
        unavailable:
          'Video remains active, but face detection is unavailable.',
        detection_unavailable:
          'Video remains active, but no face detection engine could start.',
        landmarks_unavailable:
          'Video remains active, but complete facial landmark validation is unavailable.',
        engine: '{{engine}} DETECTION',
      },
      stability: {
        label: 'Stillness progress',
      },
      actions: {
        retry: 'TRY AGAIN',
        useDemo: 'ENABLE MANUAL MODE',
        useCamera: 'REACTIVATE CAMERA',
      },
      errors: {
        title: 'CAMERA UNAVAILABLE',
        permission_denied:
          'Camera access was denied. Allow camera access in your browser settings, then try again.',
        no_camera: 'No camera was detected.',
        camera_busy:
          'The camera may already be in use by another application.',
        camera_overconstrained:
          'The camera does not support the requested configuration.',
        camera_security:
          'Camera access requires a secure connection.',
        camera_unsupported:
          'This browser does not support camera access.',
        stream_interrupted: 'The camera stream was interrupted.',
        detection_failed:
          'Face detection encountered an error. No image was retained.',
        unknown: 'An unexpected error is preventing camera access.',
      },
      instructions: {
        primary_camera_unavailable:
          'The positioning camera is unavailable',
        detection_error: 'Face detection must be restarted',
        invalid_data: 'Stand clearly in front of Artimir',
        face_not_detected: 'Place your face inside the frame',
        face_outside_roi: 'Move into the detection area',
        multiple_faces:
          'Only one person should be inside the detection area',
        data_stale: 'Adjust your position slightly',
        reacquiring: 'Hold your position while detection resumes',
        too_far: 'Move slightly closer',
        too_close: 'Move slightly back',
        move_left: 'Move to your left',
        move_right: 'Move to your right',
        move_up: 'Move slightly upward',
        move_down: 'Move slightly downward',
        straighten_head: 'Straighten your head slightly',
        look_forward: 'Look straight ahead',
        lower_head: 'Lower your head slightly',
        raise_head: 'Raise your head slightly',
        movement_too_high: 'Hold still',
        secondary_blocked: 'Adjust your position slightly',
        look_at_camera: 'Look at the camera — simulation',
        hold_still: 'Perfect, hold still',
        position_correct: 'Position correct',
      },
      criteria: {
        kicker: 'REAL-TIME CHECK',
        title: 'POSITION MARKERS',
        face: 'Face detected',
        distance: 'Correct distance',
        center: 'Centered position',
        orientation: 'Face orientation',
        stillness: 'Stillness',
        status: {
          waiting: 'Waiting',
          current: 'In progress',
          valid: 'Validated',
          lost: 'Lost — try again',
        },
      },
      cameraSelector: {
        label: 'Test camera',
        defaultCamera: 'Default camera',
        cameraNumber: 'Camera {{number}}',
      },
      debug: {
        kicker: 'MAINTENANCE',
        title: 'POSITIONING TOOLS',
      },
      validation: {
        single: 'TEST CAMERA VALIDATION',
        multi: 'MULTI-CAMERA VALIDATION',
      },
      diagnostics: {
        kicker: 'DEVELOPMENT DIAGNOSTICS',
        title: 'POSITIONING STATE',
        singleModeNotice:
          'Development mode: only the upper camera is active.',
      },
      demo: {
        kicker: 'DEVELOPMENT TOOL',
        title: 'MANUAL SIMULATION',
        description:
          'Choose a state to test the interface. These controls do not represent real detection.',
        controlsLabel: 'Simulated positioning states',
      },
    },
    heightAdjustment: {
      step: 'STEP 05 — HEIGHT ADJUSTMENT',
      title: 'ARTIMIR IS ADJUSTING ITS HEIGHT',
      description:
        'Keep clear of the structure during its simulated movement.',
      currentStatus: 'CURRENT STATUS',
      currentPosition: 'Simulated position',
      targetPosition: 'Demonstration target',
      direction: 'Movement direction',
      mode: 'Controller',
      progress: 'Movement progress',
      notAvailable: '—',
      safety:
        'Keep clear of the machine until the final confirmation appears.',
      completeMessage:
        'Adjustment complete. Artimir is moving to artwork selection.',
      status: {
        disconnected: 'Connecting to controller',
        idle: 'Ready',
        measuring: 'Simulated measurement in progress',
        moving_up: 'Moving up',
        moving_down: 'Moving down',
        homing: 'Height reference in progress',
        settling: 'Settling',
        verifying: 'Verifying',
        complete: 'Adjustment complete',
        stopped: 'Movement stopped',
        error: 'Controller error',
        emergency_stop: 'Emergency stop active',
      },
      directionValue: {
        up: 'Up',
        down: 'Down',
        none: 'Stationary',
      },
      modeValue: {
        simulation: 'Simulation',
        localService: 'Local service',
        hardware: 'Hardware',
      },
      actions: {
        stop: 'STOP',
      },
      errors: {
        MOVEMENT_TIMEOUT: 'The simulated movement exceeded its time limit.',
        SIMULATED_ERROR: 'A development error was simulated.',
        HARDWARE_NOT_IMPLEMENTED:
          'The hardware controller is not implemented yet.',
        LOCAL_SERVICE_UNAVAILABLE:
          'The local motor service is unavailable.',
        LOCAL_SERVICE_TIMEOUT:
          'The local motor service did not answer in time.',
        POSITION_UNKNOWN:
          'Height reference required before any movement.',
        COMMAND_IN_PROGRESS: 'A motor command is already in progress.',
      },
      visual: {
        ariaLabel:
          'Simulated vertical position of the height mechanism',
      },
      debug: {
        kicker: 'DEVELOPMENT TOOL',
        title: 'SIMULATOR CONTROLS',
        noHardwareNotice:
          'Simulation only. No actuator or physical hardware is being controlled.',
        refreshStatus: 'Refresh status',
        home: 'HOME',
        confirmHome:
          'Confirm HOME? The machine will search for its lower reference.',
        to5: 'Go to 5 mm',
        to10: 'Go to 10 mm',
        clearError: 'Clear local error',
        up10: 'Move up 10 mm',
        down10: 'Move down 10 mm',
        to100: 'Go to 100 mm',
        to300: 'Go to 300 mm',
        error: 'Simulate an error',
        emergency: 'Simulate emergency stop',
        rearm: 'Rearm',
        reset: 'Reset',
        armAutomatic: 'Arm the one-time automatic test',
        rearmAutomatic: 'Rearm automatic movement',
      },
      observation: {
        kicker: 'CAMERA ANALYSIS',
        title: 'Height analysis',
        stageLabel: 'Camera observation area for height',
        stability: 'Stable samples: {{count}}',
        recommendations: {
          artimir_should_move_up: 'Artimir should move up',
          artimir_should_move_down: 'Artimir should move down',
          height_correct: 'Height correct',
          face_unstable: 'Stay still',
          face_not_detected: 'Stand facing Artimir again',
          reacquiring: 'Analysis in progress',
        },
        camera: {
          camera_loading: 'Camera preparing',
          camera_active: 'Camera active',
          camera_error: 'Camera unavailable',
        },
        detection: {
          detection_loading: 'Detection preparing',
          detection_active: 'Detection active',
          detection_error: 'Detection unavailable',
        },
      },
      automatic: {
        target: 'Planned target: {{target}} mm',
        status: {
          disabled: 'Observation only',
          observing_unarmed: 'Observation only — test not armed',
          observing: 'Height analysis. Stay still',
          armed: 'Automatic adjustment ready',
          moving_once: 'Artimir is moving slightly',
          waiting_for_settle: 'Checking the new height',
          remeasuring: 'New measurement in progress',
          completed_once: 'First adjustment complete',
          blocked: 'Automatic adjustment blocked',
          error: 'Automatic adjustment error',
        },
      },
      referenceRequired: 'Height reference required',
    },
    artworkSelection: {
      step: 'STEP 06 — ARTWORK SELECTION',
      title: 'ARTWORK SELECTION',
      placeholder: 'Artwork selection — coming soon',
    },
  },
  ar: {
    ...synchronizedExperienceTranslations.ar,
    meta: {
      title: 'Artimir — الفن ينبض بالحياة',
    },
    common: {
      artimir: 'ARTIMIR',
      kinophos: 'KINOPHOS',
      openKinophosSite: 'فتح موقع Kinophos',
      back: 'رجوع',
      continue: 'متابعة',
      progress: 'الخطوة {{current}} من {{total}}',
    },
    home: {
      presenter: 'تقدّم KINOPHOS',
      statementAria: 'الفن ينبض بالحياة.',
      statementLine1: 'الفن',
      statementLine2: 'ينبض',
      statementAccent: 'بالحياة.',
      descriptionLine1: 'اكتشف تجربة غامرة يراقبك فيها العمل الفني،',
      descriptionLine2: 'ويتحدث إليك ويجيب عن أسئلتك.',
      start: 'ابدأ التجربة',
      footerExperience: 'تجربة ثقافية غامرة',
      footerReady: 'النظام جاهز',
    },
    languagePage: {
      customize: 'خصّص تجربتك',
      title: 'اختر لغتك',
      description: 'اختر اللغة التي سترافقك طوال التجربة.',
      availableLabel: 'اللغات المتاحة',
      statusPreparing: 'تم اختيار اللغة. جارٍ إعداد تجربتك…',
      statusSelected: 'تم اختيار اللغة. اختر لغة أخرى لتغييرها.',
      statusPrompt: 'اختر لغة للمتابعة.',
      footerStep: '01 — اللغة',
    },
    profile: {
      step: 'الخطوة 02 — ملفك',
      title: 'خصّص تجربتك',
      description: 'تكفي بعض المعلومات لتكييف تقديم العمل الفني.',
      ageTitle: 'ما فئتك العمرية؟',
      familiarityTitle: 'ما مدى معرفتك بالفن؟',
      statusComplete: 'تم حفظ إجابتيك لهذه الجلسة.',
      statusIncomplete: 'اختر إجابة واحدة في كل قسم للمتابعة.',
      age: {
        under_8: 'أقل من 8 سنوات',
        '8_12': 'من 8 إلى 12 سنة',
        '13_17': 'من 13 إلى 17 سنة',
        '18_30': 'من 18 إلى 30 سنة',
        '31_60': 'من 31 إلى 60 سنة',
        over_60: 'أكثر من 60 سنة',
      },
      familiarity: {
        beginner: 'أكتشف الفن لأول مرة',
        basic: 'لدي بعض المعرفة',
        regular: 'أهتم بالفن بانتظام',
        advanced: 'لدي معرفة فنية جيدة',
      },
    },
    positioning: {
      step: 'الخطوة 04 — تحديد الوضعية',
      title: 'قف أمام ARTIMIR',
      description:
        'اتبع الإرشادات حتى يتمكن Artimir من إعداد تجربتك.',
      instructionLabel: 'التعليمات',
      camera: {
        stageLabel: 'منطقة تحديد الوضعية بمساعدة الكاميرا',
        previewLabel: 'معاينة مباشرة للكاميرا',
        localProcessing: 'معالجة محلية',
        loading: 'اسمح بالوصول إلى الفيديو لتشغيل الكاميرا…',
        privacy:
          'الكاميرا نشطة — لا يتم تسجيل أي صورة. تتم المعالجة محليًا فقط.',
      },
      mode: {
        camera: 'الكاميرا نشطة',
        demo: 'الوضع اليدوي — تصحيح',
        demoDescription:
          'وضع تطوير يدوي: لا يتم إجراء أي كشف حقيقي.',
      },
      detection: {
        loading: 'جارٍ تهيئة كشف الوجه…',
        unavailable:
          'يبقى الفيديو نشطًا، لكن كشف الوجه غير متاح.',
        detection_unavailable:
          'يبقى الفيديو نشطًا، لكن تعذر تشغيل أي محرك لكشف الوجه.',
        landmarks_unavailable:
          'يبقى الفيديو نشطًا، لكن التحقق الكامل من معالم الوجه غير متاح.',
        engine: 'كشف {{engine}}',
      },
      stability: {
        label: 'تقدم الثبات',
      },
      actions: {
        retry: 'إعادة المحاولة',
        useDemo: 'تفعيل الوضع اليدوي',
        useCamera: 'إعادة تشغيل الكاميرا',
      },
      errors: {
        title: 'الكاميرا غير متاحة',
        permission_denied:
          'تم رفض الوصول إلى الكاميرا. اسمح باستخدامها في إعدادات المتصفح ثم أعد المحاولة.',
        no_camera: 'لم يتم اكتشاف أي كاميرا.',
        camera_busy:
          'قد يكون تطبيق آخر يستخدم الكاميرا حاليًا.',
        camera_overconstrained:
          'لا تدعم الكاميرا الإعدادات المطلوبة.',
        camera_security:
          'يتطلب الوصول إلى الكاميرا اتصالًا آمنًا.',
        camera_unsupported:
          'هذا المتصفح لا يدعم الوصول إلى الكاميرا.',
        stream_interrupted: 'تم قطع بث الكاميرا.',
        detection_failed:
          'حدث خطأ أثناء كشف الوجه. لم يتم الاحتفاظ بأي صورة.',
        unknown: 'يمنع خطأ غير متوقع استخدام الكاميرا.',
      },
      instructions: {
        primary_camera_unavailable:
          'كاميرا تحديد الوضعية غير متاحة',
        detection_error: 'يجب إعادة تشغيل اكتشاف الوجه',
        invalid_data: 'قف بوضوح أمام أرتيمير',
        face_not_detected: 'ضع وجهك داخل الإطار',
        face_outside_roi: 'تحرك إلى داخل منطقة الاكتشاف',
        multiple_faces:
          'يجب أن يوجد شخص واحد فقط داخل منطقة الاكتشاف',
        data_stale: 'عدّل وضعيتك قليلًا',
        reacquiring: 'ابقَ في مكانك أثناء استئناف الاكتشاف',
        too_far: 'اقترب قليلًا',
        too_close: 'ابتعد قليلًا',
        move_left: 'تحرك نحو اليسار',
        move_right: 'تحرك نحو اليمين',
        move_up: 'تحرك إلى الأعلى قليلًا',
        move_down: 'تحرك إلى الأسفل قليلًا',
        straighten_head: 'عدّل ميل رأسك قليلًا',
        look_forward: 'انظر مباشرة إلى الأمام',
        lower_head: 'اخفض رأسك قليلًا',
        raise_head: 'ارفع رأسك قليلًا',
        movement_too_high: 'ابقَ ثابتًا',
        secondary_blocked: 'عدّل وضعيتك قليلًا',
        look_at_camera: 'انظر إلى الكاميرا — محاكاة',
        hold_still: 'ممتاز، ابقَ ثابتًا',
        position_correct: 'الوضعية صحيحة',
      },
      criteria: {
        kicker: 'فحص فوري',
        title: 'مؤشرات الوضعية',
        face: 'تم كشف الوجه',
        distance: 'المسافة صحيحة',
        center: 'الوضعية في المنتصف',
        orientation: 'اتجاه الوجه',
        stillness: 'الثبات',
        status: {
          waiting: 'في الانتظار',
          current: 'قيد الفحص',
          valid: 'تم التحقق',
          lost: 'فُقد — أعد المحاولة',
        },
      },
      cameraSelector: {
        label: 'كاميرا الاختبار',
        defaultCamera: 'الكاميرا الافتراضية',
        cameraNumber: 'الكاميرا {{number}}',
      },
      debug: {
        kicker: 'الصيانة',
        title: 'أدوات تحديد الوضعية',
      },
      validation: {
        single: 'التحقق بكاميرا الاختبار',
        multi: 'التحقق بعدة كاميرات',
      },
      diagnostics: {
        kicker: 'تشخيص التطوير',
        title: 'حالة تحديد الوضعية',
        singleModeNotice:
          'وضع التطوير: الكاميرا العلوية فقط هي النشطة.',
      },
      demo: {
        kicker: 'أداة تطوير',
        title: 'محاكاة يدوية',
        description:
          'اختر حالة لاختبار الواجهة. لا تمثل هذه الأزرار كشفًا حقيقيًا.',
        controlsLabel: 'حالات تحديد الوضعية المحاكية',
      },
    },
    heightAdjustment: {
      step: 'الخطوة 05 — ضبط الارتفاع',
      title: 'أرتيمير يضبط ارتفاعه',
      description:
        'ابقَ بعيدًا عن الهيكل أثناء حركته المحاكية.',
      currentStatus: 'الحالة الحالية',
      currentPosition: 'الموضع المحاكى',
      targetPosition: 'الهدف التجريبي',
      direction: 'اتجاه الحركة',
      mode: 'وحدة التحكم',
      progress: 'تقدم الحركة',
      notAvailable: '—',
      safety:
        'ابقَ بعيدًا عن الآلة حتى تظهر رسالة التأكيد النهائية.',
      completeMessage:
        'اكتمل الضبط. ينتقل Artimir إلى اختيار العمل الفني.',
      status: {
        disconnected: 'جارٍ الاتصال بوحدة التحكم',
        idle: 'جاهز',
        measuring: 'جارٍ القياس المحاكى',
        moving_up: 'جارٍ الارتفاع',
        moving_down: 'جارٍ الانخفاض',
        homing: 'جارٍ ضبط مرجع الارتفاع',
        settling: 'جارٍ الاستقرار',
        verifying: 'جارٍ التحقق',
        complete: 'اكتمل الضبط',
        stopped: 'توقفت الحركة',
        error: 'خطأ في وحدة التحكم',
        emergency_stop: 'إيقاف الطوارئ مفعّل',
      },
      directionValue: {
        up: 'إلى الأعلى',
        down: 'إلى الأسفل',
        none: 'ثابت',
      },
      modeValue: {
        simulation: 'محاكاة',
        localService: 'الخدمة المحلية',
        hardware: 'معدات',
      },
      actions: {
        stop: 'إيقاف',
      },
      errors: {
        MOVEMENT_TIMEOUT: 'تجاوزت الحركة المحاكية المهلة المسموح بها.',
        SIMULATED_ERROR: 'تمت محاكاة خطأ لأغراض التطوير.',
        HARDWARE_NOT_IMPLEMENTED:
          'لم يتم تنفيذ وحدة التحكم المادية بعد.',
        LOCAL_SERVICE_UNAVAILABLE: 'خدمة المحرك المحلية غير متاحة.',
        LOCAL_SERVICE_TIMEOUT:
          'لم تستجب خدمة المحرك المحلية في الوقت المحدد.',
        POSITION_UNKNOWN: 'يلزم ضبط مرجع الارتفاع قبل أي حركة.',
        COMMAND_IN_PROGRESS: 'توجد أمر محرك قيد التنفيذ بالفعل.',
      },
      visual: {
        ariaLabel: 'الموضع الرأسي المحاكى لآلية الارتفاع',
      },
      debug: {
        kicker: 'أداة تطوير',
        title: 'أوامر المحاكي',
        noHardwareNotice:
          'هذه محاكاة فقط. لا يتم التحكم في أي مشغل أو جهاز فعلي.',
        refreshStatus: 'تحديث الحالة',
        home: 'HOME',
        confirmHome:
          'تأكيد HOME؟ ستبحث الآلة عن مرجعها السفلي.',
        to5: 'الانتقال إلى 5 مم',
        to10: 'الانتقال إلى 10 مم',
        clearError: 'مسح الخطأ المحلي',
        up10: 'رفع 10 مم',
        down10: 'خفض 10 مم',
        to100: 'الانتقال إلى 100 مم',
        to300: 'الانتقال إلى 300 مم',
        error: 'محاكاة خطأ',
        emergency: 'محاكاة إيقاف الطوارئ',
        rearm: 'إعادة التسليح',
        reset: 'إعادة الضبط',
        armAutomatic: 'تسليح اختبار تلقائي واحد',
        rearmAutomatic: 'إعادة تسليح حركة تلقائية',
      },
      observation: {
        kicker: 'تحليل الكاميرا',
        title: 'تحليل ارتفاعك',
        stageLabel: 'منطقة مراقبة الكاميرا للارتفاع',
        stability: 'العينات المستقرة: {{count}}',
        recommendations: {
          artimir_should_move_up: 'يجب أن يرتفع Artimir',
          artimir_should_move_down: 'يجب أن ينخفض Artimir',
          height_correct: 'الارتفاع صحيح',
          face_unstable: 'ابقَ ثابتًا',
          face_not_detected: 'تموضع مجددًا أمام Artimir',
          reacquiring: 'التحليل جارٍ',
        },
        camera: {
          camera_loading: 'جارٍ تجهيز الكاميرا',
          camera_active: 'الكاميرا نشطة',
          camera_error: 'الكاميرا غير متاحة',
        },
        detection: {
          detection_loading: 'جارٍ تجهيز الكشف',
          detection_active: 'الكشف نشط',
          detection_error: 'الكشف غير متاح',
        },
      },
      automatic: {
        target: 'الهدف المخطط: {{target}} مم',
        status: {
          disabled: 'مراقبة فقط',
          observing_unarmed: 'مراقبة فقط — الاختبار غير مسلح',
          observing: 'تحليل ارتفاعك. ابقَ ثابتًا',
          armed: 'الضبط التلقائي جاهز',
          moving_once: 'يتحرك Artimir قليلًا',
          waiting_for_settle: 'التحقق من الارتفاع الجديد',
          remeasuring: 'جارٍ أخذ قياس جديد',
          completed_once: 'اكتمل أول ضبط',
          blocked: 'تم حظر الضبط التلقائي',
          error: 'خطأ أثناء الضبط التلقائي',
        },
      },
      referenceRequired: 'يلزم ضبط مرجع الارتفاع',
    },
    artworkSelection: {
      step: 'الخطوة 06 — اختيار العمل الفني',
      title: 'اختيار العمل الفني',
      placeholder: 'اختيار العمل الفني — قريبًا',
    },
  },
  es: {
    ...synchronizedExperienceTranslations.es,
    meta: {
      title: 'Artimir — El arte cobra vida',
    },
    common: {
      artimir: 'ARTIMIR',
      kinophos: 'KINOPHOS',
      openKinophosSite: 'Abrir el sitio web de Kinophos',
      back: 'VOLVER',
      continue: 'CONTINUAR',
      progress: 'Paso {{current}} de {{total}}',
    },
    home: {
      presenter: 'KINOPHOS PRESENTA',
      statementAria: 'El arte cobra vida.',
      statementLine1: 'EL ARTE',
      statementLine2: 'COBRA',
      statementAccent: 'VIDA.',
      descriptionLine1:
        'Descubre una experiencia inmersiva donde la obra te observa,',
      descriptionLine2: 'te habla y responde a tus preguntas.',
      start: 'COMENZAR LA EXPERIENCIA',
      footerExperience: 'EXPERIENCIA CULTURAL INMERSIVA',
      footerReady: 'SISTEMA LISTO',
    },
    languagePage: {
      customize: 'PERSONALIZA TU EXPERIENCIA',
      title: 'ELIGE TU IDIOMA',
      description:
        'Selecciona el idioma que te acompañará durante toda la experiencia.',
      availableLabel: 'Idiomas disponibles',
      statusPreparing: 'Idioma seleccionado. Preparando tu experiencia…',
      statusSelected:
        'Idioma seleccionado. Elige otro idioma para cambiarlo.',
      statusPrompt: 'Selecciona un idioma para continuar.',
      footerStep: '01 — IDIOMA',
    },
    profile: {
      step: 'PASO 02 — TU PERFIL',
      title: 'PERSONALIZA TU EXPERIENCIA',
      description:
        'Unos pocos datos bastan para adaptar la presentación de la obra.',
      ageTitle: '¿CUÁL ES TU FRANJA DE EDAD?',
      familiarityTitle: '¿QUÉ TANTO CONOCES EL ARTE?',
      statusComplete: 'Tus dos respuestas están guardadas para esta sesión.',
      statusIncomplete:
        'Selecciona una respuesta en cada sección para continuar.',
      age: {
        under_8: 'Menos de 8 años',
        '8_12': 'De 8 a 12 años',
        '13_17': 'De 13 a 17 años',
        '18_30': 'De 18 a 30 años',
        '31_60': 'De 31 a 60 años',
        over_60: 'Más de 60 años',
      },
      familiarity: {
        beginner: 'Estoy descubriendo el arte',
        basic: 'Tengo algunos conocimientos',
        regular: 'Me intereso regularmente por el arte',
        advanced: 'Tengo buenos conocimientos artísticos',
      },
    },
    positioning: {
      step: 'PASO 04 — POSICIONAMIENTO',
      title: 'COLÓCATE FRENTE A ARTIMIR',
      description:
        'Sigue las indicaciones para que Artimir pueda preparar tu experiencia.',
      instructionLabel: 'INSTRUCCIÓN',
      camera: {
        stageLabel: 'Zona de posicionamiento asistido',
        previewLabel: 'Vista previa de la cámara en directo',
        localProcessing: 'PROCESAMIENTO LOCAL',
        loading: 'Permite el acceso al vídeo para iniciar la cámara…',
        privacy:
          'Cámara activa — no se graba ninguna imagen. El procesamiento es local.',
      },
      mode: {
        camera: 'CÁMARA ACTIVA',
        demo: 'MODO MANUAL — DEBUG',
        demoDescription:
          'Modo manual de desarrollo: no se realiza ninguna detección real.',
      },
      detection: {
        loading: 'Inicializando la detección facial…',
        unavailable:
          'El vídeo sigue activo, pero la detección facial no está disponible.',
        detection_unavailable:
          'El vídeo sigue activo, pero no se pudo iniciar ningún motor de detección facial.',
        landmarks_unavailable:
          'El vídeo sigue activo, pero la validación completa de los puntos faciales no está disponible.',
        engine: 'DETECCIÓN {{engine}}',
      },
      stability: {
        label: 'Progreso de inmovilidad',
      },
      actions: {
        retry: 'REINTENTAR',
        useDemo: 'ACTIVAR EL MODO MANUAL',
        useCamera: 'REACTIVAR LA CÁMARA',
      },
      errors: {
        title: 'CÁMARA NO DISPONIBLE',
        permission_denied:
          'Se ha rechazado el acceso a la cámara. Permite la cámara en los ajustes del navegador y vuelve a intentarlo.',
        no_camera: 'No se ha detectado ninguna cámara.',
        camera_busy:
          'Es posible que otra aplicación ya esté utilizando la cámara.',
        camera_overconstrained:
          'La cámara no admite la configuración solicitada.',
        camera_security:
          'El acceso a la cámara requiere una conexión segura.',
        camera_unsupported:
          'Este navegador no permite acceder a la cámara.',
        stream_interrupted: 'La transmisión de la cámara se ha interrumpido.',
        detection_failed:
          'La detección facial ha encontrado un error. No se ha conservado ninguna imagen.',
        unknown: 'Un error inesperado impide utilizar la cámara.',
      },
      instructions: {
        primary_camera_unavailable:
          'La cámara de posicionamiento no está disponible',
        detection_error: 'Es necesario reiniciar la detección',
        invalid_data: 'Colócate claramente frente a Artimir',
        face_not_detected: 'Coloca tu rostro dentro del marco',
        face_outside_roi: 'Colócate dentro de la zona de detección',
        multiple_faces:
          'Solo una persona debe estar en la zona de detección',
        data_stale: 'Recolócate ligeramente',
        reacquiring: 'Mantén la posición mientras se reanuda la detección',
        too_far: 'Acércate un poco',
        too_close: 'Aléjate un poco',
        move_left: 'Muévete hacia la izquierda',
        move_right: 'Muévete hacia la derecha',
        move_up: 'Sube ligeramente',
        move_down: 'Baja ligeramente',
        straighten_head: 'Endereza ligeramente la cabeza',
        look_forward: 'Mira al frente',
        lower_head: 'Baja ligeramente la cabeza',
        raise_head: 'Levanta ligeramente la cabeza',
        movement_too_high: 'No te muevas',
        secondary_blocked: 'Recolócate ligeramente',
        look_at_camera: 'Mira a la cámara — simulación',
        hold_still: 'Perfecto, no te muevas',
        position_correct: 'Posición correcta',
      },
      criteria: {
        kicker: 'CONTROL EN TIEMPO REAL',
        title: 'REFERENCIAS DE POSICIÓN',
        face: 'Rostro detectado',
        distance: 'Distancia correcta',
        center: 'Posición centrada',
        orientation: 'Orientación del rostro',
        stillness: 'Inmovilidad',
        status: {
          waiting: 'En espera',
          current: 'En curso',
          valid: 'Validado',
          lost: 'Perdido — inténtalo de nuevo',
        },
      },
      cameraSelector: {
        label: 'Cámara de prueba',
        defaultCamera: 'Cámara predeterminada',
        cameraNumber: 'Cámara {{number}}',
      },
      debug: {
        kicker: 'MANTENIMIENTO',
        title: 'HERRAMIENTAS DE POSICIONAMIENTO',
      },
      validation: {
        single: 'VALIDACIÓN DE CÁMARA DE PRUEBA',
        multi: 'VALIDACIÓN MULTICÁMARA',
      },
      diagnostics: {
        kicker: 'DIAGNÓSTICO DE DESARROLLO',
        title: 'ESTADO DEL POSICIONAMIENTO',
        singleModeNotice:
          'Modo de desarrollo: solo está activa la cámara superior.',
      },
      demo: {
        kicker: 'HERRAMIENTA DE DESARROLLO',
        title: 'SIMULACIÓN MANUAL',
        description:
          'Elige un estado para probar la interfaz. Estos controles no representan una detección real.',
        controlsLabel: 'Estados simulados de posicionamiento',
      },
    },
    heightAdjustment: {
      step: 'PASO 05 — AJUSTE DE ALTURA',
      title: 'ARTIMIR AJUSTA SU ALTURA',
      description:
        'Mantente alejado de la estructura durante su movimiento simulado.',
      currentStatus: 'ESTADO ACTUAL',
      currentPosition: 'Posición simulada',
      targetPosition: 'Objetivo de demostración',
      direction: 'Dirección del movimiento',
      mode: 'Controlador',
      progress: 'Progreso del movimiento',
      notAvailable: '—',
      safety:
        'Mantente alejado de la máquina hasta la confirmación final.',
      completeMessage:
        'Ajuste completado. Artimir pasa a la selección de obra.',
      status: {
        disconnected: 'Conectando con el controlador',
        idle: 'Listo',
        measuring: 'Medición simulada en curso',
        moving_up: 'Subiendo',
        moving_down: 'Bajando',
        homing: 'Referencia de altura en curso',
        settling: 'Estabilizando',
        verifying: 'Verificando',
        complete: 'Ajuste completado',
        stopped: 'Movimiento detenido',
        error: 'Error del controlador',
        emergency_stop: 'Parada de emergencia activa',
      },
      directionValue: {
        up: 'Subida',
        down: 'Bajada',
        none: 'Inmóvil',
      },
      modeValue: {
        simulation: 'Simulación',
        localService: 'Servicio local',
        hardware: 'Hardware',
      },
      actions: {
        stop: 'DETENER',
      },
      errors: {
        MOVEMENT_TIMEOUT: 'El movimiento simulado superó el tiempo permitido.',
        SIMULATED_ERROR: 'Se simuló un error de desarrollo.',
        HARDWARE_NOT_IMPLEMENTED:
          'El controlador físico aún no está implementado.',
        LOCAL_SERVICE_UNAVAILABLE:
          'El servicio local del motor no está disponible.',
        LOCAL_SERVICE_TIMEOUT:
          'El servicio local del motor no respondió a tiempo.',
        POSITION_UNKNOWN:
          'Se requiere una referencia de altura antes de mover.',
        COMMAND_IN_PROGRESS: 'Ya hay un comando de motor en curso.',
      },
      visual: {
        ariaLabel:
          'Posición vertical simulada del mecanismo de altura',
      },
      debug: {
        kicker: 'HERRAMIENTA DE DESARROLLO',
        title: 'CONTROLES DEL SIMULADOR',
        noHardwareNotice:
          'Solo simulación. No se controla ningún actuador ni equipo físico.',
        refreshStatus: 'Actualizar estado',
        home: 'HOME',
        confirmHome:
          '¿Confirmar HOME? La máquina buscará su referencia inferior.',
        to5: 'Ir a 5 mm',
        to10: 'Ir a 10 mm',
        clearError: 'Borrar error local',
        up10: 'Subir 10 mm',
        down10: 'Bajar 10 mm',
        to100: 'Ir a 100 mm',
        to300: 'Ir a 300 mm',
        error: 'Simular un error',
        emergency: 'Simular parada de emergencia',
        rearm: 'Rearmar',
        reset: 'Restablecer',
        armAutomatic: 'Armar la prueba automática única',
        rearmAutomatic: 'Rearmar movimiento automático',
      },
      observation: {
        kicker: 'ANÁLISIS DE CÁMARA',
        title: 'Análisis de tu altura',
        stageLabel: 'Zona de observación de cámara para la altura',
        stability: 'Muestras estables: {{count}}',
        recommendations: {
          artimir_should_move_up: 'Artimir deberá subir',
          artimir_should_move_down: 'Artimir deberá bajar',
          height_correct: 'Altura correcta',
          face_unstable: 'Quédate inmóvil',
          face_not_detected: 'Vuelve a colocarte frente a Artimir',
          reacquiring: 'Análisis en curso',
        },
        camera: {
          camera_loading: 'Cámara preparándose',
          camera_active: 'Cámara activa',
          camera_error: 'Cámara no disponible',
        },
        detection: {
          detection_loading: 'Detección preparándose',
          detection_active: 'Detección activa',
          detection_error: 'Detección no disponible',
        },
      },
      automatic: {
        target: 'Objetivo previsto: {{target}} mm',
        status: {
          disabled: 'Solo observación',
          observing_unarmed: 'Solo observación — prueba no armada',
          observing: 'Análisis de tu altura. Quédate inmóvil',
          armed: 'Ajuste automático listo',
          moving_once: 'Artimir se mueve ligeramente',
          waiting_for_settle: 'Comprobando la nueva altura',
          remeasuring: 'Nueva medición en curso',
          completed_once: 'Primer ajuste terminado',
          blocked: 'Ajuste automático bloqueado',
          error: 'Error durante el ajuste automático',
        },
      },
      referenceRequired: 'Referencia de altura requerida',
    },
    artworkSelection: {
      step: 'PASO 06 — SELECCIÓN DE OBRA',
      title: 'SELECCIÓN DE OBRA',
      placeholder: 'Selección de obra — próximamente',
    },
  },
}

function getTranslation(dictionary, key) {
  return key
    .split('.')
    .reduce((value, segment) => value?.[segment], dictionary)
}

function interpolate(message, variables) {
  return message.replace(
    /\{\{(\w+)\}\}/g,
    (_, name) => variables[name] ?? `{{${name}}}`,
  )
}

function translate(language, key, variables = {}) {
  const activeLanguage = translations[language] ? language : defaultLanguage
  const message =
    getTranslation(translations[activeLanguage], key) ??
    getTranslation(translations[defaultLanguage], key)

  return typeof message === 'string'
    ? interpolate(message, variables)
    : key
}

export { defaultLanguage, translations, translate }
