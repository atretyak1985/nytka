from pydantic import BaseModel, Field


class ActionItem(BaseModel):
    title: str = Field(description="Short imperative task title, max 100 chars")
    description: str = Field(default="", description="Context: what, why, agreed details from the conversation")
    assignee: str | None = Field(default=None, description="Person name exactly as mentioned, or null")
    priority: str = Field(default="medium", description="low | medium | high, judged from urgency in conversation")
    area: str | None = Field(
        default=None,
        description="Exactly one value copied from the provided area list, or null if none fits — never invented",
    )
    source_timestamp: float | None = Field(
        default=None, description="Seconds from meeting start where this task was discussed (from [mm:ss] markers)"
    )


class ExtractionResult(BaseModel):
    # Required (no default): local servers with schema-constrained decoding (LM Studio)
    # otherwise satisfy the schema with an empty object `{}` and extraction yields nothing.
    tasks: list[ActionItem] = Field(description="All extracted action items; empty list if none")


class BriefPoint(BaseModel):
    text: str = Field(description="One self-contained sentence, in the meeting's language")
    source_timestamp: float | None = Field(
        default=None, description="Seconds from meeting start (from the [mm:ss] markers), or null"
    )


class BriefResult(BaseModel):
    # No defaults on the lists: LM Studio's schema-constrained decoding satisfies an
    # all-optional schema with `{}` and the brief comes back empty (same trap as ExtractionResult).
    summary: str = Field(description="3-6 sentence executive summary of the meeting")
    decisions: list[BriefPoint] = Field(description="Decisions actually agreed on; empty list if none")
    risks: list[BriefPoint] = Field(description="Risks, blockers, concerns raised; empty list if none")
    open_questions: list[BriefPoint] = Field(description="Questions left unanswered; empty list if none")
    next_steps: list[BriefPoint] = Field(description="Agreed next steps that are not tracked tasks; empty list if none")


class AskCitation(BaseModel):
    meeting_id: int = Field(description="Meeting id copied EXACTLY from the excerpt header")
    t_start: float | None = Field(
        description="Seconds from meeting start, from the excerpt header; null for brief excerpts"
    )
    quote: str = Field(description="Short verbatim quote from that excerpt supporting the answer")


class AskResult(BaseModel):
    # No defaults, same trap as ExtractionResult/BriefResult: LM Studio satisfies an
    # all-optional schema with `{}` and the answer comes back empty.
    answer: str = Field(description="Direct answer in the language of the question")
    no_data: bool = Field(description="True when the excerpts do not contain the answer")
    citations: list[AskCitation] = Field(
        description="Every claim must be backed by one; empty when no_data"
    )


class DuplicateVerdict(BaseModel):
    # No defaults, same trap as ExtractionResult/BriefResult.
    # An index, not a task id: a local model asked for an id will hallucinate one,
    # while a 1-based index into the list it was shown is range-checkable.
    duplicate_of: int | None = Field(
        description="1-based number of the candidate this NEW task duplicates, or null if none"
    )
    reason: str = Field(description="One short sentence why (or why not), in the task's language")


class AreaList(BaseModel):
    """Structured area/sub-area taxonomy extracted from a project's knowledge sources."""

    areas: list[str] = Field(
        default_factory=list,
        description='"[Area][Sub-area]" strings found in the sources; empty list if none',
    )
