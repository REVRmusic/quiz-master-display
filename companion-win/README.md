# 💡 QuizMaster DMX Companion (Windows)

Application compagnon légère (autonome, sans installation) reliant en temps réel le tableau des scores **QuizMaster Pro** aux éclairages DMX pilotés par **Daslight Virtual Controller 3** sous Windows.

## Fonctionnement
1. Se connecte directement à **Supabase Realtime** (`sessions_quiz`) par WebSocket (et en local sur `ws://127.0.0.1:8765/ws` avec l'interface `?view=dmx`).
2. Surveille l'état de chaque joueur en temps réel selon les règles DMX :
   - **VERT** : Par défaut / Joueur en attente (`0` point)
   - **BLEU** : Point marqué / Gagnant (`>= 1` point ou seuil atteint)
   - **JAUNE** : En cours de réponse (le joueur a la main car il a buzzé en premier)
   - **ROUGE** : Candidat éliminé
3. Envoie automatiquement les raccourcis clavier Win32 natifs (`SendInput` + scan code matériel) vers la fenêtre active de **Daslight Virtual Controller 3** dès qu'un joueur change d'état.

## Compilation manuelle
```bash
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o QuizMaster-DMX-Companion.exe .
```
