import re
import string
import sys
import os
import srt
import webvtt

# ---------- I/O & normalization ----------

TIMESTAMP_RE = re.compile(
    r"(?:(\d{2}:){1,2}\d{2}[.,]\d{3}\s*-->\s*(\d{2}:){1,2}\d{2}[.,]\d{3})"
)
INDEX_RE = re.compile(r"^\s*\d+\s*$")

def load_text_from_file(path: str) -> str:
    """
    Loads .srt, .vtt, or .txt and returns text as a single string.
    Uses srt/webvtt libraries for subtitles.
    """
    base, ext = os.path.splitext(path)
    ext = ext.lower()

    if ext == ".srt":
        with open(path, "r", encoding="utf-8") as f:
            subtitles = list(srt.parse(f.read()))
        texts = [s.content for s in subtitles]
        return "\n".join(texts)

    elif ext == ".vtt":
        vtt = webvtt.read(path)
        texts = [c.text for c in vtt.captions]
        return "\n".join(texts)

    elif ext == ".txt":
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    else:
        raise ValueError(f"Unsupported file type: {ext}")

def normalize_for_wer(text: str) -> list:
    """
    Lowercase, remove punctuation, collapse whitespace -> word tokens.
    Good for WER computation on transcripts/subtitles.
    """
    text = text.lower()
    # keep apostrophes within words; drop other punctuation
    allowed = set(string.ascii_lowercase + string.digits + " '")
    text = "".join(ch if ch in allowed else " " for ch in text)
    tokens = [t for t in text.split() if t]
    return tokens

def normalize_for_bleu(text: str) -> str:
    """
    Lowercase & strip surrounding spaces. BLEU typically keeps punctuation,
    but we lowercase for robustness.
    """
    return " ".join(text.lower().split())

# ---------- WER (Levenshtein with S, D, I) ----------

def wer_details(ref_tokens, hyp_tokens):
    """
    Returns (S, D, I, N) using DP backtrace for substitutions, deletions, insertions.
    N = len(ref_tokens)
    """
    N = len(ref_tokens)
    M = len(hyp_tokens)

    # DP matrix of edit distance
    dp = [[0]*(M+1) for _ in range(N+1)]
    op = [[None]*(M+1) for _ in range(N+1)]  # operation: 'ok','sub','del','ins'

    for i in range(1, N+1):
        dp[i][0] = i
        op[i][0] = 'del'
    for j in range(1, M+1):
        dp[0][j] = j
        op[0][j] = 'ins'

    for i in range(1, N+1):
        for j in range(1, M+1):
            cost_sub = dp[i-1][j-1] + (0 if ref_tokens[i-1] == hyp_tokens[j-1] else 1)
            cost_del = dp[i-1][j] + 1
            cost_ins = dp[i][j-1] + 1

            best = min(cost_sub, cost_del, cost_ins)
            dp[i][j] = best
            if best == cost_sub:
                op[i][j] = 'ok' if ref_tokens[i-1] == hyp_tokens[j-1] else 'sub'
            elif best == cost_del:
                op[i][j] = 'del'
            else:
                op[i][j] = 'ins'

    # backtrace to count S, D, I
    i, j = N, M
    S = D = I = 0
    while i > 0 or j > 0:
        o = op[i][j]
        if o in ('ok', 'sub'):
            if o == 'sub':
                S += 1
            i -= 1
            j -= 1
        elif o == 'del':
            D += 1
            i -= 1
        elif o == 'ins':
            I += 1
            j -= 1
        else:
            break

    return S, D, I, N

def wer_score(ref_text: str, hyp_text: str):
    ref_tokens = normalize_for_wer(ref_text)
    hyp_tokens = normalize_for_wer(hyp_text)
    S, D, I, N = wer_details(ref_tokens, hyp_tokens)
    wer = (S + D + I) / max(N, 1)
    return wer, S, D, I, N

# ---------- BLEU (sacrebleu preferred, nltk fallback) ----------

def bleu_score(ref_text: str, hyp_text: str):
    """
    Returns BLEU in [0,1]. Uses sacrebleu if available, else NLTK corpus_bleu.
    """
    ref = normalize_for_bleu(ref_text)
    hyp = normalize_for_bleu(hyp_text)

    # Try sacrebleu
    try:
        import sacrebleu
        bleu = sacrebleu.corpus_bleu([hyp], [[ref]]).score / 100.0
        return bleu, "sacrebleu"
    except Exception:
        pass

    # Try NLTK
    try:
        from nltk.translate.bleu_score import corpus_bleu, SmoothingFunction
        ref_tokens = [ref.split()]
        hyp_tokens = [hyp.split()]
        smoothie = SmoothingFunction().method3
        # corpus_bleu expects list of list of refs, and list of hyps
        bleu = corpus_bleu([ref_tokens], [hyp_tokens[0]], smoothing_function=smoothie)
        return bleu, "nltk"
    except Exception:
        return None, "none"

# ---------- CLI usage ----------

def main():
    if len(sys.argv) < 3:
        print("Usage:")
        print("  python metrics.py <reference_file> <hypothesis_file>")
        print("Examples:")
        print("  # WER on transcripts")
        print("  python metrics.py ref_transcript.srt hyp_transcript.srt")
        print("  # BLEU on translations")
        print("  python metrics.py ref_translation.srt hyp_translation.srt")
        sys.exit(1)

    ref_path, hyp_path = sys.argv[1], sys.argv[2]

    ref_text = load_text_from_file(ref_path)
    # print(ref_text)
    hyp_text = load_text_from_file(hyp_path)
    # print(hyp_text)

    # WER
    wer, S, D, I, N = wer_score(ref_text, hyp_text)
    print("\n=== WER (Transcription) ===")
    print(f"N (ref words): {N}")
    print(f"S: {S}, D: {D}, I: {I}")
    print(f"WER: {wer:.4f}  ({wer*100:.2f}%)")

    # BLEU
    bleu, lib = bleu_score(ref_text, hyp_text)
    print("\n=== BLEU (Translation) ===")
    if bleu is None:
        print("BLEU: not computed (install `sacrebleu` or `nltk`)")
        print("Try: pip install sacrebleu   # preferred")
    else:
        src = "sacrebleu" if lib == "sacrebleu" else "nltk"
        print(f"BLEU: {bleu:.4f}  ({bleu*100:.2f}%)  [{src}]")

if __name__ == "__main__":
    main()
