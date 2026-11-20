package main

import (
	"bufio"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

const LocalBridgePort = 8765

func main() {
	EnableAnsiConsole()

	fmt.Println("\033[35m==============================================================\033[0m")
	fmt.Println("\033[1;37m   QuizMaster Pro — Companion DMX Daslight 3 (Windows) v" + AppVersion + "\033[0m")
	fmt.Println("\033[35m==============================================================\033[0m")
	fmt.Println("  * Pont temps réel : Supabase Realtime + WebSocket local :8765")
	fmt.Println("  * Règles PAR LED  : VERT (Défaut) | BLEU (Point) | JAUNE (Réponse) | ROUGE (Éliminé)")
	fmt.Println("  * Conseil scène   : Laissez ce programme ouvert et cliquez sur")
	fmt.Println("                      la fenêtre Daslight Virtual Controller 3 pour lui donner le focus.")
	fmt.Println("--------------------------------------------------------------")
	fmt.Println("  Commandes clavier ici : [R] Resynchroniser lumières  [Q] Quitter")
	fmt.Println("==============================================================")
	fmt.Println()

	var hub *LocalHub
	engine := NewDmxEngine(func(snap StatusSnapshot) {
		if hub != nil {
			hub.BroadcastStatus(snap)
		}
	})

	hub = NewLocalHub(engine)
	hub.Start(LocalBridgePort)

	_, daslightTitle := FindDaslightWindow()
	if daslightTitle != "" {
		engine.Log("info", fmt.Sprintf("Fenêtre Daslight détectée : %q", daslightTitle))
	} else {
		engine.Log("warn", "Daslight non détecté pour l'instant (lancez Daslight Virtual Controller 3).")
	}

	stopCh := make(chan struct{})
	go StartSupabaseRealtimeLoop(engine, stopCh)

	// Periodic window & status refresh every 4 seconds for browser UI
	go func() {
		ticker := time.NewTicker(4 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-stopCh:
				return
			case <-ticker.C:
				hub.BroadcastStatus(engine.GetSnapshot())
			}
		}
	}()

	// Interactive stdin loop
	go func() {
		scanner := bufio.NewScanner(os.Stdin)
		for scanner.Scan() {
			cmd := strings.ToLower(strings.TrimSpace(scanner.Text()))
			switch cmd {
			case "r", "resync":
				engine.Log("info", "Resynchronisation manuelle de toutes les lumières...")
				engine.ResyncAll()
			case "q", "quit", "exit":
				close(stopCh)
				os.Exit(0)
			}
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	<-sigCh

	fmt.Println("\nFermeture de QuizMaster DMX Companion...")
	close(stopCh)
}
