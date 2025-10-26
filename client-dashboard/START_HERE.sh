#!/bin/bash

echo "════════════════════════════════════════════════════════════"
echo "🚀 DÉMARRAGE DU SERVEUR CLIENT DASHBOARD"
echo "════════════════════════════════════════════════════════════"
echo ""

# 1. Arrêter tous les serveurs en cours
echo "1️⃣ Arrêt de tous les serveurs Vite en cours..."
pkill -f vite
sleep 2

# 2. Vérifier qu'on est dans le bon dossier
echo "2️⃣ Vérification du dossier..."
cd /home/user/my-notary-form/client-dashboard
echo "   ✓ Dossier actuel: $(pwd)"

# 3. Vérifier que les fichiers modifiés existent
echo ""
echo "3️⃣ Vérification des fichiers modifiés..."
if grep -q "Mot de passe" src/components/steps/PersonalInfo.jsx; then
    echo "   ✓ PersonalInfo.jsx contient 'Mot de passe'"
else
    echo "   ✗ PersonalInfo.jsx NE CONTIENT PAS 'Mot de passe' !!!"
fi

if grep -q "import Notification" src/components/NotaryForm.jsx; then
    echo "   ✓ NotaryForm.jsx importe Notification"
else
    echo "   ✗ NotaryForm.jsx N'IMPORTE PAS Notification !!!"
fi

if [ -f "src/components/Notification.jsx" ]; then
    echo "   ✓ Notification.jsx existe"
else
    echo "   ✗ Notification.jsx N'EXISTE PAS !!!"
fi

# 4. Nettoyer le cache
echo ""
echo "4️⃣ Nettoyage du cache Vite..."
rm -rf node_modules/.vite dist
echo "   ✓ Cache nettoyé"

# 5. Démarrer le serveur
echo ""
echo "5️⃣ Démarrage du serveur sur port 5173..."
echo ""
echo "════════════════════════════════════════════════════════════"
echo "📋 INSTRUCTIONS :"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "1. Attendez que le serveur démarre (environ 5 secondes)"
echo "2. Ouvrez votre navigateur en mode NAVIGATION PRIVÉE"
echo "3. Allez sur : http://localhost:5173/form/personal-info"
echo "4. Vous DEVEZ voir les champs mot de passe !"
echo ""
echo "Si vous ne voyez PAS les champs :"
echo "  - Appuyez sur Ctrl+Shift+R (force refresh)"
echo "  - Ouvrez DevTools (F12) et regardez l'onglet Console"
echo "  - Cherchez des erreurs en rouge"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

npm run dev
