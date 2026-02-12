import { WeekPlanner } from "@/components/week-planner";

export default function HomePage() {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Wochenplan</h2>
      <WeekPlanner />
    </div>
  );
}
