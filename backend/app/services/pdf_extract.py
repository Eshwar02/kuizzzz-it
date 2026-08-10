import io

from pypdf import PdfReader

MAX_CHARS = 16000  # keep the prompt within a sane token budget


def extract_text_from_pdf(data: bytes, max_chars: int = MAX_CHARS) -> str:
    """Extract plain text from a PDF byte payload, truncated to max_chars."""
    reader = PdfReader(io.BytesIO(data))
    chunks: list[str] = []
    total = 0
    for page in reader.pages:
        text = page.extract_text() or ""
        if not text:
            continue
        chunks.append(text)
        total += len(text)
        if total >= max_chars:
            break
    return "\n".join(chunks)[:max_chars].strip()
