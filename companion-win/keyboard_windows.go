//go:build windows

package main

import (
	"fmt"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

var (
	user32                       = syscall.NewLazyDLL("user32.dll")
	kernel32                     = syscall.NewLazyDLL("kernel32.dll")
	procSendInput                = user32.NewProc("SendInput")
	procMapVirtualKeyW           = user32.NewProc("MapVirtualKeyW")
	procVkKeyScanW               = user32.NewProc("VkKeyScanW")
	procGetForegroundWindow      = user32.NewProc("GetForegroundWindow")
	procGetWindowTextW           = user32.NewProc("GetWindowTextW")
	procEnumWindows              = user32.NewProc("EnumWindows")
	procIsWindowVisible          = user32.NewProc("IsWindowVisible")
	procSetForegroundWindow      = user32.NewProc("SetForegroundWindow")
	procIsIconic                 = user32.NewProc("IsIconic")
	procShowWindow               = user32.NewProc("ShowWindow")
	procGetWindowThreadProcessId = user32.NewProc("GetWindowThreadProcessId")
	procAttachThreadInput        = user32.NewProc("AttachThreadInput")
	procGetCurrentThreadId       = kernel32.NewProc("GetCurrentThreadId")
	procGetStdHandle             = kernel32.NewProc("GetStdHandle")
	procGetConsoleMode           = kernel32.NewProc("GetConsoleMode")
	procSetConsoleMode           = kernel32.NewProc("SetConsoleMode")
)

const (
	inputKeyboard      = 1
	keyeventfKeyUp     = 0x0002
	keyeventfExtKey    = 0x0001
	mapvkVkToVsc       = 0
	swRestore          = 9
	vkShift            = 0x10
	vkControl          = 0x11
	vkMenu             = 0x12 // Alt
	stdOutputHandle    = ^uintptr(10) // -11
	enableVtProcessing = 0x0004
)

type keyboardInput struct {
	wVk         uint16
	wScan       uint16
	dwFlags     uint32
	time        uint32
	dwExtraInfo uintptr
}

type inputStruct struct {
	inputType uint32
	ki        keyboardInput
	padding   [8]byte
}

// Compile-time assertion that inputStruct matches Windows x64 INPUT size (40 bytes)
var _ [40]byte = [unsafe.Sizeof(inputStruct{})]byte{}

// EnableAnsiConsole enables ANSI color sequences in Windows 10/11 cmd/powershell
func EnableAnsiConsole() {
	handle, _, _ := procGetStdHandle.Call(stdOutputHandle)
	if handle == 0 || handle == ^uintptr(0) {
		return
	}
	var mode uint32
	ret, _, _ := procGetConsoleMode.Call(handle, uintptr(unsafe.Pointer(&mode)))
	if ret != 0 {
		procSetConsoleMode.Call(handle, uintptr(mode|enableVtProcessing))
	}
}

func getWindowTitle(hwnd uintptr) string {
	if hwnd == 0 {
		return ""
	}
	buf := make([]uint16, 256)
	procGetWindowTextW.Call(hwnd, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
	return syscall.UTF16ToString(buf)
}

// GetActiveWindowTitle returns the title of the currently focused Windows window
func GetActiveWindowTitle() string {
	hwnd, _, _ := procGetForegroundWindow.Call()
	return getWindowTitle(hwnd)
}

// FindSunliteWindow locates any visible Sunlite Suite window
func FindSunliteWindow() (uintptr, string) {
	var foundHwnd uintptr
	var foundTitle string

	cb := syscall.NewCallback(func(hwnd uintptr, lparam uintptr) uintptr {
		visible, _, _ := procIsWindowVisible.Call(hwnd)
		if visible == 0 {
			return 1
		}
		title := getWindowTitle(hwnd)
		lower := strings.ToLower(title)
		if strings.Contains(lower, "sunlite") {
			foundHwnd = hwnd
			foundTitle = title
			return 0 // stop enumeration
		}
		return 1
	})

	procEnumWindows.Call(cb, 0)
	return foundHwnd, foundTitle
}

func focusWindow(hwnd uintptr) {
	if hwnd == 0 {
		return
	}
	iconic, _, _ := procIsIconic.Call(hwnd)
	if iconic != 0 {
		procShowWindow.Call(hwnd, swRestore)
	}

	fgHwnd, _, _ := procGetForegroundWindow.Call()
	if fgHwnd == hwnd {
		return
	}

	fgThread, _, _ := procGetWindowThreadProcessId.Call(fgHwnd, 0)
	curThread, _, _ := procGetCurrentThreadId.Call()

	if fgThread != 0 && curThread != 0 && fgThread != curThread {
		procAttachThreadInput.Call(curThread, fgThread, 1)
		procSetForegroundWindow.Call(hwnd)
		procAttachThreadInput.Call(curThread, fgThread, 0)
	} else {
		procSetForegroundWindow.Call(hwnd)
	}
	time.Sleep(30 * time.Millisecond)
}

func sendKeyEvent(vk uint16, up bool) {
	scan, _, _ := procMapVirtualKeyW.Call(uintptr(vk), mapvkVkToVsc)
	var flags uint32
	if up {
		flags |= keyeventfKeyUp
	}
	// Extended keys (arrows, home/end/pgup/pgdn, insert/delete, numpad enter)
	if (vk >= 0x21 && vk <= 0x2E) || vk == 0x2D {
		flags |= keyeventfExtKey
	}

	in := inputStruct{
		inputType: inputKeyboard,
		ki: keyboardInput{
			wVk:     vk,
			wScan:   uint16(scan),
			dwFlags: flags,
		},
	}
	procSendInput.Call(1, uintptr(unsafe.Pointer(&in)), unsafe.Sizeof(in))
}

func parseShortcut(shortcut string) ([]uint16, uint16, error) {
	clean := strings.TrimSpace(shortcut)
	if clean == "" {
		return nil, 0, fmt.Errorf("raccourci vide")
	}

	parts := strings.Split(clean, "+")
	var mods []uint16
	var mainKeyStr string

	for i, part := range parts {
		token := strings.ToUpper(strings.TrimSpace(part))
		if i < len(parts)-1 {
			switch token {
			case "CTRL", "CONTROL":
				mods = append(mods, vkControl)
			case "SHIFT", "MAJ":
				mods = append(mods, vkShift)
			case "ALT":
				mods = append(mods, vkMenu)
			default:
				return nil, 0, fmt.Errorf("modificateur inconnu: %s", part)
			}
		} else {
			mainKeyStr = token
		}
	}

	vk, extraShift, err := lookupVirtualKey(mainKeyStr)
	if err != nil {
		return nil, 0, err
	}
	if extraShift {
		hasShift := false
		for _, m := range mods {
			if m == vkShift {
				hasShift = true
			}
		}
		if !hasShift {
			mods = append(mods, vkShift)
		}
	}

	return mods, vk, nil
}

func lookupVirtualKey(key string) (uint16, bool, error) {
	named := map[string]uint16{
		"SPACE": 0x20, "ESPACE": 0x20,
		"ENTER": 0x0D, "RETURN": 0x0D, "ENTREE": 0x0D,
		"TAB":   0x09,
		"ESC":   0x1B, "ESCAPE": 0x1B,
		"BACKSPACE": 0x08,
		"PGUP": 0x21, "PAGEUP": 0x21,
		"PGDN": 0x22, "PAGEDOWN": 0x22,
		"END": 0x23, "HOME": 0x24,
		"LEFT": 0x25, "UP": 0x26, "RIGHT": 0x27, "DOWN": 0x28,
		"INSERT": 0x2D, "DELETE": 0x2E, "SUPPR": 0x2E,
		"F1": 0x70, "F2": 0x71, "F3": 0x72, "F4": 0x73,
		"F5": 0x74, "F6": 0x75, "F7": 0x76, "F8": 0x77,
		"F9": 0x78, "F10": 0x79, "F11": 0x7A, "F12": 0x7B,
		"NUMPAD0": 0x60, "NUMPAD1": 0x61, "NUMPAD2": 0x62, "NUMPAD3": 0x63,
		"NUMPAD4": 0x64, "NUMPAD5": 0x65, "NUMPAD6": 0x66, "NUMPAD7": 0x67,
		"NUMPAD8": 0x68, "NUMPAD9": 0x69,
		"NUM0": 0x60, "NUM1": 0x61, "NUM2": 0x62, "NUM3": 0x63,
		"NUM4": 0x64, "NUM5": 0x65, "NUM6": 0x66, "NUM7": 0x67,
		"NUM8": 0x68, "NUM9": 0x69,
	}

	if vk, ok := named[key]; ok {
		return vk, false, nil
	}

	// Single character (A-Z, 0-9, etc.) -> use VkKeyScanW for AZERTY/QWERTY layout compatibility
	runes := []rune(strings.ToLower(key))
	if len(runes) == 1 {
		ch := runes[0]
		res, _, _ := procVkKeyScanW.Call(uintptr(ch))
		signedRes := int16(res)
		if signedRes != -1 {
			vk := uint16(signedRes & 0xFF)
			shiftState := (signedRes >> 8) & 0xFF
			needsShift := (shiftState & 1) != 0
			return vk, needsShift, nil
		}
		// Fallback for A-Z / 0-9
		upper := []rune(strings.ToUpper(key))[0]
		if (upper >= 'A' && upper <= 'Z') || (upper >= '0' && upper <= '9') {
			return uint16(upper), false, nil
		}
	}

	return 0, false, fmt.Errorf("touche non reconnue: %s", key)
}

// SendShortcut sends a key combination to Windows (and optionally checks/focuses Sunlite)
func SendShortcut(shortcut string, autoFocusSunlite bool, requireSunliteFocus bool) error {
	mods, vk, err := parseShortcut(shortcut)
	if err != nil {
		return err
	}

	activeTitle := GetActiveWindowTitle()
	isSunliteActive := strings.Contains(strings.ToLower(activeTitle), "sunlite")

	if !isSunliteActive && autoFocusSunlite {
		if hwnd, _ := FindSunliteWindow(); hwnd != 0 {
			focusWindow(hwnd)
			activeTitle = GetActiveWindowTitle()
			isSunliteActive = strings.Contains(strings.ToLower(activeTitle), "sunlite")
		}
	}

	if requireSunliteFocus && !isSunliteActive {
		return fmt.Errorf("sécurité active : la fenêtre Sunlite n'a pas le focus (fenêtre actuelle : %q)", activeTitle)
	}

	// Press modifiers
	for _, m := range mods {
		sendKeyEvent(m, false)
	}
	if len(mods) > 0 {
		time.Sleep(15 * time.Millisecond)
	}

	// Hold main key for 45ms so Sunlite Suite detects it reliably
	sendKeyEvent(vk, false)
	time.Sleep(45 * time.Millisecond)
	sendKeyEvent(vk, true)

	// Release modifiers
	if len(mods) > 0 {
		time.Sleep(15 * time.Millisecond)
		for i := len(mods) - 1; i >= 0; i-- {
			sendKeyEvent(mods[i], true)
		}
	}

	return nil
}
