# Typeform Clone

A full-stack form builder inspired by Typeform. Create forms, customize questions, publish forms for respondents, collect submissions, and review responses through a dashboard.

## Features

### Form Management

- Create and manage multiple forms.
- Rename, duplicate, publish, unpublish, and delete forms.
- Search forms by title.
- Track question and response counts.

### Form Builder

- Create, edit, reorder, and delete questions.
- Support multiple question types:
  - Short text.
  - Long text.
  - Multiple choice.
  - Dropdown.
  - Email.
  - Number.
  - Yes/No.
  - Rating.
- Configure question descriptions and required fields.
- Save changes to the backend.

### Respondent Experience

- Share a public form URL.
- Display questions one at a time.
- Navigate between questions.
- Validate required fields and supported answer formats.
- Submit responses and display a confirmation screen.

### Results and Analytics

- View total submissions.
- Browse individual responses and their answers.
- View question-level answer distributions and percentages, where implemented.
- Refresh results to see new submissions.

## Technology Stack

### Frontend

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- `@dnd-kit` for drag-and-drop question ordering.

### Backend

- Python.
- FastAPI.
- SQLAlchemy.
- SQLite.

## Project Structure

```text
typeform-clone/
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── f/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   └── forms/
│   │       └── [id]/
│   │           ├── edit/
│   │           │   └── page.tsx
│   │           └── results/
│   │               └── page.tsx
│   └── package.json
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── requirements.txt
│   └── typeform.db
└── README.md
```

## Prerequisites

Install the following before running the project:

- Python 3.12.
- Node.js and npm.
- Git (optional, but recommended).

## Setup and Installation

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd typeform-clone
```

If the project is already on your computer, open its root folder in VS Code instead.

### 2. Start the Backend

Open a terminal in the project root and navigate to the backend directory:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```powershell
pip install -r requirements.txt
```

Start the FastAPI server:

```powershell
uvicorn main:app --reload
```

The backend runs at:

- API base URL: http://127.0.0.1:8000
- Interactive API documentation: http://127.0.0.1:8000/docs

Keep this terminal running.

### 3. Start the Frontend

Open a second terminal in the project root and navigate to the frontend directory:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at:

http://localhost:3000

Keep both terminals running while using the application.

## Architecture

The application follows a frontend-backend architecture.

- **Frontend:** Next.js and React provide the dashboard, form editor, public form-filling interface, and results pages.
- **Backend:** FastAPI exposes REST API endpoints for form management, question updates, publishing, and response submission.
- **Database:** SQLite stores form definitions, questions, submissions, and answers.
- **ORM:** SQLAlchemy maps Python models to database tables and manages database operations.

The frontend communicates with the backend over HTTP. Published forms can be accessed through their public URLs without requiring respondents to log in.

## Database Design

The application uses SQLite for persistent local storage and SQLAlchemy for database operations.

The database contains four main entities:

### Form

Stores form information, including the title, unique public slug, publication status, and creation timestamp.

### Question

Stores question information, including the associated form, title, question type, description, required setting, display position, options, and active status.

### FormResponse

Represents an individual submission associated with a form and stores its submission timestamp.

### Answer

Stores an individual answer associated with a response and question. Question title and type snapshots help preserve historical question information where available.

These entities are connected through database relationships to organize forms, questions, submissions, and answers.

## API Endpoints

The FastAPI backend exposes the following endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Check the backend status. |
| GET | `/health` | Check API health. |
| GET | `/api/forms` | List all forms. |
| POST | `/api/forms` | Create a form. |
| PATCH | `/api/forms/{form_id}` | Rename a form. |
| PATCH | `/api/forms/{form_id}/publish` | Toggle publication status. |
| POST | `/api/forms/{form_id}/duplicate` | Duplicate a form. |
| DELETE | `/api/forms/{form_id}` | Delete a form. |
| GET | `/api/forms/{form_id}` | Retrieve form details and questions. |
| PUT | `/api/forms/{form_id}/questions` | Save questions. |
| GET | `/api/public/forms/{slug}` | Retrieve a published form. |
| POST | `/api/public/forms/{slug}/responses` | Submit a response. |
| GET | `/api/forms/{form_id}/responses` | List responses for a form. |
| GET | `/api/forms/{form_id}/responses/{response_id}` | Retrieve an individual response. |

For complete request and response details, start the backend and visit http://127.0.0.1:8000/docs.

## Using the Application

1. Open the dashboard at http://localhost:3000.
2. Create a new form or select an existing form.
3. Add questions and configure their settings in the editor.
4. Reorder questions using drag-and-drop.
5. Save the changes.
6. Publish the form to make it accessible to respondents.
7. Open the public form URL and submit a response.
8. Navigate to the Results page to view submissions and individual answers.

### Public Form URL

A public form URL follows this pattern:

```text
http://localhost:3000/f/YOUR_FORM_SLUG
```

Replace `YOUR_FORM_SLUG` with the actual slug assigned to the form.

Respondents can access published forms without creating an account.

## Project Status

The core application workflows have been implemented, including form management, question editing and reordering, publishing and unpublishing forms, public response submission, and viewing individual responses.

## Future Improvements

- Export responses to CSV.
- Enhance question-level analytics and data visualizations.
- Add user authentication and workspace management.
- Deploy the application using a production database.
- Add automated tests for the frontend and backend.

## Deployment

The application can be deployed using platforms such as Vercel for the frontend and Render or Railway for the backend.

For a production deployment, configure the frontend to use the deployed backend URL, update the backend's CORS settings, and use persistent database storage.

The local development URLs documented above apply only when running the application on your own computer.

## Author

Developed as a full-stack form-builder project using Next.js, FastAPI, SQLAlchemy, and SQLite.