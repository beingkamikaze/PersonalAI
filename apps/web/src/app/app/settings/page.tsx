import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <ScreenIntro
      title="Settings"
      description="Profile, username, CTAs, unpublish, and delete."
    >
      <form className="space-y-5">
        <Field label="Display name" name="displayName" />
        <Field label="Username" name="username" />
        <Field label="Contact link" name="contactUrl" />
        <Field label="Booking link" name="bookingUrl" />
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="button">Save</Button>
          <Button type="button" variant="secondary">
            Unpublish
          </Button>
          <Button type="button" variant="ghost">
            Delete AI
          </Button>
        </div>
      </form>
      <ScaffoldNote>
        Destructive actions confirm in UI; call unpublish/delete API when ready.
      </ScaffoldNote>
    </ScreenIntro>
  );
}

function Field({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={name}
        name={name}
        className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
      />
    </div>
  );
}
