---
layout: post
title:  "terminal shortcut and function keys"
date: 2016-07-16 14:36:57 +0800
categories: experience summary
tags: linux terminal
---

## xterm, terminal, shortcut keys, function keys
time: 2016-07-16-Sat 14:36:57

Xterm and other terminals through terminal control characters based on the type
of terminal emulation. Commons terminal type are VT100...
 
Note: Most of these keystrokes come from the readline library, and have nothing
to do with the terminal type or terminal emulator used (except that some
terminals emulators don't play well with control/meta keys). When using bash
(which uses readline), a list of shortcuts it offers is obtained by entering
"bind -P" at the command prompt.

<!-- more -->
### Clearing functions

Keyboard Commands                | Function
-----                            | -----
ALT-Backspace                    | removes words, not single chars. (same as CTRL+W)
Backspace                        | deletes characters to the left or the cursor (this may vary depending on settings)
Ctrl-7 or Ctrl-Shift--           | removes a number? of characters from the end
Ctrl-d                           | deletes characters to the right of cursor, if no characters, logs out and closes terminal
Ctrl-h or Ctrl-8 or Ctrl-Shift-/ | deletes characters to the left or the cursor
Ctrl-k                           | **clear all characters after the cursor**
Ctrl-l                           | clear screen
Ctrl-u                           | **clears all characters before the cursor**
Ctrl-w                           | **clears word before the cursor. a word is set of characters separated by spaces**
Delete                           | deletes characters to the right of cursor (this may vary depending on settings)

### Cursor movment

Keyboard Commands | Function
-----             | -----
Ctrl-a or Home    | **returns cursor to Home, to the beginning of the line**
Crtl-b            | movers cursor to the left (backward)
Ctrl+e or End     | **Moves cursor to the end of the line**
Ctrl-f            | moves cursor right (forward)
Ctrl-n            | same as down arrow
Ctrl-p            | same as up arrow
`Ctrl-[b (^[b)`   | move cursor backward by one word
`Ctrl-[f (^[f)`   | move cursor forward by one word

### Other

Keyboard Commands | Function
-----             | -----
Ctrl-/            | undo: changes made to a previous command, clear current cmd typed
Ctrl-[            | **escape, similar to Tab but not the same**]
Ctrl-a            | returns cursor to Home
Crtl-b            | movers cursor to the left (backward)
Ctrl-c            | kill process
Ctrl-e            | return Terminal Status ???
Ctrl-f            | moves cursor right (forward)
Ctrl-g            | Bell (beep)
Ctrl-i            | same as tab
Ctrl-m or Ctrl-j  | carriage return, like enter
Ctrl-n            | **next command, if there is one, same a down arrow**
Ctrl-o            | Executes command without clearing the line
Ctrl-p            | **previous command, like up arrow**
Ctrl-q            | Unlocks the screen after a XOFF signal. XON signal for software flow control.
Ctrl-r            | **search: Reverse search for previous commands matching the pattern entered**
Ctrl-s            | In effect, locks the screen (Ctrl-q unlocks it). XOFF signal for software flow control.
Ctrl-t            | Switched the character before the cursor with the one under the cursor
Ctrl-v            | displays next typed characters (code?)
Ctrl-x            |  ?
Ctrl-y            | Enters the command executed two lines before, without clearing the line of previous contents
Ctrl-z            | pauses process and places it in terminal background (resume with command 'fg')

### Determine "essentials" of keys

When you don't known what the essentials of the shortcut keys you pressed, use
Linux command `showkey -ask` to determine them.
for example:
1. type `showkey -ask`
2. input `Alt-leftarrow` --- this shortcut key is usually defined by the
	 termial emulators
3. the output will be `^[b`, which means press combination of `ctrl` key and
	 `[`, and then press `b`, the cursor will move backward by one word
4. so, `^[b` is "essential" of move cursor backwards by one word

### References
[How to use short-cut keys in xterm and other terminals](http://how-to.wikia.com/wiki/How_to_use_short-cut_keys_in_xterm_and_other_terminals?)
[Xterm Control Sequences](http://www.xfree86.org/4.7.0/ctlseqs.html)
[key binding table?](http://unix.stackexchange.com/questions/116562/key-bindings-table)

### Fun time
How many ways to execute a command? Say, `ls`

1. with `Enter`

	```shell
	ls<Enter>
	```

2. with `ctrl-j`

	```
	ls<ctrl-j>
	```

3. with `ctrl-m`

	```
	ls<ctrl-m>
	```

4. with `ctrl-o`

	```
	ls<ctrl-o>
	```
