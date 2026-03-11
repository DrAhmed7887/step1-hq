import { useState } from "react";
import { useResources } from "../lib/resources";

function SectionTitle({ eyebrow, title, body }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-mist">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-bold text-white">{title}</h2>
      {body && <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>}
    </div>
  );
}

export default function ResourcesPage() {
  const { resources, activeCount, addResource, updateResource, removeResource } = useResources();
  const [overrideActive, setOverrideActive] = useState(false);

  const [draft, setDraft] = useState({
    title: "",
    type: "book",
    phase: "Core",
    sourceProvenance: "official_api",
    ownershipStatus: "subscription_active",
    status: "active",
    notes: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    addResource({
      ...draft,
      verifiedBy: "Owner",
      lastChecked: new Date().toISOString()
    });
    setDraft({ ...draft, title: "", notes: "" });
  };

  const PROVENANCE_LABELS = {
    offline_file: "Offline File",
    official_api: "Official API / Sub",
    public_index: "Public / Shared Index",
    manual_user_entry: "Manual Entry"
  };

  const OWNERSHIP_LABELS = {
    owned_offline: "Owned Offline",
    subscription_active: "Active Sub",
    public: "Public Domain",
    unowned: "Not Owned / Expired"
  };

  return (
    <div className="space-y-6">
      {/* Strict Intervention Overlay */}
      {activeCount > 3 && !overrideActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="panel p-8 max-w-md w-full text-center space-y-6 border-coral/40 shadow-2xl shadow-coral/10 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral/10">
              <span className="text-3xl text-coral">✋</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">System Constraint Exceeded</h2>
              <p className="text-mist leading-relaxed text-sm">
                You have <strong className="text-white text-base">{activeCount}</strong> active resources. The protocol restricts you to exactly 3 simultaneous resources to prevent hoarding and burnout.
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <button 
                onClick={() => setOverrideActive(true)} 
                className="w-full py-4 rounded-xl bg-coral text-ink font-bold text-base hover:bg-coral/90 transition shadow-lg shadow-coral/20"
              >
                Pause a resource now
              </button>
              <button 
                onClick={() => setOverrideActive(true)} 
                className="w-full py-4 rounded-xl bg-transparent text-slate-400 font-semibold text-sm border border-line hover:bg-white/5 hover:text-white transition"
              >
                Override intentionally
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,350px]">
        <div className="space-y-6">
          <section className="panel p-5 sm:p-6">
            <SectionTitle
              eyebrow="Inventory"
              title="Active Curriculum"
              body="Strictly limit active resources to prevent hoarding and context switching."
            />
            
            <div className="mt-6 flex gap-4 text-sm">
               <div className="panel-soft flex-1 p-4 border border-teal/20">
                 <p className="text-mist uppercase tracking-widest text-xs">Active Resources</p>
                 <p className={`mt-2 text-3xl font-bold ${activeCount > 3 ? "text-coral" : "text-teal"}`}>
                   {activeCount} <span className="text-sm font-normal text-mist">/ 3 max recommended</span>
                 </p>
               </div>
            </div>

            <div className="mt-8 space-y-4">
              {resources.length === 0 ? (
                <div className="text-mist italic text-sm">No resources added.</div>
              ) : (
                resources.map(r => (
                  <div key={r.id} className="panel-soft p-4 border border-white/5 relative flex justify-between gap-4 group">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`w-2 h-2 rounded-full ${r.status === 'active' ? 'bg-teal' : r.status === 'parked' ? 'bg-amber' : 'bg-slate-500'}`} />
                        <h3 className="font-bold text-white text-lg">{r.title}</h3>
                        <span className="px-2 py-0.5 rounded bg-white/10 text-xs text-mist border border-white/10">{r.phase}</span>
                      </div>
                      <p className="text-sm text-slate-300 mb-3">{r.notes}</p>
                      <div className="flex gap-4 text-xs">
                        <span className="text-mist"><span className="uppercase text-slate-500 mr-1">Origin</span> {PROVENANCE_LABELS[r.sourceProvenance]}</span>
                        <span className="text-mist"><span className="uppercase text-slate-500 mr-1">Status</span> {OWNERSHIP_LABELS[r.ownershipStatus]}</span>
                        <span className="text-mist"><span className="uppercase text-slate-500 mr-1">Verified</span> {new Date(r.lastChecked).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <select 
                        className="field py-1 h-auto text-xs" 
                        value={r.status}
                        onChange={(e) => updateResource(r.id, { status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="parked">Parked</option>
                        <option value="finished">Finished</option>
                      </select>
                      <button onClick={() => removeResource(r.id)} className="text-xs text-coral hover:underline text-right mt-auto">Remove</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="panel-soft p-5 sm:p-6 h-min">
          <SectionTitle
             eyebrow="Provisioning"
             title="Log Resource"
          />
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs uppercase text-mist mb-1">Title</label>
              <input 
                 className="field w-full" 
                 value={draft.title} 
                 onChange={e => setDraft({...draft, title: e.target.value})} 
                 placeholder="e.g. Sketchy Micro" 
                 required 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase text-mist mb-1">Type</label>
                <select className="field w-full" value={draft.type} onChange={e => setDraft({...draft, type: e.target.value})}>
                  <option value="qbank">QBank</option>
                  <option value="book">Book</option>
                  <option value="video">Video</option>
                  <option value="anki">Anki</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase text-mist mb-1">Phase</label>
                <select className="field w-full" value={draft.phase} onChange={e => setDraft({...draft, phase: e.target.value})}>
                  <option value="Core">Core</option>
                  <option value="Secondary">Secondary</option>
                  <option value="Tertiary">Tertiary</option>
                </select>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/5 space-y-4">
              <div>
                <label className="block text-xs uppercase text-mist mb-1">Provenance</label>
                <select className="field w-full" value={draft.sourceProvenance} onChange={e => setDraft({...draft, sourceProvenance: e.target.value})}>
                  {Object.entries(PROVENANCE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase text-mist mb-1">Ownership / Sub</label>
                <select className="field w-full" value={draft.ownershipStatus} onChange={e => setDraft({...draft, ownershipStatus: e.target.value})}>
                  {Object.entries(OWNERSHIP_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase text-mist mb-1">Curriculum Notes</label>
              <textarea 
                 className="field w-full min-h-20" 
                 value={draft.notes} 
                 onChange={e => setDraft({...draft, notes: e.target.value})} 
                 placeholder="How does this specifically help Step 1?"
              />
            </div>
            <button type="submit" className="button-primary w-full mt-2">Add to Engine</button>
          </form>
        </section>
      </div>
    </div>
  );
}
