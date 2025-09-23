// src/components/app/HelloCard.tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function HelloCard() {
  return (
    <Card className="max-w-sm mx-auto mt-10 p-4">
      <CardHeader className="text-xl font-bold">
        🚀 Hello tmatch!
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600">Next.js + Tailwind + shadcn/ui 세팅 완료!</p>
        <Button onClick={() => alert("버튼 클릭 성공!")}>
          클릭 테스트
        </Button>
      </CardContent>
    </Card>
  );
}