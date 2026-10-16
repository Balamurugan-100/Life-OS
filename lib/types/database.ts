export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      learnings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string;
          status: "planned" | "in_progress" | "completed";
          content: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          category?: string;
          status?: "planned" | "in_progress" | "completed";
          content?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          category?: string;
          status?: "planned" | "in_progress" | "completed";
          content?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      finances: {
        Row: {
          id: string;
          user_id: string;
          type: "income" | "expense";
          amount: number;
          currency: string;
          description: string | null;
          category: string;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "income" | "expense";
          amount: number;
          currency?: string;
          description?: string | null;
          category?: string;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "income" | "expense";
          amount?: number;
          currency?: string;
          description?: string | null;
          category?: string;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      diet: {
        Row: {
          id: string;
          user_id: string;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          food_name: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          notes: string | null;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
          food_name: string;
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          notes?: string | null;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
          food_name?: string;
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          notes?: string | null;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
