import { COMMANDS } from '@/components/terminal/TerminalEmulator'

/** Number of commands the simulated terminal actually implements (counted, never typed by hand). */
export const TERMINAL_COMMAND_COUNT = Object.keys(COMMANDS).length
