# ConfessX

Application web de confessions anonymes, mobile-first, ultra-rapide.
Stack : **Next.js 14 App Router · React 18 · Tailwind · Supabase · Lucide-react**.

---

## ✨ Fonctionnalités

### Core
- Confessions 280 caractères · catégories · mode « Suis-je en tort ? »
- Votes 😂😳💀 (classique) ou Oui / Non (jugement, avec barre de %)
- Feed **Tendances** / **Récents** + filtre 24h / Semaine / Tout
- Confession du jour en highlight
- Infinite scroll optimisé

### Profil anonyme
- `/me` — identité anonyme via UUID localStorage (aucun compte)
- Liste de **mes posts**, stats (votes reçus, vues)
- Supprimer / éditer mes posts (fenêtre d'édition de 5 min)
- Reset du token anonyme à tout moment

### Interaction
- 💬 **Commentaires** anonymes, votables (😂😳💀)
- 🔖 **Bookmarks** (localStorage) + page `/bookmarks`
- 🔗 **Partage** Web Share API + copy-link fallback
- 🔍 **Recherche** full-text (trigram + unaccent, FR-friendly)
- 📂 Pages par catégorie `/c/ecole` etc.
- 👁️ Compteur de **vues** par post
- 🚩 **Signalement avec raison** (spam, haine, sexuel, harcèlement, illégal, autre)

### Sécurité / Modération
- Filtre anti-insultes / spam frontend + backend
- Auto-masquage à **3 signalements** (status → `pending`)
- Rate-limit par fingerprint (IP + UA + secret)
- RLS Supabase : lecture limitée aux posts `published`
- Toute écriture passe par des RPC `SECURITY DEFINER`
- Votes / commentaires uniques via contraintes `UNIQUE`

### 🔧 Panneau admin `/admin`
- Accès protégé par `ADMIN_SECRET` (`.env.local`)
- Stats globales (total / publiés / masqués / signalés / commentaires)
- **Purge en masse** : supprimer tous les posts, ou uniquement les masqués, ou uniquement les commentaires, ou reset compteurs
- **Modération unitaire** : liste des posts signalés → approuver / rejeter / supprimer
- Rate-limit 10 tentatives de login / min
- Comparaison `timingSafeEqual` (anti-timing attack)

---

## 🚀 Setup

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer Supabase

1. Créer un projet sur https://supabase.com
2. **SQL Editor** → exécuter dans l'ordre :
   - [`supabase/schema.sql`](./supabase/schema.sql) (base V1)
   - [`supabase/migration_v2.sql`](./supabase/migration_v2.sql) (V2 : profils, comments, search…)
3. Récupérer les clés dans **Project Settings → API** :
   - `Project URL`
   - Nouvelle clé `sb_publishable_...` (= `anon public`)
   - Nouvelle clé `sb_secret_...` (= `service_role`, ⚠️ secret)

### 3. Variables d'environnement

Copier `.env.local.example` en `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
FINGERPRINT_SECRET=<32+ chars random>
```

Générer un secret :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Lancer

```bash
npm run dev
```

Ouvrir http://localhost:3000.

---

## 🧩 Architecture

```
app/
├── page.tsx                 # Feed principal + highlight
├── new/                     # Création confession
├── post/[id]/               # Détail + commentaires + view tracker
├── me/                      # Profil anonyme (mes posts + stats)
├── bookmarks/               # Mes favoris (localStorage)
├── search/                  # Résultats full-text
├── c/[category]/            # Feed par catégorie
└── api/
    ├── posts/               # GET feed, POST create
    ├── posts/[id]/          # GET/DELETE/PATCH (édition 5 min)
    ├── posts/[id]/view/     # POST incrément vue
    ├── posts/[id]/comments/ # GET list, POST create
    ├── posts/mine/          # GET mes posts (device_token)
    ├── comments/[id]/       # DELETE
    ├── comments/[id]/vote/  # POST vote sur commentaire
    ├── vote/                # POST vote sur post
    ├── report/              # POST signalement (post ou commentaire)
    └── search/              # GET recherche

components/
├── Feed, FeedTabs, SortPicker, HighlightCard
├── PostCard, VoteBar, JudgmentBar
├── NewPostForm, CategoryPicker
├── Comments, CommentForm, CommentCard
├── Header, SearchBar
├── Modal, ReportButton, ShareButton, BookmarkButton
├── OwnerActions (edit/delete)
└── ViewTracker

hooks/
├── useVote.ts

lib/
├── device.ts        # UUID localStorage (client only)
├── author.ts        # hash token (server only)
├── fingerprint.ts   # hash IP+UA (server)
├── moderation.ts    # filtres insultes/spam
├── bookmarks.ts     # localStorage bookmarks
├── rate-limit.ts    # in-memory bucket
├── utils.ts         # cn, formatRelative, compactNumber
└── supabase/        # clients + types

types/post.ts        # Post, Comment, types partagés
supabase/
├── schema.sql       # V1
└── migration_v2.sql # V2
```

---

## 🔐 Modèle d'identité anonyme

**Tu n'as jamais de compte.** Voilà comment on distingue "mes posts" :

1. Premier post → on génère un UUID aléatoire dans `localStorage` (`confessx_device_token`).
2. À chaque création, on envoie ce token au serveur.
3. Le serveur le **hash** avec `FINGERPRINT_SECRET` (non-réversible) → stocké en DB comme `author_token`.
4. Pour supprimer/éditer, on renvoie le token → le serveur compare les hashs.

Conséquences :
- ✅ Aucun email, aucun mot de passe, aucune PII stockée.
- ✅ On peut prouver l'ownership d'un post sans identifier l'utilisateur.
- ⚠️ Si tu effaces ton localStorage → tu perds tes posts (ils restent en ligne mais tu ne peux plus les éditer).
- ⚠️ Multi-device impossible (by design — ConfessX est anonyme par nature).

---

## 🗓️ Cron Supabase (optionnel)

Dashboard → Database → Extensions → activer `pg_cron`, puis :

```sql
select cron.schedule('recalc_trending', '*/10 * * * *', $$select public.recalc_trending_scores();$$);
select cron.schedule('pick_highlight',  '0 6 * * *',     $$select public.pick_daily_highlight();$$);
```

---

## 📦 Scripts

```bash
npm run dev         # Dev
npm run build       # Build prod
npm run start       # Serveur prod
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
```

---

## 🚢 Deploy sur Vercel

1. Importer le repo
2. Remplir les 4 variables d'env dans Settings
3. Deploy — c'est tout.
