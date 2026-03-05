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
      students: {
        Row: {
          id: string;
          grade: number;
          class: number;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          grade: number;
          class: number;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          grade?: number;
          class?: number;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      labs: {
        Row: {
          id: string;
          group_type: "LOW" | "HIGH";
          lab_number: number;
          capacity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_type: "LOW" | "HIGH";
          lab_number: number;
          capacity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_type?: "LOW" | "HIGH";
          lab_number?: number;
          capacity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      registrations: {
        Row: {
          id: number;
          student_id: string;
          lab_id: string;
          status: "confirmed" | "waiting" | "cancelled";
          timestamp: string;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          student_id: string;
          lab_id: string;
          status: "confirmed" | "waiting" | "cancelled";
          timestamp?: string;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          student_id?: string;
          lab_id?: string;
          status?: "confirmed" | "waiting" | "cancelled";
          timestamp?: string;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      registration_settings: {
        Row: {
          id: number;
          open_at: string | null;
          close_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          open_at?: string | null;
          close_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          open_at?: string | null;
          close_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      rpc_get_labs_for_group: {
        Args: { p_group_type: string };
        Returns: {
          id: string;
          group_type: "LOW" | "HIGH";
          lab_number: number;
          capacity: number;
          confirmed_count: number;
          waiting_count: number;
        }[];
      };
      rpc_get_my_registration: {
        Args: { p_student_id: string };
        Returns: {
          registration_id: number;
          student_id: string;
          lab_id: string;
          lab_number: number;
          group_type: "LOW" | "HIGH";
          status: "confirmed" | "waiting";
          timestamp: string;
          queue_position: number | null;
        }[];
      };
      rpc_apply_lab: {
        Args: { p_student_id: string; p_lab_id: string };
        Returns: {
          registration_id: number;
          status: "confirmed" | "waiting";
          timestamp: string;
          lab_id: string;
        }[];
      };
      rpc_change_lab: {
        Args: { p_student_id: string; p_new_lab_id: string };
        Returns: {
          old_registration_id: number;
          new_registration_id: number;
          new_lab_id: string;
          new_status: "confirmed" | "waiting";
          new_timestamp: string;
          promoted_count: number;
          promoted_registration_ids: number[];
        }[];
      };
      rpc_cancel_lab: {
        Args: { p_student_id: string };
        Returns: {
          cancelled_registration_id: number;
          cancelled_lab_id: string;
          promoted_count: number;
          promoted_registration_ids: number[];
        }[];
      };
      rpc_promote_waiting: {
        Args: { p_lab_id: string };
        Returns: {
          promoted_count: number;
          promoted_registration_ids: number[];
        }[];
      };
      rpc_admin_get_lab_registrations: {
        Args: Record<string, never>;
        Returns: {
          lab_id: string;
          lab_number: number;
          group_type: string;
          registration_id: number;
          status: string;
          timestamp: string;
          student_id: string;
          grade: number;
          class: number;
          name: string;
        }[];
      };
      rpc_admin_get_students: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          grade: number;
          class: number;
          name: string;
          created_at: string;
          registration_status: string | null;
          lab_number: number | null;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

