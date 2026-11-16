/**
 * CASINO CANDIDATE INPUT — pure, DOM-free helpers for the secret-code entry
 * flow. Kept separate from the server security module so it can never reach the
 * secret, and so the flow is unit-testable without a browser.
 *
 * Flow contract:
 *   • Keyboard capture stays entirely client-side.
 *   • Individual keystrokes / partial buffers are NEVER sent to the server.
 *   • The buffer is only submitted once the user *completes* the candidate
 *     sequence (presses Enter) — exactly one verification request per sequence.
 *   • Only the completed candidate string is sent.
 *   • The buffer is cleared immediately after submission, success or failure.
 *   • Input-field exclusions and the idle reset behave exactly like the
 *     existing Easter-Egg keystroke capture (the caller passes `isTyping`).
 */

/** Upper bound for the local candidate buffer (mirrors the egg buffer). */
export const CANDIDATE_MAX = 64;

/**
 * Feed one KeyboardEvent.key into the rolling candidate buffer.
 * Latin letters append (lower-cased); any other printable key is a separator.
 * Modifier/special keys leave the buffer untouched.
 */
export function pushCandidateKey(buffer: string, key: string): string {
  if (key.length !== 1) return buffer;
  const ch = key.toLowerCase();
  if (ch >= "a" && ch <= "z") return (buffer + ch).slice(-CANDIDATE_MAX);
  return (buffer + " ").slice(-CANDIDATE_MAX);
}

/** True when there is a non-empty candidate ready to submit. */
export function isCandidateComplete(buffer: string): boolean {
  return buffer.trim().length > 0;
}

export interface CaptureInput {
  buffer: string;
  key: string;
  /** A submission is already in flight — never start a second one. */
  pending: boolean;
  isTyping: boolean;
  hasModifier: boolean;
}

export interface CaptureDecision {
  /** The completed candidate to verify, or null when nothing should be sent. */
  submit: string | null;
  /** The buffer to keep after this keystroke. */
  nextBuffer: string;
}

/**
 * Pure decision function for one keystroke. Extracted from the React listener
 * so the "one request per completed sequence / never partial / clears after"
 * rules are directly testable.
 */
export function decideCapture(input: CaptureInput): CaptureDecision {
  // Modifier keys and real typing fields reset the buffer (existing behaviour).
  if (input.hasModifier || input.isTyping) return { submit: null, nextBuffer: "" };
  // Escape clears the buffer without submitting.
  if (input.key === "Escape") return { submit: null, nextBuffer: "" };
  // Enter completes the sequence: submit exactly once, then clear.
  if (input.key === "Enter") {
    if (input.pending) return { submit: null, nextBuffer: "" };
    if (isCandidateComplete(input.buffer)) return { submit: input.buffer.trim(), nextBuffer: "" };
    return { submit: null, nextBuffer: "" };
  }
  // Ordinary typing only extends the local buffer — never a request.
  return { submit: null, nextBuffer: pushCandidateKey(input.buffer, input.key) };
}
