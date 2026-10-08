# CoranProFree

Application gratuite et open source de lecture, d'écoute, de compréhension et de
mémorisation du Coran — pensée **mobile-first**, offline-ready et multilingue.

Ce dépôt est un **monorepo pnpm** hérité d'un environnement Replit, en cours de
portage vers un développement local standard.

---

## Prérequis

- **Node.js ≥ 20** (testé avec Node 24)
- **pnpm 9** (voir installation ci-dessous)

> ⚠️ `pnpm` n'est pas fourni avec Node. Installez-le avant toute commande.

### Installer pnpm

```bash
# Option A — via Corepack (inclus avec Node 24)
corepack enable pnpm

# Option B — via npm (installation globale)
npm install -g pnpm@9
```

Vérifiez :

```bash
node --version   # v24.x
pnpm --version   # 9.x
```

---

## Installation

```bash
pnpm install
```

Cela installe toutes les dépendances de l'ensemble des packages du workspace.

---

## Lancer l'application (Expo / React Native)

L'application principale vit dans `artifacts/quran-pro-audio`.

```bash
# Depuis la racine du workspace
pnpm dev          # lance Expo (Metro) — choisissez ensuite la plateforme
pnpm dev:web      # lance directement dans le navigateur (react-native-web)
```

Ou depuis le package directement :

```bash
pnpm --filter @workspace/quran-pro-audio run dev:web
```

| Commande              | Description                                    |
| --------------------- | ---------------------------------------------- |
| `pnpm dev`            | Démarre Metro (Expo)                           |
| `pnpm dev:web`        | Démarre en mode navigateur                     |
| `pnpm dev:android`    | Démarre et ouvre sur un émulateur/appareil Android |
| `pnpm dev:ios`        | Démarre et ouvre sur un simulateur iOS (macOS) |

---

## Autres commandes utiles

```bash
# Vérification TypeScript complète du workspace
pnpm typecheck

# Build de production (typecheck + build de tous les packages)
pnpm build

# Formatage (Prettier)
pnpm format

# API server (artifacts/api-server) — nécessite DATABASE_URL + PORT
pnpm --filter @workspace/api-server run dev

# Tests unitaires du cœur (normalisation arabe + streak)
pnpm test

# Export web de production (dossier dist/)
pnpm --filter @workspace/quran-pro-audio run build
```

---

## Build & déploiement

### Web (production)

```bash
pnpm --filter @workspace/quran-pro-audio run build   # expo export --platform web
```

Le résultat est dans `artifacts/quran-pro-audio/dist/` — déployable sur tout
hébergement statique (Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.).

### Android / iOS (natif)

Le projet est prêt pour **EAS Build** (`artifacts/quran-pro-audio/eas.json`) :

```bash
pnpm --filter @workspace/quran-pro-audio exec eas build --profile preview
```

Nécessite un compte [Expo EAS](https://expo.dev/eas) (`eas login`).

### CarPlay (iOS) — ⚠️ blocage externe

CarPlay est une fonctionnalité **native iOS** qui requiert :
- un **Apple Developer Account** + l'entitlement `com.apple.developer.carplay-audio` ;
- un environnement **macOS + Xcode** (indisponible sur Windows) ;
- du **code natif Swift** (scène CarPlay, `MPNowPlayingInfoCenter`,
  `MPRemoteCommandCenter`) + un **config plugin Expo** ;
- un **véhicule/écran CarPlay** pour valider en conditions réelles.

**Statut** : non implémenté (bloqué par l'absence de compte Apple + macOS).
L'architecture audio est prête à être synchronisée avec la session audio native
(un seul `AudioContext`), mais le code CarPlay reste à écrire côté natif.

### CI

Un workflow GitHub Actions (`.github/workflows/ci.yml`) exécute :
`typecheck` → `test` → `export web` à chaque push/PR.

---

## Structure du projet

```
CoranProFree-main/
├── artifacts/
│   ├── quran-pro-audio/        # App principale (Expo Router + expo-audio)
│   │   ├── app/                # Écrans : Home, Library, Player, Reciters, Hifz
│   │   ├── context/            # AudioContext (lecture, favoris, playlists, downloads)
│   │   ├── services/audio/     # Gestion audio & téléchargements offline
│   │   ├── data/               # Texte arabe complet (114 sourates / 6236 versets)
│   │   ├── components/         # MiniPlayer, Artwork, Waveform, NetworkBanner, etc.
│   │   ├── hooks/              # useColors, useNetworkStatus
│   │   ├── public/             # PWA : manifest.json + icône
│   │   └── constants/          # Design tokens
│   └── api-server/             # API Express 5 (health check)
├── lib/
│   ├── api-spec/               # Spécification OpenAPI + codegen (Orval)
│   ├── api-client-react/       # Client React Query généré
│   ├── api-zod/                # Schémas Zod générés
│   └── db/                     # Schéma Drizzle (PostgreSQL)
└── scripts/                    # Scripts utilitaires
```

---

## Variables d'environnement

Copiez `.env.example` vers `.env` puis renseignez les valeurs utiles.
La plupart des variables ne sont nécessaires que si vous exécutez l'API server
(`DATABASE_URL`, `PORT`) — l'app Expo fonctionne hors ligne sans configuration.

---

## Notes

- Le texte coranique arabe est embarqué localement (pas d'appel réseau pour lire).
- L'audio est diffusé depuis `everyayah.com` (MP3 par verset) et peut être
  téléchargé pour l'écoute hors ligne.
- L'app est **offline-first** : le Coran, les favoris, la dernière lecture et les
  audios téléchargés fonctionnent sans connexion (détection réseau via
  `expo-network`).
- **PWA** : `manifest.json` + icône + thème sont générés (`public/`). Le
  `<link rel="manifest">` est injecté par `app/+html.tsx` en mode
  `web.output: 'static'` (non activé par défaut pour éviter le SSR avec expo-audio).
- Le projet n'utilise **aucune publicité** et minimise la collecte de données.
