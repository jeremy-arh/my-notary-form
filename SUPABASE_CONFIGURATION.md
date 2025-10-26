# Configuration Supabase pour l'auto-login

## ⚠️ IMPORTANT : Désactiver la confirmation email

Pour que les utilisateurs soient **automatiquement connectés** après la soumission du formulaire, vous devez désactiver la confirmation email dans Supabase.

### Étapes à suivre :

1. **Accédez à votre projet Supabase**
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet

2. **Ouvrez les paramètres d'authentification**
   - Dans le menu latéral, cliquez sur **Authentication**
   - Puis sur **Settings** (dans le sous-menu d'Authentication)

3. **Désactivez la confirmation email**
   - Trouvez la section **"Email"** ou **"User Signups"**
   - Cherchez l'option **"Enable email confirmations"**
   - **Décochez cette option** (mettez-la sur OFF)
   - Cliquez sur **Save**

### Configuration alternative (si vous voulez garder la confirmation email)

Si vous préférez garder la confirmation email activée, voici ce qui se passera :

1. L'utilisateur soumet le formulaire
2. Un compte est créé dans Supabase
3. Un email de confirmation est envoyé
4. L'utilisateur doit cliquer sur le lien dans l'email
5. Après avoir cliqué, il est redirigé vers `/auth/callback`
6. Il peut alors accéder à son dashboard

**Note** : Avec cette option, l'expérience utilisateur est moins fluide car ils doivent passer par leur email.

## Vérification de la configuration

Pour vérifier que la configuration fonctionne :

1. Ouvrez la console du navigateur (F12)
2. Soumettez le formulaire avec un nouvel email
3. Regardez les logs dans la console :

**Si la configuration est correcte (auto-login activé)** :
```
✅ Auth user created: [user-id]
📧 Email confirmed: No
🔐 Session: Active
✅ User is automatically authenticated (email confirmation disabled)!
```

**Si la confirmation email est requise** :
```
✅ Auth user created: [user-id]
📧 Email confirmed: No
🔐 Session: None
⚠️ Cannot auto-sign in - email confirmation required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  EMAIL CONFIRMATION REQUIRED
⚠️  To enable auto-login, disable email confirmation in Supabase
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Autres paramètres recommandés

Dans **Authentication > Settings**, vous pouvez également configurer :

- **Minimum password length** : 6 (ou plus selon vos besoins)
- **Site URL** : `http://localhost:5173` (en développement) ou votre domaine de production
- **Redirect URLs** : Ajoutez `http://localhost:5173/auth/callback` et votre URL de production

## Support

Si vous avez des questions sur la configuration Supabase, consultez :
- Documentation officielle : https://supabase.com/docs/guides/auth
- Guide d'authentification : https://supabase.com/docs/guides/auth/auth-email
