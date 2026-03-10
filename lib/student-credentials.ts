import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  birthDateToInitialPassword,
  hashPassword,
  normalizeBirthDateInput,
} from "@/lib/password";

type AdminClient = SupabaseClient<Database>;

export interface StudentCredentialInput {
  grade: number;
  classNumber: number;
  name: string;
  birthDate: string;
}

export interface AdminStudentRecord {
  id: string;
  grade: number;
  class: number;
  name: string;
  birth_date: string | null;
  password_hash: string | null;
  created_at: string;
}

function buildInitialPasswordHash(birthDate: string) {
  return hashPassword(birthDateToInitialPassword(birthDate));
}

export async function upsertStudentCredentials(
  supabase: AdminClient,
  input: StudentCredentialInput,
): Promise<AdminStudentRecord> {
  const birthDate = normalizeBirthDateInput(input.birthDate);
  if (!birthDate) {
    throw new Error("BAD_REQUEST");
  }

  const now = new Date().toISOString();
  const existingQuery = await supabase
    .from("students")
    .select("id, grade, class, name, birth_date, password_hash, created_at")
    .eq("grade", input.grade)
    .eq("class", input.classNumber)
    .eq("name", input.name)
    .maybeSingle();

  if (existingQuery.error) {
    throw new Error("INTERNAL_ERROR");
  }

  if (existingQuery.data) {
    const updates: Database["public"]["Tables"]["students"]["Update"] = {
      birth_date: birthDate,
      updated_at: now,
    };

    if (!existingQuery.data.password_hash) {
      updates.password_hash = await buildInitialPasswordHash(birthDate);
      updates.password_updated_at = now;
    }

    const updatedQuery = await supabase
      .from("students")
      .update(updates)
      .eq("id", existingQuery.data.id)
      .select("id, grade, class, name, birth_date, password_hash, created_at")
      .single();

    if (updatedQuery.error || !updatedQuery.data) {
      throw new Error("INTERNAL_ERROR");
    }

    return updatedQuery.data;
  }

  const insertedQuery = await supabase
    .from("students")
    .insert({
      grade: input.grade,
      class: input.classNumber,
      name: input.name,
      birth_date: birthDate,
      password_hash: await buildInitialPasswordHash(birthDate),
      password_updated_at: now,
    })
    .select("id, grade, class, name, birth_date, password_hash, created_at")
    .single();

  if (insertedQuery.error || !insertedQuery.data) {
    throw new Error("INTERNAL_ERROR");
  }

  return insertedQuery.data;
}

export async function resetStudentPasswordToBirthDate(
  supabase: AdminClient,
  studentId: string,
): Promise<void> {
  const studentQuery = await supabase
    .from("students")
    .select("birth_date")
    .eq("id", studentId)
    .maybeSingle();

  if (studentQuery.error) {
    throw new Error("INTERNAL_ERROR");
  }
  if (!studentQuery.data) {
    throw new Error("STUDENT_NOT_FOUND");
  }
  if (!studentQuery.data.birth_date) {
    throw new Error("BIRTH_DATE_NOT_SET");
  }

  const now = new Date().toISOString();
  const resetQuery = await supabase
    .from("students")
    .update({
      password_hash: await buildInitialPasswordHash(studentQuery.data.birth_date),
      password_updated_at: now,
      updated_at: now,
    })
    .eq("id", studentId);

  if (resetQuery.error) {
    throw new Error("INTERNAL_ERROR");
  }
}
