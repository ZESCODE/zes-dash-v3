import { useEffect, useState } from "react";
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
import PortsMap from "@/routes/PortsMap";
import Traffic from "@/routes/Traffic";
import Services from "@/routes/Services";
import Settings from "@/routes/Settings";

export default function App() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const { data: overview, error: overviewRequestError } = useFetch<OverviewData & { error?: string }>("/api/overview", 5000);

  const total = overview?.agents?.total ?? 0;
  const online = overview?.agents?.online ?? 0;
  const errors = overview?.errors ?? 0;
  const connected = !!overview && !overview.error && !overviewRequestError;

  useEffect(() => {
    if (!leftOpen && !rightOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [leftOpen, rightOpen]);

  const openLeft = () => {
    setRightOpen(false);
    setLeftOpen(true);
  };
  const openRight = () => {
    setLeftOpen(false);
    setRightOpen(true);
  };
  return (
    <div className="relative min-h-screen min-h-[100dvh] overflow-x-clip text-white">
      <TopBar
        onLeft={openLeft}
        onRight={openRight}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        online={online}
        total={total}
        errors={errors}
        connection={!overview ? overviewRequestError ? "offline" : "loading" : connected ? errors > 0 || online < total ? "attention" : "connected" : "offline"}
      />

      <Sidebar open={leftOpen} onClose={() => setLeftOpen(false)} />
      <RightDrawer open={rightOpen} onClose={() => setRightOpen(false)} />

      <main className="relative z-10 mx-auto w-full max-w-[1800px] px-3 pb-20 pt-4 sm:px-5 sm:pt-6 md:ml-64 md:w-[calc(100%-16rem)] md:px-6 xl:px-8">
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
          <Route path="/ports" element={<PortsMap />} />
          <Route path="/traffic" element={<Traffic />} />
          <Route path="/services" element={<Services />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Overview />} />
        </Routes>
      </main>

      <footer className="relative z-10 border-t border-frost-blue/8 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-center text-[10px] text-white/25 md:ml-64">
        ZES Mesh Console <span className="px-1 text-white/15">·</span> Frost runtime <span className="px-1 text-white/15">·</span> local Termux node
      </footer>
    </div>
  );
}
