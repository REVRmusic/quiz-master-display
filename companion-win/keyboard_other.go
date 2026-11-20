//go:build !windows

package main

import (
	"fmt"
	"strings"
)

func EnableAnsiConsole() {}

func GetActiveWindowTitle() string {
	return "Simulation (macOS/Linux)"
}

func FindDaslightWindow() (uintptr, string) {
	return 0, "Non détecté (mode simulation)"
}

func FindSunliteWindow() (uintptr, string) {
	return FindDaslightWindow()
}

func SendShortcut(shortcut string, autoFocusTarget bool, requireTargetFocus bool) error {
	clean := strings.TrimSpace(shortcut)
	if clean == "" {
		return fmt.Errorf("raccourci vide")
	}
	return nil
}
