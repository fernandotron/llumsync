import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Perform a quick database operation to keep the connection warm
    const userCount = await prisma.user.count();
    
    return NextResponse.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: "connected",
      userCount,
    });
  } catch (error: any) {
    console.error("Health check database failure:", error);
    return NextResponse.json({
      status: "ERROR",
      message: error?.message || String(error),
    }, { status: 500 });
  }
}
