import { Separator } from "@/components/ui/separator";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-5 w-96 rounded bg-muted" />
        <div className="h-4 w-80 rounded bg-muted" />
        <div className="h-4 w-48 rounded bg-muted" />
      </div>
      <Separator className="my-6" />
      <div className="flex gap-4 animate-pulse">
        <div className="h-10 w-24 rounded bg-muted" />
        <div className="h-10 w-24 rounded bg-muted" />
        <div className="h-10 w-24 rounded bg-muted" />
        <div className="h-10 w-24 rounded bg-muted" />
      </div>
      <div className="mt-6 space-y-4 animate-pulse">
        <div className="h-32 rounded bg-muted" />
        <div className="h-32 rounded bg-muted" />
        <div className="h-32 rounded bg-muted" />
      </div>
    </div>
  );
}
