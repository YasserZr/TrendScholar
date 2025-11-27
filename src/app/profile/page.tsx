import { Header, Footer } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile | TrendScholar",
  description: "Manage your TrendScholar profile",
};

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Profile Sidebar */}
          <div className="md:col-span-1">
            <div className="rounded-lg border border-border/40 bg-card p-6 text-center">
              {/* Avatar Placeholder */}
              <div className="mx-auto w-24 h-24 rounded-full bg-muted mb-4 flex items-center justify-center">
                <span className="text-2xl text-muted-foreground">👤</span>
              </div>
              <h2 className="text-xl font-semibold">User Name</h2>
              <p className="text-sm text-muted-foreground">user@example.com</p>
              <button className="mt-4 w-full rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">
                Edit Profile
              </button>
            </div>
          </div>

          {/* Profile Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Account Settings */}
            <div className="rounded-lg border border-border/40 bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your display name"
                    className="w-full rounded-md border border-border/40 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full rounded-md border border-border/40 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Research Interests */}
            <div className="rounded-lg border border-border/40 bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Research Interests</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Select your research interests to personalize your feed.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "AI/ML",
                  "NLP",
                  "Computer Vision",
                  "Data Science",
                  "Neuroscience",
                ].map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full border border-border/40 px-3 py-1 text-sm"
                  >
                    {interest}
                  </span>
                ))}
                <button className="rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted-foreground hover:border-foreground transition-colors">
                  + Add More
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
