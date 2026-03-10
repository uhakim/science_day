const defaultMessage: Record<string, string> = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  STUDENT_NOT_FOUND: "등록된 학생 정보를 찾을 수 없습니다. 담당 선생님께 문의하세요.",
  INVALID_CREDENTIALS: "학년, 반, 이름 또는 비밀번호를 다시 확인하세요.",
  REGISTRATION_CLOSED: "현재 신청 가능한 시간이 아닙니다.",
  LAB_NOT_FOUND: "Lab 정보를 찾을 수 없습니다.",
  NEW_LAB_NOT_FOUND: "변경할 Lab 정보를 찾을 수 없습니다.",
  NO_ACTIVE_REGISTRATION: "활성 신청 정보가 없습니다.",
  ALREADY_HAS_ACTIVE_REGISTRATION: "이미 신청한 Lab이 있습니다.",
  GRADE_GROUP_MISMATCH: "학년에 맞지 않는 Lab입니다.",
  SAME_LAB_CHANGE_NOT_ALLOWED: "같은 Lab으로는 변경할 수 없습니다.",
  CURRENT_PASSWORD_MISMATCH: "현재 비밀번호가 올바르지 않습니다.",
  PASSWORD_TOO_SHORT: "비밀번호는 4자 이상이어야 합니다.",
  PASSWORD_TOO_LONG: "비밀번호는 128자 이하여야 합니다.",
  BIRTH_DATE_NOT_SET: "생년월일이 등록되지 않은 학생입니다.",
  BAD_REQUEST: "요청 데이터가 올바르지 않습니다.",
  INTERNAL_ERROR: "서버 처리 중 오류가 발생했습니다.",
};

export function resolveErrorMessage(code: string): string {
  return defaultMessage[code] ?? "요청 처리 중 오류가 발생했습니다.";
}

export function extractErrorCode(rawMessage?: string): string {
  if (!rawMessage) {
    return "INTERNAL_ERROR";
  }
  const code = rawMessage.trim().toUpperCase();
  if (/^[A-Z_]+$/.test(code)) {
    return code;
  }
  return "INTERNAL_ERROR";
}
