
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


async function savePatient(){

    // 👤 current logged user
    const { data: userData } =
        await supabaseClient.auth.getUser();

    const userId = userData.user.id;

    // ✅ required field
    const name = document.getElementById("name").value;

    if(!name){
        alert("Patient name is required");
        return;
    }

    const patient = {

        full_name: name,

        phone:
            document.getElementById("phone").value || null,

        gender:
            document.getElementById("gender").value || null,

        address:
            document.getElementById("address").value || null,

        birth_date:
            document.getElementById("birth").value || null,

        medical_history:
            document.getElementById("medical").value || null,

        dental_history:
            document.getElementById("dental").value || null,

        user_id: userId

    };

    const { data, error } =
        await supabaseClient
        .from("patients")
        .insert([patient])
        .select()
        .single();

    if(error){
        alert(error.message);
        return;
    }

    showToast("Patient added successfully");

    // انتظر نصف ثانية ثم افتح ملف المريض
    setTimeout(() => {

        window.location.href =
            `patient-file.html?id=${data.id}`;

    }, 500);
}

async function loadPatients(){

    // 👤 current logged user
    const { data: userData } =
        await supabaseClient.auth.getUser();

    const userId = userData.user.id;

    // المرضى
    const { data, error } =
        await supabaseClient
        .from("patients")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending:false });

    if(error){

        console.log(error);

        return;
    }

    // 🔥 الخدمات التي عليها باقي
    const { data: services } =
        await supabaseClient
        .from("patientt_services")
        .select("patient_id, remain_amount")
        .eq("user_id", userId);

    const debtPatients = new Set();

    services?.forEach(service => {

        if(Number(service.remain_amount || 0) > 0){

            debtPatients.add(
                service.patient_id
            );
        }
    });

    const tableBody =
        document.querySelector(
            "#patientsTable tbody"
        );

    tableBody.innerHTML = "";

    data.forEach(patient => {

        const hasDebt =
            debtPatients.has(patient.id);

        tableBody.innerHTML += `

        <tr>

            <td
                style="
                color:${hasDebt ? '#ef4444' : 'inherit'};
                font-weight:${hasDebt ? '700' : '400'};
                "
            >
                ${patient.full_name || "-"}
                ${hasDebt ? ' 🔴' : ''}
            </td>

            <td>${patient.phone || "-"}</td>

            <td>${patient.paid_amount || 0}</td>

            <td>${patient.remaining_amount || 0}</td>

        </tr>

        `;
    });
}

loadPatients();

function goToDashboard(){

    window.location.href =
        "dashboard.html";
}


// toast 
function showToast(message){
    const toast = document.getElementById("toast");

    toast.innerText = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}