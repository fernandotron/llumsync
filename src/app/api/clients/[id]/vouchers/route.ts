import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);
    const includeShared = searchParams.get("includeShared") !== "false";

    if (!clientId) {
      return NextResponse.json({ error: "Falta ID de cliente" }, { status: 400 });
    }

    // Fetch own vouchers
    const ownVouchers = await prisma.clientVoucher.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });

    const enrichedOwn = await Promise.all(
      ownVouchers.map(async (cv) => {
        const template = await prisma.voucher.findUnique({
          where: { id: cv.voucherId },
          select: { serviceIds: true },
        });
        return {
          ...cv,
          serviceIds: template?.serviceIds || "",
          isShared: false,
          ownerClientId: clientId,
          ownerClientName: null,
          sharedClientIds: cv.sharedClientIds || "",
        };
      })
    );

    if (!includeShared) {
      return NextResponse.json(enrichedOwn);
    }

    // Fetch vouchers shared with this client (owned by someone else but sharedClientIds contains clientId)
    const sharedVouchers = await prisma.clientVoucher.findMany({
      where: {
        NOT: { clientId },
        sharedClientIds: { contains: clientId },
      },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedShared = await Promise.all(
      sharedVouchers.map(async (cv) => {
        const template = await prisma.voucher.findUnique({
          where: { id: cv.voucherId },
          select: { serviceIds: true },
        });
        return {
          ...cv,
          serviceIds: template?.serviceIds || "",
          isShared: true,
          ownerClientId: cv.clientId,
          ownerClientName: `${cv.client.firstName} ${cv.client.lastName}`,
          sharedClientIds: cv.sharedClientIds || "",
        };
      })
    );

    return NextResponse.json([...enrichedOwn, ...enrichedShared]);
  } catch (error) {
    console.error("Error fetching client vouchers:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await request.json();
    const { voucherId } = body;

    if (!clientId || !voucherId) {
      return NextResponse.json({ error: "Falta ID de cliente o bono" }, { status: 400 });
    }

    // Fetch the voucher template
    const voucherTemplate = await prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucherTemplate) {
      return NextResponse.json({ error: "No se encontró la plantilla de bono" }, { status: 404 });
    }

    // Calculate expiration date if applicable
    let expirationDate: Date | null = null;
    if (voucherTemplate.expirationMonths) {
      const date = new Date();
      date.setMonth(date.getMonth() + voucherTemplate.expirationMonths);
      expirationDate = date;
    }

    const clientVoucher = await prisma.clientVoucher.create({
      data: {
        clientId,
        voucherId,
        name: voucherTemplate.name,
        sessions: voucherTemplate.sessions,
        remainingSessions: voucherTemplate.sessions,
        price: voucherTemplate.price,
        expirationDate,
        sharedClientIds: "",
      },
    });

    return NextResponse.json(clientVoucher);
  } catch (error) {
    console.error("Error associating voucher to client:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await request.json();
    const { clientVoucherId, action } = body;

    if (!clientVoucherId) {
      return NextResponse.json({ error: "Falta ID de bono de cliente" }, { status: 400 });
    }

    const clientVoucher = await prisma.clientVoucher.findUnique({
      where: { id: clientVoucherId },
    });

    if (!clientVoucher) {
      return NextResponse.json({ error: "Bono de cliente no encontrado" }, { status: 404 });
    }

    // Security: Check if client is either the owner or the voucher is shared with them
    const isOwner = clientVoucher.clientId === clientId;
    const isSharedWithClient = (clientVoucher.sharedClientIds || "")
      .split(",")
      .filter(Boolean)
      .includes(clientId);

    let dataToUpdate: any = {};

    if (action === "consume") {
      if (!isOwner && !isSharedWithClient) {
        return NextResponse.json({ error: "No autorizado para consumir este bono" }, { status: 403 });
      }
      let remainingSessions = clientVoucher.remainingSessions;
      if (remainingSessions > 0) {
        dataToUpdate.remainingSessions = remainingSessions - 1;
      } else {
        return NextResponse.json({ error: "No quedan sesiones en este bono" }, { status: 400 });
      }
    } else if (action === "share") {
      // Only the owner can share their voucher
      if (!isOwner) {
        return NextResponse.json({ error: "Solo el propietario puede compartir el bono" }, { status: 403 });
      }
      // Add or remove a client from sharedClientIds
      const { shareClientId, shareAction } = body;
      if (!shareClientId) {
        return NextResponse.json({ error: "Falta shareClientId" }, { status: 400 });
      }
      const currentShared = (clientVoucher.sharedClientIds || "")
        .split(",")
        .filter(Boolean);

      if (shareAction === "add") {
        if (!currentShared.includes(shareClientId)) {
          currentShared.push(shareClientId);
        }
      } else if (shareAction === "remove") {
        const idx = currentShared.indexOf(shareClientId);
        if (idx !== -1) currentShared.splice(idx, 1);
      }
      dataToUpdate.sharedClientIds = currentShared.join(",");
    } else {
      if (body.name !== undefined) dataToUpdate.name = body.name;
      if (body.sessions !== undefined) dataToUpdate.sessions = parseInt(body.sessions, 10);
      if (body.remainingSessions !== undefined)
        dataToUpdate.remainingSessions = parseInt(body.remainingSessions, 10);
      if (body.price !== undefined) dataToUpdate.price = parseFloat(body.price);
      if (body.expirationDate !== undefined) {
        dataToUpdate.expirationDate = body.expirationDate ? new Date(body.expirationDate) : null;
      }
      if (body.sharedClientIds !== undefined) {
        dataToUpdate.sharedClientIds = body.sharedClientIds;
      }
    }

    const updated = await prisma.clientVoucher.update({
      where: { id: clientVoucherId },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating client voucher:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);
    const clientVoucherId = searchParams.get("clientVoucherId");

    if (!clientVoucherId) {
      return NextResponse.json({ error: "Falta ID de bono de cliente" }, { status: 400 });
    }

    await prisma.clientVoucher.delete({
      where: { id: clientVoucherId },
    });

    return NextResponse.json({ success: true, deletedId: clientVoucherId });
  } catch (error) {
    console.error("Error deleting client voucher:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
