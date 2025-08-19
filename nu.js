// ==================== Supabase Setup ====================
const SUPABASE_URL = "https://xdoywikuwbetilopggfx.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhkb3l3aWt1d2JldGlsb3BnZ2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODIwNzIsImV4cCI6MjA3MDY1ODA3Mn0.U03NLLoBuD5oYoO0JSAgu0hk2_H1x_pr2ot5BPcug7g";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== Handle Search ====================
document.getElementById("routeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const city = document.getElementById("city").value;
  const current = document.getElementById("current").value.trim();
  const destination = document.getElementById("destination").value.trim();
  const resultDiv = document.getElementById("result");

  if (!city || !current || !destination) {
    resultDiv.innerHTML = "<p style='color:red'>Please fill in all fields.</p>";
    return;
  }

  // case-insensitive match for origin/destination
  const { data: routes, error } = await supabaseClient
    .from("routes")
    .select("*")
    .eq("city", city)
    .ilike("origin", current) // ILIKE = case-insensitive
    .ilike("destination", destination)
    .eq("verified", true);

  if (error) {
    console.error(error);
    resultDiv.innerHTML = "<p style='color:red'>Error fetching routes.</p>";
    return;
  }

  if (!routes || routes.length === 0) {
    resultDiv.innerHTML = `<p>No verified route found for ${city} from ${current} to ${destination}.</p>`;
    return;
  }

  const r = routes[0];
  const stepsHtml = (r.steps || [])
    .map(
      (s) =>
        `<li>Take a <strong>${s.mode}</strong> from ${s.from} to ${s.to}. <em>(₦${s.price})</em></li>`
    )
    .join("");

  resultDiv.innerHTML = `
    <h3>Route Found!</h3>
    <ul class="summary">
      <li><strong>From:</strong> ${r.origin}</li>
      <li><strong>To:</strong> ${r.destination}</li>
      <li><strong>Total Estimated Price:</strong> ₦${r.total_price}</li>
      <li><strong>Total Estimated Time:</strong> ${r.estimated_time}</li>
    </ul>
    <h3>Steps to your destination:</h3>
    <ol>${stepsHtml}</ol>
  `;
});

// ==================== Modal + Steps UI ====================
const modal = document.getElementById("addRouteModal");
const stepsContainer = document.getElementById("stepsContainer");
const addStepBtn = document.getElementById("addStepBtn");

document.getElementById("addRouteBtn").addEventListener("click", () => {
  modal.style.display = "flex";
  // ensure at least one step row exists when opening
  if (!stepsContainer.querySelector(".step-item")) addStepRow();
});

document.getElementById("closeModal").addEventListener("click", () => {
  modal.style.display = "none";
});

// Close modal when clicking the backdrop
window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
});

addStepBtn.addEventListener("click", () => addStepRow());

function addStepRow(prefill = {}) {
  const row = document.createElement("div");
  row.className = "step-item";
  row.style.marginBottom = "10px";
  row.innerHTML = `
    <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap">
      <select class="step-mode" required>
        <option value="">Transport Mode</option>
        <option value="bus">Bus</option>
        <option value="keke">Keke</option>
        <option value="walk">Walk</option>
      </select>
      <input type="text" class="step-from" placeholder="From" required />
      <input type="text" class="step-to" placeholder="To" required />
      <input type="number" class="step-price" placeholder="Price" min="0" required />
      <button type="button" class="removeStepBtn" title="Remove">✕</button>
    </div>
  `;
  row.querySelector(".step-mode").value = prefill.mode || "";
  row.querySelector(".step-from").value = prefill.from || "";
  row.querySelector(".step-to").value = prefill.to || "";
  row.querySelector(".step-price").value = prefill.price ?? "";

  row.querySelector(".removeStepBtn").onclick = () => row.remove();
  stepsContainer.appendChild(row);
}

function collectSteps() {
  const items = [...stepsContainer.querySelectorAll(".step-item")];
  return items
    .map((item) => {
      const mode = item.querySelector(".step-mode").value.trim();
      const from = item.querySelector(".step-from").value.trim();
      const to = item.querySelector(".step-to").value.trim();
      const price = Number(item.querySelector(".step-price").value);
      return { mode, from, to, price };
    })
    .filter((s) => s.mode && s.from && s.to && !isNaN(s.price));
}

// ==================== Handle Add Route ====================
document
  .getElementById("addRouteForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const city = document.getElementById("addCity").value.trim();
    const origin = document.getElementById("addOrigin").value.trim();
    const destination = document.getElementById("addDestination").value.trim();
    const total_price = Number(document.getElementById("addTotalPrice").value);
    const estimated_time = document.getElementById("addTime").value.trim();
    const steps = collectSteps();

    if (
      !city ||
      !origin ||
      !destination ||
      !estimated_time ||
      isNaN(total_price)
    ) {
      alert("Please fill all fields correctly.");
      return;
    }
    if (steps.length === 0) {
      alert("Add at least one step.");
      return;
    }

    const { error } = await supabaseClient.from("routes").insert([
      {
        city,
        origin,
        destination,
        steps,
        total_price,
        estimated_time,
        verified: false,
      },
    ]);

    if (error) {
      console.error("Insert error:", error);
      alert("Error adding route. Check console for details.");
      return;
    }

    alert("Route submitted for review!");
    document.getElementById("addRouteForm").reset();
    stepsContainer.innerHTML = ""; // clear previous step rows
    modal.style.display = "none";
  });
