from pydantic import BaseModel, Field


class ActionItem(BaseModel):
    title: str = Field(description="Short imperative task title, max 100 chars")
    description: str = Field(default="", description="Context: what, why, agreed details from the conversation")
    assignee: str | None = Field(default=None, description="Person name exactly as mentioned, or null")
    priority: str = Field(default="medium", description="low | medium | high, judged from urgency in conversation")
    source_timestamp: float | None = Field(
        default=None, description="Seconds from meeting start where this task was discussed (from [mm:ss] markers)"
    )


class ExtractionResult(BaseModel):
    tasks: list[ActionItem] = Field(default_factory=list)
