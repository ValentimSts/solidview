import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StorageEntry {
  slot: string;
  offset: number;
  type: string;
  label: string;
}

interface StorageLayoutProps {
  entries: StorageEntry[];
}

export function StorageLayout({ entries }: StorageLayoutProps) {
  if (entries.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          Storage layout visualization is coming soon.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Storage Layout</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Slot</th>
                <th className="pb-2 pr-4 font-medium">Offset</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 font-medium">Variable</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono">{entry.slot}</td>
                  <td className="py-2 pr-4 font-mono">{entry.offset}</td>
                  <td className="py-2 pr-4 font-mono">{entry.type}</td>
                  <td className="py-2 font-mono">{entry.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
