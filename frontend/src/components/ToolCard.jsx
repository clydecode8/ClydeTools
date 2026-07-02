import React from "react";

export default function ToolCard({ title, description, icon }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm">
      <div className="mb-3 text-2xl">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
