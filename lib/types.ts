export type GroupType = "LOW" | "HIGH";
export type RegistrationStatus = "confirmed" | "waiting" | "cancelled";

export interface StudentSession {
  studentId: string;
  grade: number;
  classNumber: number;
  name: string;
  groupType: GroupType;
  iat: number;
  exp: number;
}

export interface LabSummary {
  id: string;
  groupType: GroupType;
  labNumber: number;
  capacity: number;
  confirmedCount: number;
  waitingCount: number;
}

export interface RegistrationSummary {
  registrationId: number;
  studentId: string;
  labId: string;
  labNumber: number;
  groupType: GroupType;
  status: RegistrationStatus;
  timestamp: string;
  queuePosition: number | null;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
  };
}

