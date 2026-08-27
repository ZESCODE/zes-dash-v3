import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightDrawer } from "@/components/layout/RightDrawer";
import { useFetch } from "@/hooks/useFetch";
import type { OverviewData } from "@/lib/types";

import Overview from "@/routes/Overview";
import Agents from "@/routes/Agents";
import Flow from "@/routes/Flow";
import EventStream from "@/routes/EventStream";
import SystemHealth from "@/routes/SystemHealth";
import Memory from "@/routes/Memory";
import Fleet from "@/routes/Fleet";
import Tasks from "@/routes/Tasks";
import Activity from "@/routes/Activity";
import Infrastructure from "@/routes/Infrastructure";
import Settings from "@/routes/Settings";

export default function App() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const { data: overview } = useFetch<OverviewData & { error?: string }>("/api/overview", 5000);

  const total = overview?.agents?.total ?? 0;
  const online = overview?.agents?.online ?? 0;
  const errors = overview?.errors ?? 0;

  return (
    <div className="relative min-h-screen text-white">
      <TopBar
        onLeft={() => setLeftOpen(true)}
        onRight={() => setRightOpen(true)}
        online={online}
        total={total}
        errors={errors}
      />

      <Sidebar open={leftOpen} onClose={() => setLeftOpen(false)} />
      <RightDrawer open={rightOpen} onClose={() => setRightOpen(false)} />

      <main className="relative z-10 mx-auto max-w-7xl px-3 pb-24 pt-4 sm:px-5 sm:pt-6 md:ml-60">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/flow" element={<Flow />} />
          <Route path="/events" element={<EventStream />} />
          <Route path="/health" element={<SystemHealth />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/infra" element={<Infrastructure />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Overview />} />
        </Routes>
      </main>

      <footer className="relative z-10 border-t border-frost-blue/8 py-4 text-center text-[11px] text-white/30 md:ml-60">
        ZES OS Dashboard v3 · Frost design system · Termux node
      </footer>
    </div>
  );
}
