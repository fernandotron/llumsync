import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { authenticateApiRequest } from "@/lib/authGuard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta el ID de usuario" }, { status: 400 });
    }

    const auth = await authenticateApiRequest();
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        clinics: {
          select: { id: true, name: true }
        },
        shifts: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Hide password for safety
    const { password, ...safeUser } = user;

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta el ID de usuario" }, { status: 400 });
    }

    const auth = await authenticateApiRequest();
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const body = await request.json();
    const {
      name,
      lastName,
      email,
      role,
      dniNif,
      phone,
      address,
      municipality,
      postalCode,
      additionalData,
      color,
      showInAgenda,
      permissionsJson,
      password,
      clinicIds,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (lastName !== undefined) updateData.lastName = lastName ? lastName.trim() : null;
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (role !== undefined) updateData.role = role.toUpperCase();
    if (dniNif !== undefined) updateData.dniNif = dniNif ? dniNif.trim() : null;
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (address !== undefined) updateData.address = address ? address.trim() : null;
    if (municipality !== undefined) updateData.municipality = municipality ? municipality.trim() : null;
    if (postalCode !== undefined) updateData.postalCode = postalCode ? postalCode.trim() : null;
    if (additionalData !== undefined) updateData.additionalData = additionalData ? additionalData.trim() : null;
    if (color !== undefined) updateData.color = color;
    if (showInAgenda !== undefined) updateData.showInAgenda = Boolean(showInAgenda);
    if (permissionsJson !== undefined) updateData.permissionsJson = permissionsJson;
    if (password !== undefined && password.trim()) {
      updateData.password = hashPassword(password.trim());
    }

    if (Array.isArray(clinicIds)) {
      updateData.clinics = {
        set: clinicIds.map((cId: string) => ({ id: cId })),
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        clinics: {
          select: { id: true, name: true }
        },
      }
    });

    const { password: _, ...safeUser } = updatedUser;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta el ID de usuario" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    const auth = await authenticateApiRequest(clinicId || undefined);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    // Must be admin or have configuracion permissions
    if (auth.user.role !== "ADMIN" && auth.user.role !== "SUPERADMIN") {
      let canManageUsers = false;
      try {
        const perms = JSON.parse(auth.user.permissionsJson || "{}");
        canManageUsers = Array.isArray(perms.configuracion) && perms.configuracion.includes("Ver configuración");
      } catch {
        canManageUsers = false;
      }
      if (!canManageUsers) {
        return NextResponse.json(
          { error: "No tienes permisos suficientes para eliminar o desvincular empleados." },
          { status: 403 }
        );
      }
    }

    // Safety: prevent deleting yourself
    if (auth.user.id === id) {
      return NextResponse.json(
        { error: "No puedes eliminar o desvincular tu propia cuenta activa." },
        { status: 400 }
      );
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id },
      include: {
        clinics: true,
        _count: {
          select: {
            appointments: true,
            workEntries: true,
            liquidations: true,
          }
        }
      }
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // 1. If a specific clinicId is given, safely disconnect the user from that clinic
    if (clinicId) {
      await prisma.user.update({
        where: { id },
        data: {
          clinics: {
            disconnect: { id: clinicId },
          },
        },
      });

      // Remove shifts and commission configs for this clinic
      await prisma.shift.deleteMany({
        where: { userId: id, clinicId },
      });
      await prisma.userCommissionConfig.deleteMany({
        where: { userId: id, clinicId },
      });
      await prisma.timeBlock.deleteMany({
        where: { userId: id, clinicId },
      });

      // Check if user has any remaining clinics
      const remainingClinics = await prisma.clinic.count({
        where: {
          users: {
            some: { id },
          },
        },
      });

      if (remainingClinics === 0) {
        await prisma.user.update({
          where: { id },
          data: { showInAgenda: false },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Empleado desvinculado de la clínica correctamente.",
      });
    }

    // 2. Global deletion request:
    // If the user has clinical history (appointments, work entries, etc.), deactivate safely
    // to preserve all clinical records and audit logs intact.
    const hasHistory = (userToDelete._count.appointments > 0 || userToDelete._count.workEntries > 0 || userToDelete._count.liquidations > 0);

    if (hasHistory) {
      await prisma.user.update({
        where: { id },
        data: {
          showInAgenda: false,
          clinics: { set: [] }, // disconnect from all clinics
        },
      });

      await prisma.shift.deleteMany({ where: { userId: id } });
      await prisma.timeBlock.deleteMany({ where: { userId: id } });

      return NextResponse.json({
        success: true,
        deactivated: true,
        message: `El usuario ha sido desactivado y desvinculado de todas las consultas. Se preserva íntegramente su historial clínico (${userToDelete._count.appointments} citas asociadas).`,
      });
    }

    // 3. User has no history: full hard delete is safe
    await prisma.shift.deleteMany({ where: { userId: id } });
    await prisma.userCommissionConfig.deleteMany({ where: { userId: id } });
    await prisma.timeBlock.deleteMany({ where: { userId: id } });

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      deleted: true,
      message: "Empleado eliminado permanentemente del sistema.",
    });
  } catch (error) {
    console.error("Error deleting or unlinking user:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
