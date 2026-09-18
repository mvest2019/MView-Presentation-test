import { NextResponse } from "next/server";
import { selftest } from "@/app/mineralownersite/_lib/reference/sample";
import { sampleFixture } from "@/app/mineralownersite/_lib/reference/owner-data";
export const dynamic = "force-dynamic";
export function GET() { return NextResponse.json(selftest(sampleFixture())); }
