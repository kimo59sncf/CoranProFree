# Sources des données & audio

> Conformément au principe de transparence du projet (§22), ce document recense
> la provenance des données coraniques, des traductions et de l'audio utilisé
> par CoranProFree.
>
> **Aucun texte coranique ni aucun audio n'est généré par IA.**

## Texte arabe du Coran

- **Contenu** : texte arabe complet (114 sourates, 6 236 versets) en écriture
  Uthmani avec signes diacritiques.
- **Emplacement** : `data/quran-part-*.ts`.
- **Source probable** : corpus Uthmani standardisé (style Tanzil / KFGQPC).
- **Licence** : ⚠️ **à confirmer et documenter explicitement avant diffusion
  publique.** Le texte coranique n'est pas soumis au droit d'auteur, mais la
  **transcription numérique** peut l'être.

## Noms et traductions des sourates

- Le champ `translation` des sourates contient actuellement le **nom anglais**
  des sourates (ex. « The Opening », « The Cow »).
- Les traductions **verset par verset** ne sont pas encore embarquées (champ
  `translation` des versets vide). Prévu dans une phase ultérieure.

## Audio (récitations)

- **Récitateur** : Mishary Rashid Alafasy — Murattal, 128 kbps.
- **URL de diffusion** :
  `https://everyayah.com/data/Alafasy_128kbps/{surah}{ayah}.mp3`
  (un fichier MP3 par verset).
- **Fournisseur** : [EveryAyah.com](https://everyayah.com).
- **Licence** : ⚠️ les récitations d'EveryAyah sont redistribuées librement, mais
  la licence exacte varie selon le récitateur ; **à confirmer et attribuer
  correctement avant diffusion publique.**

## Traductions (éditions)

Architecture prête (`data/quran.ts` → `translationEditions`). **Aucun texte de
traduction n'est embarqué** tant que la licence n'est pas confirmée.

| id | Langue | Auteur / édition | Source | Licence |
|----|--------|------------------|--------|---------|
| `fr.hamidullah` | Français | Muhammad Hamidullah | Tanzil / alquran.cloud | ⚠️ LICENCE À CONFIRMER |
| `en.sahih` | English | Saheeh International | Tanzil / alquran.cloud | ⚠️ © Saheeh International — À CONFIRMER |
| `ar.muyassar` | Arabe | التفسير الميسّر | King Fahd Quran Complex | ⚠️ LICENCE À CONFIRMER |

- **Statut** : non activées (`enabled: false`) — ne pas présenter comme prêtes pour production.
- **Intégration prévue** : `LOCAL BUNDLE` (si licence libre) ou `REMOTE FETCH + CACHE` (AsyncStorage).
- **URL de référence** : `https://api.alquran.cloud/v1/surah/{n}/{edition}`.

## Images des récitateurs

- Aucune **image réelle** (photo) de récitateur n'est embarquée : aucune source
  officiellement licenciée n'a été validée à ce jour.
- Un **avatar neutre premium** (initiales sur pastille colorée) est utilisé en
  fallback partout (écran Récitateurs, MiniPlayer, Player).
- Le type `Reciter` comporte un champ `image?: string | null` prêt à recevoir
  une URL d'image **dont la licence est confirmée** (fallback automatique si
  l'image ne charge pas).

## Données utilisateur (privées, locales)

Favoris de versets, historique de recherche, progression de lecture/écoute et
statistiques sont stockés **localement** (AsyncStorage) — aucune synchronisation
serveur, aucun envoi de données religieuses. Voir `lib/types.ts`.

