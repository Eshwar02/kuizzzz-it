"""Certificate-of-achievement PDF generation.

Renders a single reusable template (blue/orange geometric border, seal, two
signature lines) personalised per recipient from their name, the quiz/class and
score. Pure reportlab so there are no system-font or headless-browser deps.

Signature handling: a stored handwritten-signature image is out of scope, so we
render typed names in an italic ("script"-style) face above each signature line
— the left one is the quiz's instructor, the right one the platform authority.
This reuses cleanly for every certificate without per-person assets.
"""
from __future__ import annotations

import io
from datetime import date

from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas

# Landscape letter.
PAGE_W, PAGE_H = 792.0, 612.0

NAVY = HexColor("#16406b")
NAVY_DARK = HexColor("#0d2b4a")
BLUE = HexColor("#1c5a8f")
ORANGE = HexColor("#f5a623")
ORANGE_LT = HexColor("#f7b733")
GREY = HexColor("#9aa3ac")
INK = HexColor("#2d3748")


def _draw_corner_ribbons(c: canvas.Canvas) -> None:
    """Diagonal blue/orange accents in the top-right and bottom-left corners."""
    # Top-right cluster.
    c.setFillColor(BLUE)
    c.setStrokeColor(BLUE)
    c.saveState()
    p = c.beginPath()
    p.moveTo(PAGE_W, PAGE_H)
    p.lineTo(PAGE_W - 150, PAGE_H)
    p.lineTo(PAGE_W, PAGE_H - 150)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.setFillColor(ORANGE)
    p = c.beginPath()
    p.moveTo(PAGE_W - 95, PAGE_H)
    p.lineTo(PAGE_W - 55, PAGE_H)
    p.lineTo(PAGE_W, PAGE_H - 55)
    p.lineTo(PAGE_W, PAGE_H - 95)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.restoreState()

    # Bottom-left cluster (mirror).
    c.saveState()
    c.setFillColor(NAVY_DARK)
    p = c.beginPath()
    p.moveTo(0, 0)
    p.lineTo(150, 0)
    p.lineTo(0, 150)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.setFillColor(ORANGE)
    p = c.beginPath()
    p.moveTo(55, 0)
    p.lineTo(95, 0)
    p.lineTo(0, 95)
    p.lineTo(0, 55)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.restoreState()


def _draw_borders(c: canvas.Canvas) -> None:
    c.setLineWidth(3)
    c.setStrokeColor(NAVY)
    c.rect(24, 24, PAGE_W - 48, PAGE_H - 48, stroke=1, fill=0)
    c.setLineWidth(1)
    c.setStrokeColor(GREY)
    c.rect(34, 34, PAGE_W - 68, PAGE_H - 68, stroke=1, fill=0)


def _draw_diamonds(c: canvas.Canvas, cx: float, y: float) -> None:
    for dx, col, s in ((-26, ORANGE, 5), (0, NAVY, 7), (26, ORANGE, 5)):
        c.saveState()
        c.translate(cx + dx, y)
        c.rotate(45)
        c.setFillColor(col)
        c.rect(-s, -s, 2 * s, 2 * s, fill=1, stroke=0)
        c.restoreState()


def _draw_seal(c: canvas.Canvas, cx: float, cy: float) -> None:
    # Ribbon tails.
    c.setFillColor(ORANGE_LT)
    for dx in (-11, 11):
        p = c.beginPath()
        p.moveTo(cx + dx - 7, cy - 6)
        p.lineTo(cx + dx + 7, cy - 6)
        p.lineTo(cx + dx + 4, cy - 40)
        p.lineTo(cx + dx, cy - 30)
        p.lineTo(cx + dx - 4, cy - 40)
        p.close()
        c.drawPath(p, fill=1, stroke=0)
    # Badge disc.
    c.setFillColor(NAVY)
    c.circle(cx, cy, 30, fill=1, stroke=0)
    c.setStrokeColor(ORANGE)
    c.setLineWidth(2)
    c.circle(cx, cy, 25, fill=0, stroke=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(cx, cy + 6, "TOP")
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(cx, cy - 5, "PASS")
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(cx, cy - 16, "AWARD")


def _wrap(c: canvas.Canvas, text: str, font: str, size: float, max_w: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if c.stringWidth(trial, font, size) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def render_certificate(
    *,
    recipient_name: str,
    quiz_title: str,
    class_label: str | None,
    percentage: float,
    instructor_name: str,
    issued_on: date | None = None,
    platform_name: str = "Kuizzz",
) -> bytes:
    issued_on = issued_on or date.today()
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(PAGE_W, PAGE_H))
    cx = PAGE_W / 2

    _draw_corner_ribbons(c)
    _draw_borders(c)

    # Title.
    c.setFillColor(NAVY)
    c.setFont("Times-Roman", 46)
    c.drawCentredString(cx, PAGE_H - 150, "C E R T I F I C A T E")
    c.setFillColor(INK)
    c.setFont("Times-Roman", 20)
    c.drawCentredString(cx, PAGE_H - 180, "OF ACHIEVEMENT")
    _draw_diamonds(c, cx, PAGE_H - 205)

    # Recipient.
    c.setFillColor(INK)
    c.setFont("Times-Roman", 13)
    c.drawCentredString(cx, PAGE_H - 245, "This certificate is proudly presented to")
    c.setFillColor(NAVY_DARK)
    c.setFont("Times-Italic", 40)
    c.drawCentredString(cx, PAGE_H - 295, recipient_name)

    # Body.
    where = f" in {class_label}" if class_label else ""
    body = (
        f"for successfully completing the {quiz_title} assessment{where} "
        f"with a score of {round(percentage)}%, on {issued_on:%B %d, %Y}."
    )
    c.setFillColor(INK)
    c.setFont("Times-Roman", 13)
    y = PAGE_H - 330
    for line in _wrap(c, body, "Times-Roman", 13, 460):
        c.drawCentredString(cx, y, line)
        y -= 20

    _draw_seal(c, cx, 150)

    # Signature lines.
    line_y = 110
    left_cx, right_cx = 200, PAGE_W - 200
    for sig_cx, name, label in (
        (left_cx, instructor_name, "Course Instructor"),
        (right_cx, platform_name, "Quiz Platform"),
    ):
        c.setFillColor(NAVY_DARK)
        c.setFont("Times-Italic", 18)
        c.drawCentredString(sig_cx, line_y + 6, name)
        c.setStrokeColor(NAVY)
        c.setLineWidth(1)
        c.line(sig_cx - 90, line_y, sig_cx + 90, line_y)
        c.setFillColor(INK)
        c.setFont("Helvetica", 10)
        c.drawCentredString(sig_cx, line_y - 16, label)

    c.showPage()
    c.save()
    return buf.getvalue()
