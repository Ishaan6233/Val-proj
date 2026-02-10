import React from "react";

type Props = {
  petEnabled: boolean;
  petType: "bunny" | "cat";
  setPetEnabled: (v: boolean) => void;
  setPetType: (t: "bunny" | "cat") => void;
};

export default function Settings({
  petEnabled,
  petType,
  setPetEnabled,
  setPetType,
}: Props) {
  return (
    <div className="card">
      <h3>Settings</h3>
      <p className="subtitle">
        Customize the little companion and small preferences.
      </p>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={petEnabled}
            onChange={(e) => setPetEnabled(e.target.checked)}
          />
          <span className="small">Enable pet</span>
        </label>

        <label style={{ marginLeft: 6 }} className="small">
          Pet
          <select
            value={petType}
            onChange={(e) => setPetType(e.target.value as "bunny" | "cat")}
            style={{
              display: "block",
              marginTop: 6,
              padding: 8,
              borderRadius: 6,
            }}
          >
            <option value="bunny">Bunny</option>
            <option value="cat">Cat</option>
          </select>
        </label>
      </div>
      <p className="small" style={{ marginTop: 12 }}>
        Tip: click or touch the pet to make it play. Try disabling if you prefer
        a minimalist view.
      </p>

      <div style={{ marginTop: 10 }}>
        <button
          className="ghost"
          type="button"
          onClick={() => {
            localStorage.removeItem("crimson-unlocked");
            window.location.reload();
          }}
        >
          Reset puzzle
        </button>
      </div>
    </div>
  );
}
