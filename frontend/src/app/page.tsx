"use client";
import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function HelloCard() {
  return (
    <Card className="max-w-sm mx-auto mt-10 p-4">
      <CardHeader className="text-xl font-bold">🚀 Hello tmatch!</CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600">Next.js + Tailwind + shadcn/ui 세팅 확인</p>
        <Button onClick={() => alert("버튼 클릭 성공!")}>클릭 테스트</Button>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <HelloCard />
    </main>
  ); // hello
}