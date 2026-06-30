import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // 1. Check user count
    const count = await prisma.user.count();
    
    // 2. Try creating a test user
    const randomEmail = `test-${Math.floor(Math.random() * 1000000)}@test.com`;
    const testUser = await prisma.user.create({
      data: {
        name: "Test User",
        email: randomEmail,
        password: "test-password",
        role: "ADMIN",
      },
    });

    // 3. Delete the test user to clean up
    await prisma.user.delete({
      where: { id: testUser.id },
    });

    return NextResponse.json({
      status: "success",
      count,
      testUserCreated: testUser.email,
    });
  } catch (error: any) {
    console.error("Db test error:", error);
    return NextResponse.json({
      status: "error",
      message: error?.message || String(error),
      stack: error?.stack || null,
      code: error?.code || null,
    }, { status: 500 });
  }
}
