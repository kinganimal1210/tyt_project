import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function FeedCard({
  title, intro, skills,
}: { title: string; intro: string; skills: string[] }) {
  return (
    <Card className="hover:shadow-md transition">
      <CardHeader className="text-lg font-semibold">{title}</CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{intro}</p>
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => <Badge key={s}>{s}</Badge>)}
        </div>
      </CardContent>
    </Card>
  );
}