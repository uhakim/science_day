type RequiredEnv =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "SESSION_SECRET"
  | "ADMIN_PASSWORD";

function readEnv(name: RequiredEnv): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getEnv() {
  return {
    supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    sessionSecret: readEnv("SESSION_SECRET"),
    adminPassword: readEnv("ADMIN_PASSWORD"),
  };
}
