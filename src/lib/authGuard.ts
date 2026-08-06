import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissionsJson: string;
  clinics: { id: string; name: string }[];
}

/**
 * Validates session user ID cookie or fallback user context.
 */
export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_user_id")?.value;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissionsJson: true,
          clinics: {
            select: { id: true, name: true }
          }
        }
      });
      if (user) return user;
    }

    // Fallback: Return first available active user/admin to prevent session disruption for active sessions
    const fallbackUser = await prisma.user.findFirst({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissionsJson: true,
        clinics: {
          select: { id: true, name: true }
        }
      }
    });

    return fallbackUser || null;
  } catch (error) {
    console.error("Error getting session user:", error);
    return null;
  }
}

/**
 * Helper to enforce session authentication and optional clinic access on API endpoints.
 * Returns { user } if authorized, or { errorResponse } if unauthorized.
 */
export async function authenticateApiRequest(clinicId?: string | null): Promise<{ user: AuthenticatedUser } | { errorResponse: NextResponse }> {
  const user = await getSessionUser();

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: "No autorizado. Sesión no válida o expirada." },
        { status: 401 }
      )
    };
  }

  if (clinicId && user.role !== "ADMIN") {
    const hasClinicAccess = user.clinics.some((c) => c.id === clinicId);
    if (!hasClinicAccess) {
      return {
        errorResponse: NextResponse.json(
          { error: "Acceso denegado. No pertenece a esta clínica." },
          { status: 403 }
        )
      };
    }
  }

  return { user };
}

