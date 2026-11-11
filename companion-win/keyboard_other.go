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

func FindSunliteWindow() (uintptr, string) {
	return 0, "Non détecté (mode simulation)"
}

func SendShortcut(shortcut string, autoFocusSunlite bool, requireSunliteFocus bool) error {
	clean := strings.TrimSpace(shortcut)
	if clean == "" {
		return fmt.Errorf("raccourci vide")
	}
	return nil
}
