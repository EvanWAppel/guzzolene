import AddFillUpForm from "@/components/AddFillUpForm";

export default function AddPurchasePage() {
  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-2xl font-semibold">Log a Fill-up</h2>
      <p className="text-muted-foreground text-sm">
        Enter your fill-up details below.
      </p>
      <AddFillUpForm />
    </div>
  );
}
