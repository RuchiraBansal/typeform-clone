
from sqlalchemy import inspect, text

from database import engine


def migrate():
    inspector = inspect(engine)

    if "questions" not in inspector.get_table_names():
        raise RuntimeError("The questions table does not exist.")

    columns = {
        column["name"]
        for column in inspector.get_columns("questions")
    }

    if "is_active" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE questions "
                    "ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"
                )
            )
        print("Added is_active column.")
    else:
        print("is_active column already exists.")

    print("Question migration completed.")


if __name__ == "__main__":
    migrate()
