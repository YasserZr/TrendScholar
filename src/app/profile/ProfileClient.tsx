"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UserCircleIcon,
  EnvelopeIcon,
  BellIcon,
  ChartBarIcon,
  CogIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import type { UserPreferences, UsageLimits, ProfileUser, AvailableTopic } from "@/types/profile";

interface ProfileClientProps {
  user: ProfileUser;
  usage: UsageLimits;
  availableTopics: AvailableTopic[];
  followedTopicIds: string[];
}

export function ProfileClient({
  user,
  usage,
  availableTopics,
  followedTopicIds,
}: ProfileClientProps) {
  // Form state
  const [name, setName] = useState(user.name || "");
  const [imageUrl, setImageUrl] = useState(user.image || "");
  const [digestFrequency, setDigestFrequency] = useState<"daily" | "weekly" | "never">(
    user.preferences?.digestFrequency || "weekly"
  );
  const [digestEnabled, setDigestEnabled] = useState(
    user.preferences?.digestEnabled ?? true
  );
  const [emailNotifications, setEmailNotifications] = useState(
    user.preferences?.emailNotifications ?? true
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>(followedTopicIds);

  const [saving, setSaving] = useState(false);

  // Format usage display
  const formatLimit = (used: number, limit: number) => {
    if (limit === -1) return `${used} / Unlimited`;
    return `${used} / ${limit}`;
  };

  // Calculate progress percentage
  const getProgressPercent = (used: number, limit: number) => {
    if (limit === -1) return 10; // Show small bar for unlimited
    return Math.min((used / limit) * 100, 100);
  };

  // Get progress bar color
  const getProgressColor = (used: number, limit: number) => {
    if (limit === -1) return "bg-green-500";
    const percent = (used / limit) * 100;
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-yellow-500";
    return "bg-blue-500";
  };

  // Toggle topic selection
  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  // Save profile changes
  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || null,
          image: imageUrl || null,
          preferences: {
            digestFrequency,
            digestEnabled,
            emailNotifications,
            preferredTopics: selectedTopics,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Format join date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Profile Sidebar */}
      <div className="lg:col-span-1 space-y-6">
        {/* Avatar Card */}
        <Card>
          <CardContent className="pt-6 text-center">
            {/* Avatar */}
            <div className="mx-auto w-24 h-24 rounded-full bg-muted mb-4 flex items-center justify-center overflow-hidden">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={name || "User"}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              ) : (
                <UserCircleIcon className="w-16 h-16 text-muted-foreground" />
              )}
            </div>
            <h2 className="text-xl font-semibold">{name || "Anonymous User"}</h2>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <EnvelopeIcon className="w-4 h-4" />
              {user.email}
            </p>
            <div className="mt-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  user.plan === "PLUS"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                    : user.plan === "PRO"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                {user.plan} Plan
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Member since {formatDate(user.createdAt)}
            </p>
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-blue-500" />
              Usage & Limits
            </CardTitle>
            <CardDescription>Your current plan usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Daily Summaries */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Daily Summaries</span>
                <span className="text-muted-foreground">
                  {formatLimit(usage.summariesToday, usage.summariesLimit)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(
                    usage.summariesToday,
                    usage.summariesLimit
                  )} transition-all`}
                  style={{
                    width: `${getProgressPercent(
                      usage.summariesToday,
                      usage.summariesLimit
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Saved Papers */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Saved Papers</span>
                <span className="text-muted-foreground">
                  {formatLimit(usage.savedPapers, usage.savedPapersLimit)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(
                    usage.savedPapers,
                    usage.savedPapersLimit
                  )} transition-all`}
                  style={{
                    width: `${getProgressPercent(
                      usage.savedPapers,
                      usage.savedPapersLimit
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Topics Followed */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Topics Followed</span>
                <span className="text-muted-foreground">
                  {formatLimit(usage.topicsFollowed, usage.topicsLimit)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(
                    usage.topicsFollowed,
                    usage.topicsLimit
                  )} transition-all`}
                  style={{
                    width: `${getProgressPercent(
                      usage.topicsFollowed,
                      usage.topicsLimit
                    )}%`,
                  }}
                />
              </div>
            </div>

            {user.plan === "FREE" && (
              <div className="pt-2">
                <Button asChild className="w-full" size="sm">
                  <Link href="/billing">Upgrade for More</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profile Form */}
      <div className="lg:col-span-2 space-y-6">
        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CogIcon className="h-5 w-5" />
              Account Settings
            </CardTitle>
            <CardDescription>
              Update your display name and profile picture
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Display Name
              </label>
              <Input
                type="text"
                placeholder="Your display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Profile Image URL
              </label>
              <Input
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a URL to your profile picture (e.g., from Gravatar)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <Input
                type="email"
                value={user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed. Contact support if you need to update it.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellIcon className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Control how and when you receive updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Notifications Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive important updates via email
                </p>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  emailNotifications ? "bg-blue-500" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    emailNotifications ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            {/* Digest Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Digest</p>
                <p className="text-sm text-muted-foreground">
                  Get a summary of new papers in your topics
                </p>
              </div>
              <button
                onClick={() => setDigestEnabled(!digestEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  digestEnabled ? "bg-blue-500" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    digestEnabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            {/* Digest Frequency */}
            {digestEnabled && (
              <div>
                <p className="font-medium mb-2">Digest Frequency</p>
                <div className="flex gap-2">
                  {(["daily", "weekly", "never"] as const).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setDigestFrequency(freq)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        digestFrequency === freq
                          ? "bg-blue-500 text-white"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {user.plan === "FREE"
                    ? "Upgrade to Pro for weekly digests, or Plus for daily digests."
                    : user.plan === "PRO"
                    ? "Pro plan includes weekly digests. Upgrade to Plus for daily."
                    : "Plus plan includes priority daily digests."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Research Interests */}
        <Card>
          <CardHeader>
            <CardTitle>Research Interests</CardTitle>
            <CardDescription>
              Select topics to personalize your feed (
              {usage.topicsLimit === -1
                ? "unlimited"
                : `max ${usage.topicsLimit}`}
              )
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableTopics.map((topic) => {
                  const isSelected = selectedTopics.includes(topic.id);
                  const atLimit =
                    usage.topicsLimit !== -1 &&
                    selectedTopics.length >= usage.topicsLimit &&
                    !isSelected;

                  return (
                    <button
                      key={topic.id}
                      onClick={() => !atLimit && toggleTopic(topic.id)}
                      disabled={atLimit}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                        isSelected
                          ? "bg-blue-500 text-white"
                          : atLimit
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {isSelected && <CheckCircleIcon className="w-4 h-4" />}
                      {topic.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No topics available. Topics will appear here once papers are collected.
              </p>
            )}

            {usage.topicsLimit !== -1 &&
              selectedTopics.length >= usage.topicsLimit && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                  You&apos;ve reached your topic limit.{" "}
                  <Link href="/billing" className="underline">
                    Upgrade your plan
                  </Link>{" "}
                  to follow more topics.
                </p>
              )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
