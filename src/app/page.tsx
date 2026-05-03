"use client";

import { useState } from "react";
import { LoadingScreen } from "@/widgets/loading-screen/ui/LoadingScreen";
import { RoomCanvas } from "@/widgets/canvas/ui/RoomCanvas";
import { Button } from "@/shared/ui/button/Button";
import { useProjectStore } from "@/shared/store/useProjectStore";

export default function Home() {
  const [started, setStarted] = useState(false);

  const createProject = useProjectStore((s) => s.createProject);
  const activeProject = useProjectStore((s) => s.activeProject);

  if (!started) {
    return <LoadingScreen onStart={() => setStarted(true)} />;
  }

  return (
    <div className="h-screen w-full bg-gray-500 relative flex items-center justify-center">

      {/* WORKSPACE BACKGROUND */}
      <div className="w-[1920px] h-[1080px] bg-white relative overflow-hidden">

        <RoomCanvas />

        {/* TOP UI */}
        <div className="absolute top-4 left-4 flex gap-2 items-center z-10">

          <Button
            text="Create Project"
            onClick={() => createProject("New Project")}
          />

          {activeProject && (
            <span className="text-sm text-gray-700">
              Active: {activeProject.name}
            </span>
          )}

        </div>

      </div>

    </div>
  );
}