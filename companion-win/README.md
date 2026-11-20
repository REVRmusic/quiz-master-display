# 💡 QuizMaster DMX Companion (Windows)

Application compagnon légère (autonome, sans installation) reliant en temps réel le tableau des scores **QuizMaster Pro** aux éclairages DMX pilotés par **Daslight Virtual Controller 3** sous Windows.

## Fonctionnement
1. Se connecte directement à **Supabase Realtime** (`sessions_quiz`) par WebSocket (et en local sur `ws://127.0.0.1:8765/ws` avec l'interface `?view=dmx`).
2. Surveille l'état de chaque joueur en temps réel selon les règles DMX :
   - **VERT** (Position d'attente / 0 à 2 points, bonne ou mauvaise réponse) :
     - Joueur 1 : `Z`
     - Joueur 2 : `T`
     - Joueur 3 : `S`
     - Joueur 4 : `G`
   - **BLEU** (Buzz / A la main) :
     - Joueur 1 : `W`
     - Joueur 2 : `U`
     - Joueur 3 : `X`
     - Joueur 4 : `V`
   - **JAUNE** (Arrivée à 3 points / Qualifié - affiché jusqu'à la nouvelle manche) :
     - Joueur 1 : `A`
     - Joueur 2 : `R`
     - Joueur 3 : `Q`
     - Joueur 4 : `F`
   - **ROUGE** (Éliminé - affiché jusqu'à la nouvelle manche) :
     - Joueur 1 : `E`
     - Joueur 2 : `Y`
     - Joueur 3 : `D`
     - Joueur 4 : `H`
3. Envoie automatiquement les raccourcis clavier Win32 natifs (`SendInput` + scan code matériel) vers la fenêtre active de **Daslight Virtual Controller 3** dès qu'un joueur change d'état.

## Compilation manuelle
```bash
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o QuizMaster-DMX-Companion.exe .
```
