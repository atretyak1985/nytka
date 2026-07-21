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


class AreaList(BaseModel):
    """Structured area/sub-area taxonomy extracted from a project's knowledge sources."""

    areas: list[str] = Field(
        default_factory=list,
        description='"[Area][Sub-area]" strings found in the sources; empty list if none',
    )
