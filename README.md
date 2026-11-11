# 🏆 QuizMaster Pro — Régie Animateur & Affichage Grand Écran

Application web moderne, réactive et 100% hors-ligne conçue pour les prestations d'animation de quiz en supermarché et galerie commerciale. Elle remplace avantageusement l'ancien système hybride Excel + PowerPoint.

---

## 🎯 Points Forts & Avantages face à Excel / PowerPoint

| Fonctionnalité | Ancien Système (Excel + PPTX) | QuizMaster Pro |
| :--- | :--- | :--- |
| **Ergonomie Régie** | Saisie fastidieuse dans des cellules de tableur | Boutons tactiles géants `+1`, `-1`, `+2` & raccourcis clavier 1 touche |
| **Double Écran (Régie / Public)** | Liaison OLE fragile, fenêtres superposées, bugs | Synchronisation native temps réel 0 ms (`BroadcastChannel`) |
| **Gestion des Sponsors** | Collage manuel d'images dans les diapos PPT | **Gestionnaire dédié** : Upload, logo fixe, carrousel tournant ou bandeau multi-logos |
| **Animation de Victoire** | Simple texte statique *"Gagné"* dans une cellule | **Pluie de confettis**, fanfare audio, badge doré animé |
| **Gestion du Rythme** | Aucun chrono intégré | **Minuteur interactif** (10s, 30s, 60s) synchronisé avec bips et gong final |
| **Inter-manches / Pause** | Diapositive statique | **Mode Écran d'attente animé** (*Prochain Quiz à 10h30*, mise en valeur des sponsors) |
| **Fiabilité sur Scène** | Risque de blocage d'Excel, coupure du diaporama | Fonctionne **100% hors-ligne**, sans serveur, sauvegarde automatique continue |

---

## 🚀 Démarrage Rapide

### 1. Accès à l'application
Le serveur local est d'ores et déjà lancé et prêt à l'emploi :
- **Console Régie (Écran de l'animateur sur PC)** : [http://localhost:5173/](http://localhost:5173/)
- **Écran Public (Affichage Grand Écran / Vidéoprojecteur)** : [http://localhost:5173/?view=display](http://localhost:5173/?view=display)

### 2. Configuration Scène (Double Écran HDMI)
1. Branchez votre PC à la télévision ou au vidéoprojecteur en mode **Bureau Étendu** (Touche `Windows + P` sur PC ou Préférences Moniteurs sur Mac).
2. Sur la régie animateur ([http://localhost:5173/](http://localhost:5173/)), cliquez sur le bouton violet en haut : **« Ouvrir l'Écran Public (2e Écran) »**.
3. Glissez la nouvelle fenêtre sur le grand écran.
4. Appuyez sur le bouton **Plein Écran** (icône en haut à droite ou touche `F11`).
5. Le voyant passe au vert : **« 🟢 Grand Écran Connecté »**. Vous êtes prêt !

---

## ⌨️ Raccourcis Clavier Animateur (Une seule main requise !)

Idéal pour piloter l'animation avec un micro dans l'autre main :

| Touche | Action |
| :--- | :--- |
| <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd>, <kbd>4</kbd> | **+1 point** immédiatement pour le Joueur correspondant |
| <kbd>Maj</kbd> + <kbd>1..4</kbd> | **-1 point** (correction en cas d'erreur) |
| <kbd>Espace</kbd> | **Démarrer / Pause** le minuteur |
| <kbd>B</kbd> | Son de **Buzzer** (mauvaise réponse) |
| <kbd>V</kbd> ou <kbd>G</kbd> | Déclencher la **Victoire & Pluie de confettis** |
| <kbd>R</kbd> | **Nouvelle Manche** (remet les scores à 0 en conservant les noms) |
| <kbd>F</kbd> | Basculer en plein écran |

---

## 🏢 Paramétrage des Sponsors & Logos (Fonctionnalité Dédiée)

Cliquez sur l'onglet **« Sponsors »** dans la barre supérieure de la régie :
1. **Upload Direct** : Glissez-déposez ou sélectionnez le fichier logo du partenaire (PNG, SVG, JPG). L'image est automatiquement compressée et enregistrée en local.
2. **Modes d'affichage au choix** :
   - **Logo Unique Fixe** : Affiche le sponsor sélectionné en bas à droite (ex: *Centre Commercial BALARUC*, déjà pré-configuré avec le logo officiel issu de votre maquette).
   - **Carrousel Tournant** : Alterne automatiquement toutes les *X* secondes entre les différents sponsors activés (vitesse réglable de 3 à 20s).
   - **Bandeau Multi-Logos** : Présente l'ensemble des sponsors partenaires côte à côte.
3. **Activation / Désactivation en 1 clic** : Activez ou masquez un logo à la volée pendant l'événement.

---

## 🎨 Personnalisation & Thèmes

Ouvrez les **« Paramètres »** (icône engrenage) pour personnaliser :
- **Titre de l'événement** (ex: *« La galerie fête le Printemps du 6 au 16 mars »*)
- **Sous-titre / Thème** (ex: *« Le Grand Quiz des Commerçants »*)
- **Message inférieur** (ex: *« Prochain Quiz à 10h30 »*)
- **Seuil de victoire automatique** (3 points par défaut, ajustable de 1 à 10 ou mode manuel)
- **Nombre de candidats** (de 2 à 6 joueurs)
- **Thèmes graphiques** :
  - *Violet Printemps* (Couleur originale `#7030A0` de votre PowerPoint)
  - *Bleu Jeu TV* (Ambiance plateau télévisé)
  - *Vert Galerie* (Fraîcheur & Nature)
  - *Or & Prestige* (Gala & remise des prix)
  - *Rouge Dynamique*
  - *Noir Néon Moderne*

---

## 📋 Historique & Exportation

Toutes les victoires sont automatiquement mémorisées dans l'historique de la session avec l'horodatage, le nom du candidat et les scores détaillés. Vous pouvez exporter la liste au format **CSV** d'un clic pour votre bilan d'animation auprès de la direction du supermarché.
