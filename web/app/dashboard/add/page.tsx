import PumpPhotoUpload from "@/components/PumpPhotoUpload";

export default function AddPurchasePage() {
  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-2xl font-semibold">Log a Fill-up</h2>
      <p className="text-muted-foreground text-sm">
        Upload a pump photo and Claude will extract the details automatically.
        Review and submit to save.
      </p>
      <PumpPhotoUpload />
    </div>
  );
}
