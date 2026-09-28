// GENERATED from the live Supabase schema (2026-09-28, includes the V1
// additive migration: hints_used, guide_level, path discovery fields) —
// do not hand-edit. Regenerate after any migration. Imported by the engines
// and the UI so no hand-duplicated interface drifts from the real schema.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      courses: {
        Row: {
          created_at: string
          id: string
          path_id: string
          position: number
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          path_id: string
          position?: number
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          path_id?: string
          position?: number
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_attempts: {
        Row: {
          attempted_at: string
          evaluated_at: string | null
          exercise_id: string
          feedback: string | null
          hints_used: number
          id: string
          selected_option_index: number | null
          status: string
          submitted_code: string | null
          user_id: string
        }
        Insert: {
          attempted_at?: string
          evaluated_at?: string | null
          exercise_id: string
          feedback?: string | null
          hints_used?: number
          id?: string
          selected_option_index?: number | null
          status: string
          submitted_code: string | null
          user_id: string
        }
        Update: {
          attempted_at?: string
          evaluated_at?: string | null
          exercise_id: string
          feedback?: string | null
          hints_used?: number
          id?: string
          selected_option_index?: number | null
          status?: string
          submitted_code?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          lesson_id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id: string
          lesson_id: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id: string
          lesson_id: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          created_at: string
          hours: number | null
          id: string
          level: string | null
          outcomes: Json
          prerequisites: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hours?: number | null
          id: string
          level?: string | null
          outcomes?: Json
          prerequisites?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hours?: number | null
          id?: string
          level?: string | null
          outcomes?: Json
          prerequisites?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          module_id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id: string
          module_id: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id: string
          module_id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          position: number
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id: string
          position?: number
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_submissions: {
        Row: {
          id: string
          project_id: string
          review_notes: string | null
          reviewed_at: string | null
          status: string
          submitted_artifact: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          id?: string
          project_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          status: string
          submitted_artifact: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          id?: string
          project_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_artifact?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          brief: string | null
          created_at: string
          guide_level: string
          id: string
          module_id: string
          rubric: Json
          title: string
          updated_at: string
        }
        Insert: {
          brief?: string | null
          created_at?: string
          guide_level?: string
          id: string
          module_id: string
          rubric?: Json
          title?: string
          updated_at?: string
        }
        Update: {
          brief?: string | null
          created_at?: string
          guide_level?: string
          id?: string
          module_id?: string
          rubric?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"]),
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? never
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends keyof (Database["public"]["Tables"] &
  Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof Database["public"]["Tables"],
  TableName extends keyof Database["public"]["Tables"] = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? never
  : TableName extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][TableName]["Insert"]
    : Database["public"]["Tables"][DefaultSchemaTableNameOrOptions]["Insert"]

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof Database["public"]["Tables"],
  TableName extends keyof Database["public"]["Tables"] = never,
> = TableName extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][TableName]["Update"]
  : Database["public"]["Tables"][DefaultSchemaTableNameOrOptions]["Update"]
