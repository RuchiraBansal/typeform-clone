
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


class Form(Base):
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, default="Untitled form")
    slug = Column(String(100), unique=True, index=True, nullable=False)
    published = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    questions = relationship(
        "Question",
        back_populates="form",
        cascade="all, delete-orphan",
        order_by="Question.position",
    )

    responses = relationship(
        "FormResponse",
        back_populates="form",
        cascade="all, delete-orphan",
    )


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)

    form_id = Column(
        Integer,
        ForeignKey("forms.id"),
        nullable=False,
    )

    title = Column(
        String(500),
        nullable=False,
        default="Untitled question",
    )

    question_type = Column(
        String(50),
        nullable=False,
        default="short_text",
    )

    description = Column(Text, nullable=True)
    required = Column(Boolean, default=True, nullable=False)
    position = Column(Integer, default=0, nullable=False)
    options = Column(Text, nullable=True)

    # Inactive questions remain in the database so historical
    # responses can continue referencing their original questions.
    is_active = Column(Boolean, default=True, nullable=False)

    form = relationship("Form", back_populates="questions")


class FormResponse(Base):
    __tablename__ = "form_responses"

    id = Column(Integer, primary_key=True, index=True)

    form_id = Column(
        Integer,
        ForeignKey("forms.id"),
        nullable=False,
    )

    submitted_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    form = relationship("Form", back_populates="responses")

    answers = relationship(
        "Answer",
        back_populates="response",
        cascade="all, delete-orphan",
    )


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)

    response_id = Column(
        Integer,
        ForeignKey("form_responses.id"),
        nullable=False,
    )

    question_id = Column(
        Integer,
        ForeignKey("questions.id"),
        nullable=False,
    )

    # Preserve the original question wording and type for results.
    question_title = Column(String(500), nullable=True)
    question_type = Column(String(50), nullable=True)

    answer_text = Column(Text, nullable=False, default="")

    response = relationship(
        "FormResponse",
        back_populates="answers",
    )

    question = relationship("Question")
