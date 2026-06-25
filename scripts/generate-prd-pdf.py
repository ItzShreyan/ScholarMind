from __future__ import annotations

from datetime import date
from pathlib import Path
from textwrap import dedent

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
PDF_PATH = DOCS / "ScholarMind-PRD-Launch-Brief.pdf"
MD_PATH = DOCS / "ScholarMind-PRD-Launch-Brief.md"


class StatCard(Flowable):
    def __init__(self, value: str, label: str, accent: colors.Color):
        super().__init__()
        self.value = value
        self.label = label
        self.accent = accent
        self.width = 48 * mm
        self.height = 33 * mm

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(colors.HexColor("#111827"))
        c.roundRect(0, 0, self.width, self.height, 8, fill=1, stroke=0)
        c.setFillColor(self.accent)
        c.roundRect(0, self.height - 4, self.width, 4, 4, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(5 * mm, 18 * mm, self.value)
        c.setFillColor(colors.HexColor("#C9D4E6"))
        c.setFont("Helvetica", 7.5)
        c.drawString(5 * mm, 10 * mm, self.label[:42])
        c.restoreState()


def p(text: str, style: ParagraphStyle):
    return Paragraph(text, style)


def bullets(items: list[str], style: ParagraphStyle):
    return ListFlowable(
        [ListItem(Paragraph(item, style), leftIndent=10) for item in items],
        bulletType="bullet",
        leftIndent=14,
        bulletFontName="Helvetica-Bold",
        bulletColor=colors.HexColor("#28D4FF"),
    )


def section(title: str, body: list[Flowable], styles: dict[str, ParagraphStyle]):
    return [Spacer(1, 5 * mm), p(title, styles["h2"]), Spacer(1, 2 * mm), *body]


def build_markdown() -> str:
    return dedent(
        f"""
        # ScholarMind Product Requirements & Launch Brief

        **Version:** ScholarMind 1.0 public-release brief  
        **Generated:** {date.today().isoformat()}  
        **Positioning:** AI tutor workspace that turns student notes, PDFs, images, slides, spreadsheets, and trusted web sources into grounded explanations, AI Notes, quizzes, flashcards, mock exams, canvas annotations, and revision plans.

        ## Executive Summary

        ScholarMind is a student-first AI study companion for learners who need to move from messy course material into active revision. Unlike generic chatbot workflows, ScholarMind keeps work inside source-grounded Studios: students upload or import notes, then ask a personalised tutor, generate study tools, annotate canvas tabs, and continue revision across devices.

        ## Market Signals

        - Grand View Research reports the global AI in education market was valued at **USD 8.3B in 2025** and projects **USD 57.2B by 2033** at **25.9% CAGR**.
        - Grand View Research projects e-learning services to reach **USD 1.485T by 2033** with **19.9% CAGR from 2026 to 2033**.
        - Grand View Research reports mobile learning generated **USD 95.3B in 2025** and is expected to reach **USD 392.2B by 2033**.
        - Quizlet reported **over 60M monthly users**, showing large demand for digital study tools and active recall workflows.

        ## Product Pillars

        1. Source-grounded learning: every serious answer starts from enabled study sources.
        2. Personalised AI tutor: onboarding profile shapes curriculum, country, exam board, tier, subjects, goals, and style.
        3. Active revision tools: AI Notes, summaries, quizzes, flashcards, exam practice, schedules, and canvas work.
        4. Studio workflow: a notebook-style workspace with tabs, split view, canvas, chat history, and saved outputs.
        5. Safety and trust: Supabase auth/RLS, upload validation, usage limits, Mind Security Engine, and optional Arcjet.

        ## Current Product Scope

        - 25 app pages and 24 API routes.
        - Supabase-backed auth, studios, files, chat history, reminders, onboarding, usage tracking, subscriptions, telemetry, site settings, and revision plans.
        - Upload support: PDF, images, DOCX, PPTX, ODP, spreadsheets, CSV/TSV, markdown, JSON, XML, HTML, RTF, TXT.
        - OCR support for images and image-heavy PDFs.
        - OpenRouter key rotation with up to 10 keys and live AI-only study tools.
        - Canvas mode with text annotations, highlighter/draw tools, stylus support, and AI screen context.
        - SEO routes for AI study assistant, study tools, flashcards, quiz maker, revision planner, exam preparation, homework help, study techniques, online learning, and academic success.

        ## Feature Requirements

        ### Studio
        - Users can create, rename, delete, and switch Studios.
        - Each Studio contains notes, source-enabled controls, AI tutor chat, generated outputs, and recent chats.
        - Workspace tabs open notes, sources, search results, AI outputs, canvas tabs, quizzes, and exams.
        - Split view supports selector, right-click pinning, and drag-to-left/right split placement.

        ### AI Tutor
        - Tutor supports casual greetings but switches to source-grounded step-by-step learning for study questions.
        - Tutor can suggest and trigger tools.
        - Tutor avoids giving quiz/exam answers too early; it guides with hints and method first.
        - Tutor can use visible workspace context, current notes, canvas annotations, and generated outputs.

        ### Study Tools
        - Summary: concise revision-ready markdown.
        - AI Notes: long textbook-style notes with sections, formulas, callouts, worked examples, practice questions, diagrams, and science simulations only when useful.
        - Flashcards: active-recall cards.
        - Quiz: interactive multiple-choice questions with answer/explanation and results table.
        - Exam Generator: practice-question mode or longer exam-style mock paper with marks and mark scheme.

        ### Notes & Uploads
        - Uploads are validated for size, file signature, ownership, and unsafe extensions.
        - Extracted text is cleaned to remove code junk, metadata, URLs, furniture text, placeholder fragments, and repeated artifacts.
        - Users can delete notes and exclude notes from AI/tools/revision.

        ### Security
        - Mind Security Engine adds request scoring, suspicious pattern checks, rate limiting, challenge routing, and security headers.
        - Supabase Row Level Security keeps user data account-scoped.
        - Host panel is restricted to `shreyanmadi@gmail.com`.

        ## Differentiation

        - NotebookLM-like source grounding plus student-specific active-recall tools.
        - Medly-style tutor direction, but with uploaded-source Studio context and canvas annotations.
        - Quizlet-like flashcards/quizzes, but generated from personal notes and linked to tutor help.
        - Long-form AI Notes and science simulations in the same workspace, not separate exports.
        - Built-in launch SEO, security badge, privacy/terms, sitemap, robots, and host analytics.

        ## Go-To-Market Message

        **Tagline:** Turn your notes into a personal AI tutor.  
        **Primary promise:** Upload notes once; revise with explanations, AI Notes, quizzes, flashcards, mock exams, and schedules grounded to your material.  
        **Audience:** GCSE/A-Level/high-school students, university students, adult learners, online course takers, and exam revisers.

        ## Advertisement Angles

        - “Stop rereading notes. Turn them into quizzes, flashcards, and mock exams.”
        - “Ask an AI tutor that actually knows your class notes.”
        - “From PDF to practice questions in one Studio.”
        - “Revise with a tutor, not a blank chatbot.”
        - “For students drowning in notes before exams.”

        ## KPIs

        - Activation: first note uploaded/imported.
        - Aha moment: first AI tool generated from a source.
        - Retention: return to same Studio within 7 days.
        - Learning depth: quiz completion rate, flashcard flips, exam attempts, schedule completions.
        - Quality: AI output thumbs-up/down, regenerated output rate, source unreadable rate.
        - Growth: SEO impressions, landing conversion, referrals, share/export events.

        ## Launch Readiness

        Passed local release checks:
        - TypeScript typecheck.
        - Production build.
        - Upload verifier.
        - Local production AI tool verifier for Quiz, Summary, Flashcards, AI Notes, and Exam Generator.

        Remaining manual QA:
        - Signed-in browser pass with a real uploaded note.
        - Deployed Supabase sample uploads across PDF, image, DOCX, PPTX, ODP, spreadsheet, CSV/text, and image-heavy PDF.
        - Spotify full playback requires encrypted token storage, refresh tokens, and Web Playback SDK. Spotify free accounts have limited playback; Premium is generally required for full playback.

        ## Sources

        - Grand View Research, AI in Education Market: https://www.grandviewresearch.com/industry-analysis/artificial-intelligence-ai-education-market-report
        - Grand View Research, E-learning Services press release: https://www.grandviewresearch.com/press-release/global-e-learning-services-market
        - Grand View Research, Mobile Learning statistics: https://www.grandviewresearch.com/horizon/statistics/e-learning-services-market/learning-method/mobile-learning/global
        - PR Newswire, Quizlet AI tools release: https://www.prnewswire.com/news-releases/quizlet-launches-advanced-ai-powered-tools-for-next-gen-studying-301895290.html
        """
    ).strip() + "\n"


def build_pdf():
    DOCS.mkdir(exist_ok=True)
    styles_base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "title",
            parent=styles_base["Title"],
            fontName="Helvetica-Bold",
            fontSize=28,
            leading=31,
            textColor=colors.white,
            alignment=TA_CENTER,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=styles_base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#DDE7F5"),
            alignment=TA_CENTER,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=styles_base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=23,
            textColor=colors.HexColor("#111827"),
            spaceAfter=7,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=styles_base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14.5,
            leading=18,
            textColor=colors.HexColor("#0F4C81"),
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            parent=styles_base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#263244"),
        ),
        "small": ParagraphStyle(
            "small",
            parent=styles_base["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#58677D"),
        ),
        "callout": ParagraphStyle(
            "callout",
            parent=styles_base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#111827"),
            alignment=TA_LEFT,
        ),
    }

    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title="ScholarMind Product Requirements & Launch Brief",
        author="ScholarMind",
    )

    story: list[Flowable] = []

    cover = Table(
        [
            [
                [
                    Spacer(1, 18 * mm),
                    p("ScholarMind", styles["title"]),
                    Spacer(1, 2 * mm),
                    p("Product Requirements & Launch Brief", styles["subtitle"]),
                    Spacer(1, 4 * mm),
                    p(
                        "AI tutor workspace for source-grounded study, active recall, long-form AI Notes, canvas annotation, revision planning, and secure student workflows.",
                        styles["subtitle"],
                    ),
                    Spacer(1, 10 * mm),
                    Table(
                        [
                            [
                                StatCard("25", "app pages", colors.HexColor("#5EEAD4")),
                                StatCard("24", "API routes", colors.HexColor("#38BDF8")),
                                StatCard("20+", "file/MIME types", colors.HexColor("#FDBA74")),
                            ],
                            [
                                StatCard("10", "OpenRouter key slots", colors.HexColor("#A7F3D0")),
                                StatCard("12MB", "default upload cap", colors.HexColor("#FCA5A5")),
                                StatCard("1.0", "public release brief", colors.HexColor("#C4B5FD")),
                            ],
                        ],
                        colWidths=[54 * mm, 54 * mm, 54 * mm],
                        rowHeights=[38 * mm, 38 * mm],
                        hAlign="CENTER",
                    ),
                ]
            ]
        ],
        colWidths=[180 * mm],
        rowHeights=[252 * mm],
    )
    cover.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0B1220")),
                ("BOX", (0, 0), (-1, -1), 0, colors.HexColor("#0B1220")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(cover)
    story.append(PageBreak())

    story += section(
        "1. Executive Summary",
        [
            p(
                "ScholarMind is a student-first AI study companion that turns messy course material into active revision. Students work inside Studios, upload or import notes, then ask a personalised tutor, generate study tools, annotate canvas tabs, and continue progress across devices.",
                styles["body"],
            ),
            p(
                "<b>Positioning:</b> source-grounded AI tutor + active recall workspace + long-form AI Notes + canvas/revision ecosystem.",
                styles["callout"],
            ),
        ],
        styles,
    )

    market_table = Table(
        [
            ["Signal", "Stat", "Why it matters"],
            ["AI in education", "$8.3B in 2025; forecast $57.2B by 2033", "Validates timing for AI tutors and personalised learning."],
            ["E-learning services", "Projected $1.485T by 2033; 19.9% CAGR", "Shows broad market pull for flexible digital study."],
            ["Mobile learning", "$95.3B in 2025 to $392.2B by 2033", "Supports mobile/tablet-first study workflows."],
            ["Quizlet", "60M+ monthly users", "Proves massive demand for flashcards, quizzes, and active recall."],
        ],
        colWidths=[38 * mm, 55 * mm, 74 * mm],
        repeatRows=1,
    )
    market_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DDF7FF")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0B1220")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#C8D3E0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FBFF")]),
            ]
        )
    )
    story += section("2. Market Signals", [market_table], styles)

    story += section(
        "3. Product Pillars",
        [
            bullets(
                [
                    "<b>Source-grounded learning:</b> serious answers and tools use enabled notes/sources.",
                    "<b>Personalised AI tutor:</b> onboarding profile shapes curriculum, country, subject, exam board, tier, goal, and learning style.",
                    "<b>Active revision:</b> AI Notes, summaries, flashcards, quizzes, exam practice, schedules, and canvas work.",
                    "<b>Studio workflow:</b> notebook-like tabs, split view, recent chats, saved outputs, and annotations.",
                    "<b>Trust and safety:</b> Supabase RLS, Mind Security Engine, upload checks, usage limits, privacy/terms, sitemap, and host analytics.",
                ],
                styles["body"],
            )
        ],
        styles,
    )

    feature_rows = [
        ["Area", "Requirements"],
        ["Studio", "Create/rename/delete Studios; open notes and outputs as internal workspace tabs; split view via selector, right-click, or drag left/right."],
        ["AI Tutor", "Casual chat plus source-grounded step-by-step study help; can suggest/trigger tools; screen-aware pulse when reading workspace context."],
        ["AI Notes", "Long textbook-style notes with sections, formulas, callouts, worked examples, practice questions, diagrams, and science-only simulations when useful."],
        ["Quiz", "Interactive multiple-choice questions, answer reveal, explanations, and results table."],
        ["Flashcards", "Swipeable active-recall cards generated from enabled sources."],
        ["Exam Generator", "Practice-question mode or longer mock paper with marks and mark scheme; original exam-style questions only."],
        ["Canvas", "Text annotations, highlighter/draw tools, stylus support, and tutor-visible context."],
        ["Uploads", "PDF, images, DOCX, PPTX, ODP, spreadsheets, CSV/TSV, markdown, JSON, XML, HTML, RTF, TXT with validation and cleaning."],
    ]
    feature_table = Table(feature_rows, colWidths=[38 * mm, 129 * mm], repeatRows=1)
    feature_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FFF1D6")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 10.5),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D7C7A8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story += section("4. Feature Requirements", [feature_table], styles)

    story.append(PageBreak())
    story += section(
        "5. Architecture & Data",
        [
            p(
                "ScholarMind uses Next.js App Router, TypeScript, Supabase Auth/Postgres/Storage, OpenRouter-backed AI generation, OCR/document parsing, Framer Motion, Three.js, and a modular component/API structure.",
                styles["body"],
            ),
            bullets(
                [
                    "Supabase tables: sessions, files, chat messages, reminders, onboarding, AI usage, revision plans, site events, site settings, subscriptions.",
                    "AI provider path: OpenRouter V2 with key rotation, timeout/retry handling, source context, and reasoning exclusion.",
                    "Security path: local suspicious request scoring, security headers, rate limits, human verification route, optional Arcjet.",
                    "SEO path: sitemap, robots, privacy, terms, and 10 targeted SEO pages for study-related searches.",
                ],
                styles["body"],
            ),
        ],
        styles,
    )

    story += section(
        "6. Competitive Differentiation",
        [
            bullets(
                [
                    "NotebookLM-like source grounding, but aimed at exam revision and active recall.",
                    "Medly-style step-by-step tutoring, but tied to user-uploaded notes and visible workspace context.",
                    "Quizlet-like cards/quizzes, but generated from personal notes and connected to tutor help.",
                    "Long-form AI Notes plus science simulations inside the same Studio.",
                    "Canvas annotations and stylus support let students work directly on notes and outputs.",
                ],
                styles["body"],
            )
        ],
        styles,
    )

    story += section(
        "7. Go-To-Market & Advertising",
        [
            p("<b>Tagline:</b> Turn your notes into a personal AI tutor.", styles["body"]),
            p("<b>Primary promise:</b> Upload notes once; revise with explanations, AI Notes, quizzes, flashcards, mock exams, and schedules grounded to your material.", styles["body"]),
            bullets(
                [
                    "Stop rereading notes. Turn them into quizzes, flashcards, and mock exams.",
                    "Ask an AI tutor that actually knows your class notes.",
                    "From PDF to practice questions in one Studio.",
                    "Revise with a tutor, not a blank chatbot.",
                    "For students drowning in notes before exams.",
                ],
                styles["body"],
            ),
        ],
        styles,
    )

    kpi_rows = [
        ["Funnel", "Metric"],
        ["Activation", "First note uploaded/imported; first Studio created."],
        ["Aha moment", "First generated AI tool from enabled sources."],
        ["Retention", "Return to same Studio within 7 days."],
        ["Learning depth", "Quiz completion, flashcard flips, exam attempts, schedule completions."],
        ["Quality", "Thumbs-up/down, regenerated-output rate, unreadable-source rate."],
        ["Growth", "SEO impressions, landing conversion, referrals, share/export events."],
    ]
    kpi_table = Table(kpi_rows, colWidths=[42 * mm, 125 * mm], repeatRows=1)
    kpi_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E7FFE9")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#B9D8BD")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story += section("8. KPIs", [kpi_table], styles)

    story += section(
        "9. Launch Readiness",
        [
            bullets(
                [
                    "Passed TypeScript typecheck.",
                    "Passed production build.",
                    "Passed upload-format verifier.",
                    "Passed local production AI tool verifier for Quiz, Summary, Flashcards, AI Notes, and Exam Generator.",
                    "Remaining: signed-in browser QA and deployed Supabase sample-upload pass.",
                ],
                styles["body"],
            )
        ],
        styles,
    )

    story += section(
        "10. Sources",
        [
            p("Grand View Research: AI in Education Market, e-learning services press release, and mobile learning statistics.", styles["small"]),
            p("PR Newswire: Quizlet launches advanced AI-powered tools and reports over 60M monthly users.", styles["small"]),
            p("Repository scan: app routes, API routes, Supabase schema, document parser, security engine, AI provider, and launch checklist.", styles["small"]),
        ],
        styles,
    )

    def on_page(canvas, _doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#6B7280"))
        canvas.drawString(15 * mm, 8 * mm, "ScholarMind Product Requirements & Launch Brief")
        canvas.drawRightString(195 * mm, 8 * mm, f"Page {canvas.getPageNumber()}")
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)


if __name__ == "__main__":
    DOCS.mkdir(exist_ok=True)
    MD_PATH.write_text(build_markdown(), encoding="utf-8")
    build_pdf()
    print(f"Wrote {MD_PATH}")
    print(f"Wrote {PDF_PATH}")
