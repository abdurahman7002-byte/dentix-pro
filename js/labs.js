async function getUserId() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    // 🔥 لو مفيش يوزر يرجع المستخدم لصفحة اللوجين
    if (!user) {
        window.location.href = "login.html";
        return null;
    }

    return user.id;
}

/* =========================
   SAVE LAB
========================= */

async function saveLab() {

    const userId = await getUserId();

    console.log("USER ID:", userId); // مهم جدًا للتأكد

    if (!userId) {
        alert("User not logged in");
        return;
    }

   const lab_name = document.getElementById("labName").value.trim();

if(!lab_name){
    alert("Lab Name is required");
    return;
}

const specialization =
    document.getElementById("specialization").value.trim() || null;

const address =
    document.getElementById("address").value.trim() || null;

const phone =
    document.getElementById("phone").value.trim() || null;

    const { data, error } = await supabaseClient
        .from("labs")
        .insert([{
            user_id: userId,
            lab_name,
            specialization,
            address,
            phone
        }])
        .select(); // 🔥 مهم جدًا

    console.log("INSERT RESULT:", data, error);

    if (error) {
        alert(error.message);
        return;
    }

    await loadLabs(); // 🔥 انتظر التحميل

}

/* =========================
   LOAD LABS
========================= */

async function loadLabs() {

    const userId = await getUserId();

    console.log("LOAD USER:", userId);

    const { data, error } = await supabaseClient
        .from("labs")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending: false });

    console.log("LABS DATA:", data, error);

    if (error) {
        console.log(error);
        return;
    }

    const container = document.getElementById("labsContainer");

    if (!container) {
        console.log("container not found");
        return;
    }

    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No Labs Found</p>";
        return;
    }

    data.forEach(lab => {

        container.innerHTML += `
        <div class="doctor-card">

            <div>
                <div class="doctor-name">${lab.lab_name}</div>
                <div style="color:#94a3b8;font-size:13px;">
                    ${lab.specialization || "-"} <br>
                    ${lab.phone || "-"}
                </div>
            </div>

            <div>
                <button onclick="openLab(${lab.id})"  style="
                background: linear-gradient(135deg, #6366f1, #06b6d4);
                color: white;
                border: none;
                padding: 10px 14px;
                border-radius: 12px;
                cursor: pointer;
                font-weight: 600;
                font-size: 13px;
                box-shadow: 0 6px 16px rgba(99, 102, 241, 0.25);
                transition: 0.3s;
            "  >Open</button>

            <button onclick="deleteLab(${lab.id})" style="
        background: linear-gradient(135deg, #ef4444, #f97316);
        color: white;
        border: none;
        padding: 10px 14px;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        box-shadow: 0 6px 16px rgba(239, 68, 68, 0.25);
        transition: 0.3s;
    "
    onmouseover="this.style.transform='translateY(-2px) scale(1.05)'"
    onmouseout="this.style.transform='translateY(0) scale(1)'"
    >
        Delete
    </button>
            </div>

        </div>
        `;
    });
}

/* =========================
   OPEN LAB
========================= */

function openLab(id) {

    window.location.href =
        `lab_file.html?id=${id}`;
}

/* =========================
   DELETE LAB
========================= */

async function deleteLab(id) {

    if (!confirm("Delete Lab?"))
        return;

    const { error } = await supabaseClient
        .from("labs")
        .delete()
        .eq("id", id);

    if (error) {

        alert(error.message);

        return;
    }

    loadLabs();
}

/* =========================
   START
========================= */

loadLabs();

function goToDashboard(){
    window.location.href = "dashboard.html";
}