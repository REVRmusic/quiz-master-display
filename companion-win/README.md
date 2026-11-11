# 💡 QuizMaster DMX Companion (Windows)

Application compagnon légère (autonome, sans installation) reliant en temps réel le tableau des scores **QuizMaster Pro** aux éclairages DMX pilotés par **Sunlite Suite 2 / Suite 3** sous Windows.

## Fonctionnement
1. Se connecte directement à **Supabase Realtime** (`sessions_quiz`) par WebSocket (et en local sur `ws://127.0.0.1:8765/ws` avec l'interface `?view=dmx`).
2. Surveille l'état de chaque joueur en temps réel :
   - **BLEU** : Joueur actif (`0`, `1` ou `2` points)
   - **VERT** : Gagnant (a atteint le seuil de `3` points ou marqué Gagnant)
   - **ROUGE** : Éliminé
3. Envoie automatiquement les raccourcis clavier Win32 natifs (`SendInput` + scan code matériel) vers Sunlite dès qu'un joueur change d'état.

## Compilation manuelle
```bash
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o QuizMaster-DMX-Companion.exe .
```
