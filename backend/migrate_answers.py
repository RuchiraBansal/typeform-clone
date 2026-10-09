
from sqlalchemy import inspect, text

from database import engine


def migrate():
    inspector = inspect(engine)

    if "answers" not in inspector.get_table_names():
        raise RuntimeError(
            "The answers table does not exist. "
            "Check that the correct database is being used."
        )

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("answers")
    }

    with engine.begin() as connection:
        if "question_title" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE answers "
                    "ADD COLUMN question_title VARCHAR(500)"
                )
            )
            print("Added question_title column.")

        if "question_type" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE answers "
                    "ADD COLUMN question_type VARCHAR(50)"
                )
            )
            print("Added question_type column.")

    print("Migration completed successfully.")


if __name__ == "__main__":
    migrate()
