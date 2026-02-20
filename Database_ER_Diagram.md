# Database Connections Diagram

This diagram represents the database schema and relationships based on the Supabase queries used in the frontend application.

```mermaid
erDiagram
    profiles ||--o{ quizzes : "creates"
    profiles ||--o{ modules : "creates"
    profiles ||--o{ attempts : "makes"
    profiles ||--o{ quiz_results : "achieves"
    profiles ||--o{ user_practice : "has"

    modules ||--o{ quizzes : "contains"
    
    quizzes ||--o{ questions : "contains"
    quizzes ||--o{ attempts : "tracks"
    quizzes ||--o{ quiz_results : "records"

    %% Table Definitions based on application usage
    
    profiles {
        uuid id PK
        string name
        string role
        timestamp created_at
    }

    modules {
        uuid id PK
        string title
        string category
        string image_url
        uuid created_by FK "references profiles(id)"
        timestamp created_at
    }

    quizzes {
        uuid id PK
        string title
        string type
        uuid module_id FK "references modules(id), nullable"
        uuid created_by FK "references profiles(id)"
        string status
        string image_url
        jsonb settings
        timestamp created_at
    }

    questions {
        uuid id PK
        uuid quiz_id FK "references quizzes(id)"
        string text
        string type
        jsonb choices "options for mcq/msq"
        jsonb correct_answer "can be string, array, or range object"
        string image_url
    }

    attempts {
        uuid id PK
        uuid quiz_id FK "references quizzes(id)"
        uuid student_id FK "references profiles(id)"
        jsonb answers
        string status "in-progress, completed"
        int score
        timestamp updated_at
        timestamp completed_at
    }

    quiz_results {
        uuid id PK
        uuid quiz_id FK "references quizzes(id)"
        uuid student_id FK "references profiles(id)"
        int score
        int total_questions
        float percentage
        timestamp created_at
    }

    user_practice {
        uuid id PK
        uuid user_id FK "references profiles(id)"
        timestamp created_at
    }
```

### Relationship Breakdown:
- **`profiles`** acts as the central User table (acting as Students, Faculty, or Admins).
- **`modules`** are top-level containers for courses or subject areas, created by Faculty/Admins.
- **`quizzes`** can either belong to a specific `module` (via `module_id`) or be standalone (e.g. Master tests). They contain many `questions`.
- **`questions`** are the individual test items belonging to a particular `quiz`.
- **`attempts`** track a student's ongoing or completed test attempt, storing the draft `answers`. It connects a `profile` (student) to a `quiz`.
- **`quiz_results`** store the final grade and percentage of a completed test.
- **`user_practice`** tracks specific practice sessions or module unlocks for a `profile`.
