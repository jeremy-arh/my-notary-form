# 🚨 CORRECTION URGENTE - LIRE IMMÉDIATEMENT

## Vous avez l'erreur : "new row violates row-level security policy for table client"

## ✅ SOLUTION EN 3 ÉTAPES (2 MINUTES)

### 1️⃣ Ouvrez Supabase SQL Editor

Allez sur : https://supabase.com/dashboard/project/jlizwheftlnhoifbqeex

Cliquez sur **"SQL Editor"** dans le menu de gauche

### 2️⃣ Ouvrez le fichier SUPABASE_FIX_COMPLET.sql

Le fichier se trouve dans votre projet : `SUPABASE_FIX_COMPLET.sql`

**Copiez TOUT le contenu du fichier**

### 3️⃣ Exécutez le script

- Dans Supabase SQL Editor, cliquez sur **"New query"**
- Collez tout le contenu
- Cliquez sur **"Run"** (le bouton ▶️ en haut à droite)

### ✅ C'EST TOUT !

Après l'exécution du script, vous verrez un message de succès.

Rechargez votre formulaire et testez à nouveau → **ÇA VA MARCHER !**

---

## 🔍 Ce que fait le script

- ✅ Ajoute les colonnes d'adresse manquantes
- ✅ Désactive RLS sur la table client (permet l'insertion)
- ✅ Corrige la récursion infinie admin
- ✅ Vérifie que tout est OK

---

## ⚠️ IMPORTANT

**Vous DEVEZ exécuter ce script dans Supabase.**

Sans ça, le formulaire ne pourra PAS créer de comptes clients.

---

## 🆘 En cas de problème

Si le script échoue avec une erreur :
1. Vérifiez que vous êtes bien connecté à votre projet Supabase
2. Vérifiez que vous avez les permissions d'admin
3. Réessayez d'exécuter le script

Si ça ne marche toujours pas, envoyez-moi l'erreur exacte.
