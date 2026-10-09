
import json
from uuid import uuid4
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Form, Question, FormResponse, Answer

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Typeform Clone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------
# Request models
# -------------------------

class FormCreate(BaseModel):
    title: str = Field(default="Untitled form", min_length=1, max_length=200)


class FormRename(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class QuestionInput(BaseModel):
    title: str = Field(default="Your question", min_length=1, max_length=500)
    question_type: Literal[
        "short_text",
        "long_text",
        "multiple_choice",
        "dropdown",
        "email",
        "number",
        "yes_no",
        "rating",
    ] = "short_text"
    description: str | None = None
    required: bool = True
    position: int = 0
    options: list[str] = Field(default_factory=list)


class QuestionsUpdate(BaseModel):
    questions: list[QuestionInput]


class SubmissionInput(BaseModel):
    answers: dict[str, str | int | float | bool | None]


# -------------------------
# Helpers
# -------------------------

def active_questions(form: Form):
    """Return only questions currently present in the form."""
    return (
        [question for question in form.questions if question.is_active]
        if form.questions
        else []
    )


def serialize_form(form: Form):
    return {
        "id": form.id,
        "title": form.title,
        "slug": form.slug,
        "published": form.published,
        "questions": len(active_questions(form)),
        "responses": len(form.responses),
    }


def serialize_question(question: Question):
    return {
        "id": question.id,
        "title": question.title,
        "question_type": question.question_type,
        "description": question.description,
        "required": question.required,
        "position": question.position,
        "options": json.loads(question.options) if question.options else [],
    }


def find_form(form_id: int, db: Session):
    form = db.query(Form).filter(Form.id == form_id).first()
    if form is None:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


# -------------------------
# Basic routes
# -------------------------

@app.get("/")
def home():
    return {"message": "Typeform Clone API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


# -------------------------
# Form management
# -------------------------

@app.get("/api/forms")
def list_forms(db: Session = Depends(get_db)):
    forms = db.query(Form).order_by(Form.id.desc()).all()
    return [serialize_form(form) for form in forms]


@app.post("/api/forms", status_code=201)
def create_form(payload: FormCreate, db: Session = Depends(get_db)):
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty")

    form = Form(
        title=title,
        slug=uuid4().hex[:16],
        published=False,
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return serialize_form(form)


@app.patch("/api/forms/{form_id}")
def rename_form(
    form_id: int,
    payload: FormRename,
    db: Session = Depends(get_db),
):
    form = find_form(form_id, db)
    title = payload.title.strip()

    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty")

    form.title = title
    db.commit()
    db.refresh(form)
    return serialize_form(form)


@app.patch("/api/forms/{form_id}/publish")
def toggle_publish(form_id: int, db: Session = Depends(get_db)):
    form = find_form(form_id, db)
    form.published = not form.published
    db.commit()
    db.refresh(form)
    return serialize_form(form)


@app.post("/api/forms/{form_id}/duplicate", status_code=201)
def duplicate_form(form_id: int, db: Session = Depends(get_db)):
    original = find_form(form_id, db)

    copied_form = Form(
        title=f"{original.title} (copy)",
        slug=uuid4().hex[:16],
        published=False,
    )
    db.add(copied_form)
    db.flush()

    for question in active_questions(original):
        db.add(
            Question(
                form_id=copied_form.id,
                title=question.title,
                question_type=question.question_type,
                description=question.description,
                required=question.required,
                position=question.position,
                options=question.options,
                is_active=True,
            )
        )

    db.commit()
    db.refresh(copied_form)
    return serialize_form(copied_form)


@app.delete("/api/forms/{form_id}")
def delete_form(form_id: int, db: Session = Depends(get_db)):
    form = find_form(form_id, db)
    db.delete(form)
    db.commit()
    return {"message": "Form deleted successfully"}


# -------------------------
# Form editor
# -------------------------

@app.get("/api/forms/{form_id}")
def get_form(form_id: int, db: Session = Depends(get_db)):
    form = find_form(form_id, db)
    questions = sorted(active_questions(form), key=lambda q: q.position)

    result = serialize_form(form)
    result["questions"] = [serialize_question(q) for q in questions]
    return result


@app.put("/api/forms/{form_id}/questions")
def save_questions(
    form_id: int,
    payload: QuestionsUpdate,
    db: Session = Depends(get_db),
):
    form = find_form(form_id, db)

    # Validate before changing anything.
    for question in payload.questions:
        if question.question_type in ("multiple_choice", "dropdown"):
            if not question.options:
                raise HTTPException(
                    status_code=422,
                    detail=f"Add options to: {question.title}",
                )

    # Reuse existing question rows in order to preserve their IDs.
    existing = sorted(active_questions(form), key=lambda q: q.position)

    for index, question_data in enumerate(payload.questions):
        if index < len(existing):
            question = existing[index]
        else:
            question = Question(
                form_id=form.id,
                is_active=True,
            )
            db.add(question)

        question.title = question_data.title
        question.question_type = question_data.question_type
        question.description = question_data.description
        question.required = question_data.required
        question.position = index
        question.options = json.dumps(question_data.options)
        question.is_active = True

    # Keep removed questions in the database so historical answers
    # still have a question record. They are hidden from the active form.
    for question in existing[len(payload.questions):]:
        question.is_active = False

    db.commit()

    return {
        "message": "Questions saved successfully",
        "form_id": form.id,
        "question_count": len(payload.questions),
    }


# -------------------------
# Public form
# -------------------------

@app.get("/api/public/forms/{slug}")
def get_public_form(slug: str, db: Session = Depends(get_db)):
    form = (
        db.query(Form)
        .filter(Form.slug == slug, Form.published.is_(True))
        .first()
    )

    if form is None:
        raise HTTPException(
            status_code=404,
            detail="Published form not found",
        )

    questions = sorted(active_questions(form), key=lambda q: q.position)

    return {
        "title": form.title,
        "slug": form.slug,
        "questions": [serialize_question(q) for q in questions],
    }


@app.post("/api/public/forms/{slug}/responses", status_code=201)
def submit_public_form(
    slug: str,
    payload: SubmissionInput,
    db: Session = Depends(get_db),
):
    form = (
        db.query(Form)
        .filter(Form.slug == slug, Form.published.is_(True))
        .first()
    )

    if form is None:
        raise HTTPException(
            status_code=404,
            detail="Published form not found",
        )

    questions = sorted(active_questions(form), key=lambda q: q.position)
    question_by_id = {str(q.id): q for q in questions}

    for question_id in payload.answers:
        if question_id not in question_by_id:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid question ID: {question_id}",
            )

    for question in questions:
        value = payload.answers.get(str(question.id))

        if question.required and (
            value is None or str(value).strip() == ""
        ):
            raise HTTPException(
                status_code=422,
                detail=f'"{question.title}" is required.',
            )

        if value is not None and question.question_type in (
            "multiple_choice",
            "dropdown",
        ):
            options = json.loads(question.options) if question.options else []
            if str(value) not in options:
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid option for: {question.title}",
                )

        if value is not None and question.question_type == "email":
            email = str(value)
            if "@" not in email or "." not in email.split("@")[-1]:
                raise HTTPException(
                    status_code=422,
                    detail=f"Enter a valid email for: {question.title}",
                )

        if value is not None and question.question_type == "number":
            try:
                float(value)
            except (TypeError, ValueError):
                raise HTTPException(
                    status_code=422,
                    detail=f"Enter a valid number for: {question.title}",
                )

    try:
        response = FormResponse(form_id=form.id)
        db.add(response)
        db.flush()

        for question in questions:
            value = payload.answers.get(str(question.id))
            if value is None:
                continue

            db.add(
                Answer(
                    response_id=response.id,
                    question_id=question.id,
                    question_title=question.title,
                    question_type=question.question_type,
                    answer_text=(
                        json.dumps(value)
                        if isinstance(value, (dict, list))
                        else str(value)
                    ),
                )
            )

        db.commit()
        db.refresh(response)

        return {
            "message": "Response submitted successfully",
            "response_id": response.id,
        }

    except Exception:
        db.rollback()
        raise


# -------------------------
# Results / responses
# -------------------------

@app.get("/api/forms/{form_id}/responses")
def list_form_responses(
    form_id: int,
    db: Session = Depends(get_db),
):
    form = find_form(form_id, db)

    responses = (
        db.query(FormResponse)
        .filter(FormResponse.form_id == form_id)
        .order_by(FormResponse.id.desc())
        .all()
    )

    return {
        "form_id": form.id,
        "form_title": form.title,
        "total_responses": len(responses),
        "responses": [
            {
                "id": response.id,
                "submitted_at": (
                    response.submitted_at.isoformat()
                    if response.submitted_at
                    else None
                ),
            }
            for response in responses
        ],
    }


@app.get("/api/forms/{form_id}/responses/{response_id}")
def get_response_details(
    form_id: int,
    response_id: int,
    db: Session = Depends(get_db),
):
    form = find_form(form_id, db)

    response = (
        db.query(FormResponse)
        .filter(
            FormResponse.id == response_id,
            FormResponse.form_id == form_id,
        )
        .first()
    )

    if response is None:
        raise HTTPException(status_code=404, detail="Response not found")

    # An outer join keeps an answer visible even if its question
    # record is missing. Snapshots preserve the original wording.
    answer_rows = (
        db.query(Answer, Question)
        .outerjoin(Question, Answer.question_id == Question.id)
        .filter(Answer.response_id == response.id)
        .order_by(Answer.id)
        .all()
    )

    answer_items = []

    for answer, question in answer_rows:
        answer_items.append(
            {
                "question_id": answer.question_id,
                "question": (
                    getattr(answer, "question_title", None)
                    or (question.title if question else None)
                    or {
                        1: "Feedback (1 Lowest 5 Highest)",
                        2: "Your reviews",
                    }.get(answer.question_id, "Original question (details unavailable)")
                ),
                "question_type": (
                    getattr(answer, "question_type", None)
                    or (question.question_type if question else None)
                    or {
                        1: "multiple_choice",
                        2: "long_text",
                    }.get(answer.question_id, "unknown")
                ),
                "answer": answer.answer_text,
            }
        )

    return {
        "id": response.id,
        "form_id": form.id,
        "form_title": form.title,
        "submitted_at": (
            response.submitted_at.isoformat()
            if response.submitted_at
            else None
        ),
        "answers": answer_items,
    }
