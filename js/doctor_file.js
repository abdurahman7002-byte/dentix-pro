let doctorId = null;

/* =========================
GET DOCTOR ID
========================= */

function getDoctorIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

/* =========================
INIT
========================= */

window.addEventListener("load", async () => {

    doctorId = getDoctorIdFromURL();

    console.log("doctorId:", doctorId);

    if (!doctorId) {
        alert("Doctor ID not found in URL");
        return;
    }

    await loadDoctor();
    await loadWorks();
    await loadDoctorDashboard();
});

/* =========================
LOAD DOCTOR
========================= */

async function loadDoctor() {

    const { data, error } = await supabaseClient
        .from("doctors")
        .select("*")
        .eq("id", doctorId)
        .single();

    if (error) {
        console.log(error);
        return;
    }

    const title = document.getElementById("doctorTitle");
    if (title) title.innerText = data.doctor_name;

    const info = document.getElementById("doctorInfo");

    if (info) {
        info.innerHTML = `
            <h2 style="margin-bottom:10px;color:#4cc9f0;">
                ${data.doctor_name || "-"}
            </h2>

            <p><strong>Specialization:</strong> ${data.specialization || "-"}</p>
            <p><strong>Age:</strong> ${data.age || "-"}</p>
            <p><strong>Phone:</strong> ${data.phone || "-"}</p>
            <p><strong>Address:</strong> ${data.address || "-"}</p>
            <p><strong>Regist. at:</strong> ${new Date(data.created_at).toLocaleString()}</p>
        `;
    }

    /* fill inputs */
    document.getElementById("doctor_name").value = data.doctor_name || "";
    document.getElementById("specialization").value = data.specialization || "";
    document.getElementById("age").value = data.age || "";
    document.getElementById("phone").value = data.phone || "";
    document.getElementById("address").value = data.address || "";
}

/* =========================
UPDATE DOCTOR
========================= */

async function saveDoctorEdit() {

    const { error } = await supabaseClient
        .from("doctors")
        .update({
            doctor_name: document.getElementById("doctor_name").value,
            specialization: document.getElementById("specialization").value,
            age: document.getElementById("age").value,
            phone: document.getElementById("phone").value,
            address: document.getElementById("address").value
        })
        .eq("id", doctorId);

    if (error) {
        alert(error.message);
        return;
    }

    alert("Doctor Updated");
    loadDoctor();
}

/* =========================
DELETE DOCTOR
========================= */

async function deleteDoctor() {

    if (!confirm("Delete Doctor?")) return;

    const { error } = await supabaseClient
        .from("doctors")
        .delete()
        .eq("id", doctorId);

    if (error) {
        alert(error.message);
        return;
    }

    window.location.href = "doctors.html";
}

/* =========================
SAVE WORK
========================= */

async function saveWork() {

    const workName = document.getElementById("work_name").value;
    const patient_name = document.getElementById("patient_name").value || null;
    const cost = Number(document.getElementById("work_cost").value);
    const percent = Number(document.getElementById("doctor_percent").value);

    if (!workName || !cost || !percent) {
        alert("Fill required fields");
        return;
    }

    const profit = (cost * percent) / 100;

    const { error } = await supabaseClient
        .from("doctor_works")
        .insert([{
            doctor_id: doctorId,
            work_name: workName,
            patient_name: patient_name,
            work_cost: cost,
            doctor_percent: percent,
            doctor_profit: profit,
            created_at: new Date().toISOString()
        }]);

    if (error) {
        alert(error.message);
        return;
    }

    document.getElementById("work_name").value = "";
    document.getElementById("patient_name").value = "";
    document.getElementById("work_cost").value = "";
    document.getElementById("doctor_percent").value = "";

    loadWorks();
    loadDoctorDashboard();
}

/* =========================
LOAD WORKS
========================= */

