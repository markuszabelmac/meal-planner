import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { AuthSessionProvider } from "@/components/session-provider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AuthSessionProvider>
      <div className="flex min-h-screen flex-col">
        <NavBar userName={session.user.name || "User"} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-20 pt-6">
          {children}
        </main>
      </div>
    </AuthSessionProvider>
  );
}
