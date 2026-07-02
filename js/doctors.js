// ```javascript
/* =========================
GET USER ID
========================= */

let currentUserId = null;

/* =========================
GET USER ID (SAFE)
========================= */


/* =========================
   AUTH GUARD (IMPORTANT)
========================= */

async function checkAuth(){

    const { data: { user } } =
        await supabaseClient.auth.getUser();

    if(!user){
        // 🚨 غير اسم صفحة تسجيل الدخول لو مختلف عندك
        window.location.href = "login.html";
        return;
    }
}

/* تشغيل الحماية فور فتح الصفحة */
checkAuth();

let editingBillId = null;

/* =========================
GET USER
========================= */

async function getUserId(){

    const { data:{user} } =
        await supabaseClient.auth.getUser();

    if(!user){
        window.location.href = "login.html";
        return null;
    }

    return user.id;
}

/* =========================
SAVE DOCTOR
========================= */

async function saveDoctor() {

    const doctorName = document.getElementById("doctorName").value.trim();

    if (!doctorName) {
        alert("Doctor name required");
        return;
    }

    const userId = await getUserId();
    if (!userId) return;

    const { error } = await supabaseClient
        .from("doctors")
        .insert([{
            user_id: userId,
            doctor_name: doctorName,
            specialization: document.getElementById("doctorSpecialization").value || null,
            age: document.getElementById("doctorAge").value || null,
            phone: document.getElementById("doctorPhone").value || null,
            address: document.getElementById("doctorAddress").value || null,
            created_at: new Date().toISOString()
        }]);

    if (error) {
        alert(error.message);
        return;
    }

    clearDoctorForm();
    loadDoctors();
}

/* =========================
CLEAR FORM
========================= */

function clearDoctorForm() {

    document.getElementById("doctorName").value = "";
    document.getElementById("doctorSpecialization").value = "";
    document.getElementById("doctorAge").value = "";
    document.getElementById("doctorPhone").value = "";
    document.getElementById("doctorAddress").value = "";
}

/* =========================
LOAD DOCTORS
========================= */

async function loadDoctors() {

    const userId = await getUserId();
    if (!userId) return;

    const { data, error } = await supabaseClient
        .from("doctors")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending: false });

    if (error) {
        console.log(error);
        return;
    }

    const container = document.getElementById("doctorsContainer");
    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = "<p style='color:#94a3b8'>No Doctors Found</p>";
        return;
    }

    data.forEach(doctor => {

        container.innerHTML += `

        <div class="doctor-card">

            <div>
                <div class="doctor-name">
                    ${doctor.doctor_name}
                </div>

                <div style="color:#94a3b8;font-size:13px;">
                    ${doctor.specialization || "-"}
                </div>
            </div>

            <div class="actions">

                <button class="open-btn"
                    onclick="openDoctor(${doctor.id})">
                    Open
                </button>

                <button class="delete-btn"
                    onclick="deleteDoctor(${doctor.id})">
                    Delete
                </button>

            </div>

        </div>
        `;
    });
}

/* =========================
OPEN DOCTOR FILE
========================= */

function openDoctor(id) {
    window.location.href = `doctor_file.html?id=${id}`;
}

/* =========================
DELETE DOCTOR
========================= */

async function deleteDoctor(id) {

    if (!confirm("Delete Doctor?")) return;

    const { error } = await supabaseClient
        .from("doctors")
        .delete()
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

    loadDoctors();
}

/* =========================
INIT
========================= */

window.addEventListener("load", loadDoctors);

// زر الصفحة الئيسية 
function goToDashboard() {
    window.location.href = "dashboard.html";
}


// احصائيات 
async function loadDoctorsDashboard() {

    const userId = await getUserId();

    const { data, error } = await supabaseClient
        .from("doctor_works")
        .select("*")
        .eq("user_id", userId);   // 🔥 هنا السر

    if (error) {
        console.log(error);
        return;
    }

    let totalWorks = 0;
    let totalCost = 0;
    let totalProfit = 0;

    const doctorStats = {};

    data.forEach(work => {

        totalWorks++;
        totalCost += Number(work.work_cost || 0);
        totalProfit += Number(work.doctor_profit || 0);

        const id = work.doctor_id;

        if (!doctorStats[id]) {
            doctorStats[id] = { count: 0, profit: 0 };
        }

        doctorStats[id].count++;
        doctorStats[id].profit += Number(work.doctor_profit || 0);
    });

    document.getElementById("totalWorksAll").innerText = totalWorks;
    document.getElementById("totalCostAll").innerText = totalCost.toFixed(2) + " EGP";
    document.getElementById("totalProfitAll").innerText = totalProfit.toFixed(2) + " EGP";
}

window.addEventListener("load", () => {

    loadDoctors();
    loadDoctorsDashboard();

});