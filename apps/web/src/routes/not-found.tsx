import { Link } from "react-router";

import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Brand />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That link does not go anywhere. Head back to your boards.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Go to Huddle</Link>
      </Button>
    </div>
  );
}