async function loadWorks() {

    if (!doctorId) return;

    const { data, error } = await supabaseClient
        .from("doctor_works")
        .select("*")
        .eq("doctor_id", doctorId)
        .order("id", { ascending: false });

    if (error) {
        console.log(error);
        return;
    }

    const container = document.getElementById("worksContainer");

    if (!container) return;

    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No Works Found</p>";
        return;
    }

    data.forEach(work => {

       container.innerHTML += `
<div class="work-card" id="work-${work.id}">

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h3 style="margin:0; font-size:18px; color:#38bdf8;">
            ${work.work_name}
        </h3>
    </div>

    <div style="display:grid; gap:6px; font-size:14px; color:#cbd5e1;">

        <p style="margin:0;">
            <strong>Patient:</strong> ${work.patient_name || "-"}
        </p>

        <p style="margin:0;">
            <strong>Cost:</strong> ${work.work_cost} EGP
        </p>

        <p style="margin:0;">
            <strong>Percent:</strong> ${work.doctor_percent}%
        </p>

        <p style="margin:0;">
            <strong>Profit:</strong> ${work.doctor_profit} EGP
        </p>

        <p style="margin:0; font-size:12px; opacity:0.7;">
            ${new Date(work.created_at).toLocaleString()}
        </p>

    </div>

    <div style="display:flex; gap:10px; margin-top:12px;">

        <button class="primary-btn"
            style="flex:1;"
            onclick="startEditWork(${work.id}, '${work.work_name}', '${work.patient_name || ""}', ${work.work_cost}, ${work.doctor_percent})">
            Edit
        </button>

        <button class="delete-btn"
            style="flex:1;"
            onclick="deleteWork(${work.id})">
            Delete
        </button>

    </div>

</div>
`;
    });
}
// بدء التعديل
function startEditWork(id, name, patient, cost, percent) {

    const card = document.getElementById(`work-${id}`);

    card.innerHTML = `
        <input id="edit_name_${id}" value="${name}" placeholder="Work Name">
        <input id="edit_patient_${id}" value="${patient}" placeholder="Patient Name">
        <input id="edit_cost_${id}" type="number" value="${cost}" placeholder="Cost">
        <input id="edit_percent_${id}" type="number" value="${percent}" placeholder="Percent">

        <button class="primary-btn"
            onclick="saveEditWork(${id})">
            Save
        </button>

        <button class="delete-btn"
            onclick="loadWorks()">
            Cancel
        </button>
    `;
}
// حفظ التعديل
async function saveEditWork(id) {

    const name = document.getElementById(`edit_name_${id}`).value;
    const patient = document.getElementById(`edit_patient_${id}`).value;
    const cost = Number(document.getElementById(`edit_cost_${id}`).value);
    const percent = Number(document.getElementById(`edit_percent_${id}`).value);

    if (!name || !cost || !percent) {
        alert("Fill required fields");
        return;
    }

    const profit = (cost * percent) / 100;

    const { error } = await supabaseClient
        .from("doctor_works")
        .update({
            work_name: name,
            patient_name: patient,
            work_cost: cost,
            doctor_percent: percent,
            doctor_profit: profit
        })
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

    loadWorks();
    loadDoctorDashboard();
}

/* =========================
DELETE WORK
========================= */

async function deleteWork(id) {

    if (!confirm("Delete Work?")) return;

    const { error } = await supabaseClient
        .from("doctor_works")
        .delete()
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

    loadWorks();
    loadDoctorDashboard();
}

/* =========================
DOCTOR DASHBOARD
========================= */

async function loadDoctorDashboard() {

    if (!doctorId) return;

    const { data, error } = await supabaseClient
        .from("doctor_works")
        .select("*")
        .eq("doctor_id", doctorId);

    if (error) {
        console.log(error);
        return;
    }

    let totalWorks = 0;
    let totalCost = 0;
    let totalProfit = 0;

    data.forEach(work => {

        totalWorks++;
        totalCost += Number(work.work_cost || 0);
        totalProfit += Number(work.doctor_profit || 0);

    });

    const worksEl = document.getElementById("totalWorks");
    const costEl = document.getElementById("totalCost");
    const profitEl = document.getElementById("totalProfit");

    if (worksEl) worksEl.innerText = totalWorks;
    if (costEl) costEl.innerText = totalCost.toFixed(2) + " EGP";
    if (profitEl) profitEl.innerText = totalProfit.toFixed(2) + " EGP";
}


function goToDoctors() {
    window.location.href = "doctors.html";
}

function goToDashboard() {
    window.location.href = "dashboard.html";
}
// زر حذف جميع الاعمال 
async function deleteAllWorks() {

    if (!doctorId) {
        alert("Doctor not found");
        return;
    }

    const confirmDelete = confirm("Are you sure you want to delete ALL works?");
    
    if (!confirmDelete) return;

    const { error } = await supabaseClient
        .from("doctor_works")
        .delete()
        .eq("doctor_id", doctorId);   // 🔥 يحذف كل أعمال هذا الطبيب فقط

    if (error) {
        alert(error.message);
        return;
    }

    alert("All works deleted successfully");

    loadWorks();
    loadDoctorDashboard();
}