import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateProjectNo } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get("year");
  const month = req.nextUrl.searchParams.get("month");
  const status = req.nextUrl.searchParams.get("status");
  const customerId = req.nextUrl.searchParams.get("customerId");
  const search = req.nextUrl.searchParams.get("search");
  const translatorId = req.nextUrl.searchParams.get("translatorId");
  const coordinatorId = req.nextUrl.searchParams.get("coordinatorId");
  const sourceLanguage = req.nextUrl.searchParams.get("sourceLanguage");

  const where: Record<string, unknown> = {};
  if (year) where.year = parseInt(year);
  if (month) where.month = parseInt(month);
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (translatorId) where.translatorId = translatorId;
  if (coordinatorId) where.coordinatorId = coordinatorId;
  if (sourceLanguage) where.sourceLanguage = sourceLanguage;

  // Arama: proje numarası veya müşteri adı/şirketi
  if (search) {
    where.OR = [
      { projectNo: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { customer: { company: { contains: search, mode: "insensitive" } } },
    ];
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      coordinator: true,
      translator: true,
      outputs: true,
      tags: { include: { tag: true } },
    },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Proje numarası oluştur
  const count = await prisma.project.count({
    where: { year: body.year, month: body.month },
  });
  const projectNo = generateProjectNo(body.year, body.month, count + 1);

  const project = await prisma.project.create({
    data: {
      projectNo,
      year: body.year,
      month: body.month,
      customerId: body.customerId,
      sourceLanguage: body.sourceLanguage,
      targetLanguage: body.targetLanguage,
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
      coordinatorId: body.coordinatorId || null,
      translatorId: body.translatorId || null,
      notes: body.notes || null,
      sourceFiles: body.sourceFiles?.length
        ? {
            create: body.sourceFiles.map(
              (f: { fileName: string; driveLink: string; fileType: string; filePath?: string }) => ({
                fileName: f.fileName,
                driveLink: f.driveLink || null,
                filePath: f.filePath || null,
                fileType: f.fileType || "pdf",
              })
            ),
          }
        : undefined,
    },
    include: {
      customer: true,
      coordinator: true,
      translator: true,
      sourceFiles: true,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
