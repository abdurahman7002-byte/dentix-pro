let currentUserId = null;

async function initUser(){
    const { data } = await supabaseClient.auth.getUser();
    currentUserId = data.user.id;
}

document.addEventListener("DOMContentLoaded", async () => {

    const { data } =
        await supabaseClient.auth.getSession();

    if (!data.session) {

        window.location.replace("login.html");

        return;
    }

    loadPatients();

    loadAppointments();
});

/* =========================
   PREVENT BACK AFTER LOGOUT
========================= */



/* =========================
   AUTH STATE
========================= */



/* =========================
   GLOBAL
========================= */

let allPatients = [];
let patientsWithDebt = {};

/* =========================
   LOAD PATIENTS
========================= */

async function loadPatients(){

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

    // الخدمات لمعرفة الباقي
    const { data: services } =
        await supabaseClient
        .from("patientt_services")
        .select("patient_id, remain_amount")
        .eq("user_id", userId);

    patientsWithDebt = {};

    services?.forEach(service => {

        const remain =
            Number(service.remain_amount || 0);

        if(remain > 0){

            if(!patientsWithDebt[service.patient_id]){
                patientsWithDebt[service.patient_id] = 0;
            }

            patientsWithDebt[service.patient_id] += remain;
        }
    });

    allPatients = data;

    renderTable(allPatients);

    document.getElementById("totalPatients")
        .innerText = data.length;
}

/* =========================
   RENDER TABLE
========================= */

function renderTable(patients){

    const tbody =
        document.querySelector(
            "#patientsTable tbody"
        );

    tbody.innerHTML = "";

    patients.forEach(p => {

        const debtAmount =
            patientsWithDebt[p.id] || 0;

        const hasDebt =
            debtAmount > 0;

        tbody.innerHTML += `

        <tr>

            <td
                style="
                color:${hasDebt ? '#ef4444' : 'inherit'};
                font-weight:${hasDebt ? '700' : '400'};
                "
            >

                ${p.full_name || "-"}

                ${hasDebt ? `
                <span style="
                    background:linear-gradient(135deg,#ef4444,#dc2626);
                    color:white;
                    padding:4px 10px;
                    border-radius:999px;
                    font-size:11px;
                    font-weight:700;
                    margin-right:8px;
                    display:inline-block;
                ">
                    💰 باقي ${debtAmount} EGP
                </span>
                ` : ''}

            </td>

            <td>
                ${p.birth_date
                    ? calculateAge(p.birth_date) + " years"
                    : "-"
                }
            </td>

            <td>

                <a
                    href="patient-file.html?id=${p.id}"
                    class="open-file-btn"
                >

                    <i class="fa-solid fa-folder-open"></i>

                    Open File

                </a>

            </td>

        </tr>

        `;
    });
}

/* =========================
   SEARCH
========================= */

function searchPatients(){

    const value =
        document.getElementById("searchInput")
        .value
        .toLowerCase();

    const filtered =
        allPatients.filter(p =>

            (p.full_name || "")
            .toLowerCase()
            .includes(value)

            ||

            (p.phone || "")
            .toLowerCase()
            .includes(value)

            ||

            (p.address || "")
            .toLowerCase()
            .includes(value)
        );

    renderTable(filtered);
}

loadPatients();

/* =========================
   NAVIGATION
========================= */

function openAddPatient(){

    window.location.href =
        "patients.html";
}

/* =========================
   LOAD APPOINTMENTS
========================= */

async function loadAppointments() {

await deleteOldAppointments();

    const { data: userData } =
        await supabaseClient.auth.getUser();

    const userId = userData.user.id;

    const { data, error } =
        await supabaseClient
            .from("patient_visits")
            .select(`
                *,
                patients(id,full_name, phone)
            `)
            .eq("user_id", userId)
            .not("next_appointment", "is", null)
            .order("next_appointment", { ascending: true })
            .limit(10);

    if (error) {
        console.log(error);
        return;
    }

    const container =
        document.getElementById("appointmentsContainer");

    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="no-appointments">
                <i class="fa-solid fa-calendar-xmark"></i>
                <br><br>
                No upcoming appointments
            </div>
        `;
        return;
    }

    const now = new Date();

    /* أقرب موعد مستقبلي */
    const nearestFuture = data
        .filter(v => new Date(v.next_appointment) > now)
        .sort((a, b) =>
            new Date(a.next_appointment) - new Date(b.next_appointment)
        )[0]?.id;

    data.forEach((v) => {

        if (!v.next_appointment) return;

        const appointmentTime = new Date(v.next_appointment);

        const diffHours =
            (now - appointmentTime) / (1000 * 60 * 60);

        /* =========================
           DELETE AFTER 3 HOURS
        ========================= */
        if (diffHours >= 3) {

            supabaseClient
                .from("patient_visits")
                .delete()
                .eq("id", v.id);

            return;
        }

        /* =========================
           STATUS (NOW / UPCOMING)
        ========================= */

        let statusHTML = "";

        if (appointmentTime <= now && diffHours < 3) {
            statusHTML = `
                <div class="appointment-badge now-badge">
                    Now Visit
                </div>
            `;
        }
        else if (v.id === nearestFuture) {
            statusHTML = `
                <div class="appointment-badge upcoming-badge">
                    Upcoming Visit
                </div>
            `;
        }

        let statusText = "✓ قادم";
let statusColor =
    "linear-gradient(135deg,#3b82f6,#2563eb)";

if(v.visit_status === "وصول المريض"){
    statusText = "📌 متواجد";
    statusColor =
        "linear-gradient(135deg,#10b981,#059669)";
}

if(v.visit_status === "متأخر جدا"){
    statusText = "⏰ متأخر ";
    statusColor =
        "linear-gradient(135deg,#ef4444,#dc2626)";
}

        container.innerHTML += `
            <div class="appointment-card" id="appointment-${v.id}">

                ${statusHTML}

                <div class="appointment-content">

                    <div class="appointment-info">

                        <div class="appointment-name">
                            <i class="fa-solid fa-user-clock"></i>
                            ${v.patients?.full_name || "Unknown"}
                        </div>

                        <div class="appointment-phone">
                            <i class="fa-solid fa-phone"></i>
                            ${v.patients?.phone || "No Phone"}
                        </div>

                        <div class="appointment-date">
                            <i class="fa-solid fa-calendar-days"></i>
                            ${appointmentTime.toLocaleString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            })}
                        </div>

                    </div>

                    

                    <div class="appointment-actions">

<button
    onclick="toggleVisitStatus(
        ${v.id},
        '${v.visit_status || "قادم"}'
    )"
    style="
         width:auto;
    display:inline-flex;
    margin-left:auto;
        border:none;
        border-radius:16px;
        padding:14px 18px;
        font-size:14px;
        font-weight:800;
        letter-spacing:.3px;
        color:white;
        cursor:pointer;
        margin-bottom:10px;

        background:${statusColor};

        box-shadow:
            0 10px 25px rgba(0,0,0,.25),
            inset 0 1px 1px rgba(255,255,255,.15);

        transition:.25s ease;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:8px;
    "

    onmouseover="
        this.style.transform='translateY(-3px) scale(1.02)';
        this.style.boxShadow='0 18px 35px rgba(0,0,0,.35)';
    "

    onmouseout="
        this.style.transform='translateY(0) scale(1)';
        this.style.boxShadow='0 10px 25px rgba(0,0,0,.25), inset 0 1px 1px rgba(255,255,255,.15)';
    "
>
    ${statusText}
</button>
                    
                        <a 
                            href="patient-file.html?id=${v.patients?.id}"
                            class="open-file-btn"
                        >
                            <i class="fa-solid fa-folder-open"></i>
                            Patient File
                        </a>

                        <button 
                            onclick="deleteAppointment(${v.id})"
                            class="delete-appointment-btn"
                        >
                            <i class="fa-solid fa-trash"></i>
                            Delete Appointment
                        </button>

                    </div>

                </div>
            </div>
        `;
    });
}


async function toggleVisitStatus(id, currentStatus){

    let newStatus = "قادم";

    if(currentStatus === "قادم"){
        newStatus = "وصول المريض";
    }
    else if(currentStatus === "وصول المريض"){
        newStatus = "متأخر جدا";
    }
    else{
        newStatus = "قادم";
    }

    const { error } = await supabaseClient
        .from("patient_visits")
        .update({
            visit_status: newStatus
        })
        .eq("id", id);

    if(error){
        alert(error.message);
        return;
    }

    loadAppointments();
}


// الحذف التلقائي بعد ثلاث ساعات 

async function deleteOldAppointments() {

    const { data: userData } =
        await supabaseClient.auth.getUser();

    const userId = userData?.user?.id;

    if (!userId) return;

    const now = new Date();

    const { data, error } = await supabaseClient
        .from("patient_visits")
        .select("id, next_appointment")
        .eq("user_id", userId)
        .not("next_appointment", "is", null);

    if (error) {
        console.log("Fetch error:", error);
        return;
    }

    for (const v of data) {

        const appointmentTime = new Date(v.next_appointment);

        const diffHours =
            (now - appointmentTime) / (1000 * 60 * 60);

        if (diffHours >= 3) {

            await supabaseClient
                .from("patient_visits")
                .delete()
                .eq("id", v.id);
        }
    }
}

/* =========================
   DELETE APPOINTMENT (REAL DELETE + LIVE REMOVE)
========================= */

async function deleteAppointment(visitId){

    const confirmDelete = confirm(
        "Delete this appointment?"
    );

    if(!confirmDelete) return;

    const { error } =
        await supabaseClient
        .from("patient_visits")
        .delete()
        .eq("id", visitId);

    if(error){
        alert(error.message);
        return;
    }

    showToast("appointment deleted successfully");

    // ✔️ حذف مباشر من الصفحة بدون reload
    const el = document.getElementById(`appointment-${visitId}`);
    if (el) {
        el.remove();
    }
}

function goToMyPage(){
    window.location.href = "pricing.html";
}

function goToAnalytics(){
    document.getElementById("analyticsSection")
        .scrollIntoView({ behavior: "smooth" });
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

// patienta button 
function goToPatients(){

    document
        .getElementById("patientsSection")
        .scrollIntoView({

            behavior:"smooth"

        });
}


async function loadCurrentMonthDashboard(){

    const currentUserId = await getUserId();

    if(!currentUserId){
        console.log("No user");
        return;
    }

    const { data, error } = await supabaseClient
        .from("patientt_services")
        .select("*")
        .eq("user_id", currentUserId);

    if(error){
        console.log(error);
        return;
    }

    /* =========================
       FIXED DATE RANGE (UTC SAFE)
    ========================= */

    const now = new Date();

    const startOfMonth = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1, 0, 0, 0
    ));

    const startOfNextMonth = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1, 0, 0, 0
    ));

    let total = 0;
    let paid = 0;
    let remaining = 0;
    let servicesCount = 0;

    let labCost = 0;
    let billsCost = 0;

    /* =========================
       SERVICES
    ========================= */

    data.forEach(item => {

        if(!item.created_at) return;

        const date = new Date(item.created_at);

        if(date >= startOfMonth && date < startOfNextMonth){

            total += Number(item.total_amount || 0);
            paid += Number(item.paid_amount || 0);
            remaining += Number(item.remain_amount || 0);

            servicesCount++;
        }
    });

    /* =========================
       PATIENTS
    ========================= */

    const { data: patientsData, error: patientsError } =
        await supabaseClient
            .from("patients")
            .select("id")
            .eq("user_id", currentUserId)
            .gte("created_at", startOfMonth.toISOString())
            .lt("created_at", startOfNextMonth.toISOString());

    if(patientsError){
        console.log(patientsError);
    }

    const patientsCount = patientsData?.length || 0;

    /* =========================
       LAB COST
    ========================= */

    const { data: labWorks } =
        await supabaseClient
        .from("lab_works")
        .select("lab_cost, created_at")
        .eq("user_id", currentUserId);

    labWorks?.forEach(item => {

        if(!item.created_at) return;

        const d = new Date(item.created_at);

        if(d >= startOfMonth && d < startOfNextMonth){
            labCost += Number(item.lab_cost || 0);
        }
    });

    /* =========================
       BILLS
    ========================= */

    const { data: bills } =
        await supabaseClient
        .from("bills")
        .select("amount, created_at")
        .eq("user_id", currentUserId);

    bills?.forEach(item => {

        if(!item.created_at) return;

        const d = new Date(item.created_at);

        if(d >= startOfMonth && d < startOfNextMonth){
            billsCost += Number(item.amount || 0);
        }
    });

    /* =========================
       NET PROFIT
    ========================= */

    const netProfit = paid - labCost - billsCost;

    /* =========================
       UI
    ========================= */

    document.getElementById("monthTotal").innerText =
        total.toFixed(2) + " EGP";

    document.getElementById("monthPaid").innerText =
        paid.toFixed(2) + " EGP";

    document.getElementById("monthRemaining").innerText =
        remaining.toFixed(2) + " EGP";

    document.getElementById("monthPatients").innerText =
        servicesCount;

    const patientsEl = document.getElementById("monthUniquePatients");
    if(patientsEl){
        patientsEl.innerText = patientsCount;
    }

    const profitEl = document.getElementById("monthProfit");
    if(profitEl){
        profitEl.innerText = netProfit.toFixed(2) + " EGP";
    }
}

/* =========================
START
========================= */

loadCurrentMonthDashboard();

/* AUTO REFRESH */
setInterval(loadCurrentMonthDashboard, 5000);

/* =========================
LOAD FINANCIAL DASHBOARD
========================= */
async function loadFinancialDashboard(){

    const userId = await getUserId();

    if(!userId){
        console.log("User ID not found");
        return;
    }

    /* =========================
       PATIENT SERVICES
    ========================= */

    const { data, error } = await supabaseClient
        .from("patientt_services")
        .select("*")
        .eq("user_id", userId);

    if(error){
        console.log(error);
        return;
    }

    let total = 0;
    let paid = 0;
    let remaining = 0;

    data.forEach(item => {

        total += Number(item.total_amount || 0);
        paid += Number(item.paid_amount || 0);
        remaining += Number(item.remain_amount || 0);

    });

    document.getElementById("dashboardTotal").innerText =
        total.toFixed(2) + " EGP";

    document.getElementById("dashboardPaid").innerText =
        paid.toFixed(2) + " EGP";

    document.getElementById("dashboardRemaining").innerText =
        remaining.toFixed(2) + " EGP";

    /* =========================
       NET PROFIT (LAST 6 MONTHS)
    ========================= */

    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 6);

    const from = fromDate.toISOString();
    const to = new Date().toISOString();

    // Lab Cost
    const { data: labWorks } = await supabaseClient
        .from("lab_works")
        .select("lab_cost")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lte("created_at", to);

    let labTotal = 0;

    labWorks?.forEach(item=>{
        labTotal += Number(item.lab_cost || 0);
    });

    // Bills
    const { data: bills } = await supabaseClient
        .from("bills")
        .select("amount")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lte("created_at", to);

    let billsTotal = 0;

    bills?.forEach(item=>{
        billsTotal += Number(item.amount || 0);
    });

    // Paid Services (last 6 months)
    const { data: servicesPaid } = await supabaseClient
        .from("patientt_services")
        .select("paid_amount")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lte("created_at", to);

    let paidLast6Months = 0;

    servicesPaid?.forEach(item=>{
        paidLast6Months += Number(item.paid_amount || 0);
    });

    const netProfit =
        paidLast6Months - labTotal - billsTotal;

    const netProfitElement =
        document.getElementById("dashboardNetProfit");

    if(netProfitElement){

        netProfitElement.innerText =
            netProfit.toFixed(2) + " EGP";

    }

}

/* START */

loadFinancialDashboard();

/* AUTO REFRESH */

setInterval(loadFinancialDashboard,5000);


async function loadDailyDashboard(){

    const currentUserId = await getUserId();

    if(!currentUserId){
        console.log("No user");
        return;
    }

    /* =========================
       UTC SAFE DAY RANGE
    ========================= */

    const now = new Date();

    const todayStart = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0
    ));

    const tomorrowStart = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0
    ));

    const from = todayStart.toISOString();
    const to = tomorrowStart.toISOString();

    /* =========================
       SERVICES TODAY
    ========================= */

    const { data: services } = await supabaseClient
        .from("patientt_services")
        .select("total_amount, paid_amount, created_at")
        .eq("user_id", currentUserId)
        .gte("created_at", from)
        .lt("created_at", to);

    let total = 0;
    let paid = 0;
    let servicesCount = 0;

    services?.forEach(item=>{
        total += Number(item.total_amount || 0);
        paid += Number(item.paid_amount || 0);
        servicesCount++;
    });

    const remain = total - paid;

    /* =========================
       LAB COST TODAY
    ========================= */

    let labCost = 0;

    const { data: labWorks } = await supabaseClient
        .from("lab_works")
        .select("lab_cost, created_at")
        .eq("user_id", currentUserId)
        .gte("created_at", from)
        .lt("created_at", to);

    labWorks?.forEach(item => {
        labCost += Number(item.lab_cost || 0);
    });

    /* =========================
       PATIENTS TODAY
    ========================= */

    const { data: patients } = await supabaseClient
        .from("patients")
        .select("id")
        .eq("user_id", currentUserId)
        .gte("created_at", from)
        .lt("created_at", to);

    /* =========================
       PROFIT TODAY
    ========================= */

    const profit = paid - labCost;

    /* =========================
       UI
    ========================= */

    document.getElementById("dailyTotal").innerText =
        total.toFixed(2) + " EGP";

    document.getElementById("dailyPaid").innerText =
        paid.toFixed(2) + " EGP";

    document.getElementById("dailyRemain").innerText =
        remain.toFixed(2) + " EGP";

    document.getElementById("dailyServices").innerText =
        servicesCount;

    document.getElementById("dailyPatients").innerText =
        patients?.length || 0;

    document.getElementById("dailyProfit").innerText =
        profit.toFixed(2) + " EGP";
}

/* =========================
   START
========================= */

window.addEventListener("load", ()=>{
    loadDailyDashboard();
});

// custom chart 

async function loadCustomStats(){

    const userId = await getUserId();

    const from =
        document.getElementById("statsFrom").value;

    const to =
        document.getElementById("statsTo").value;

    if(!from || !to){
        alert("اختر التاريخ");
        return;
    }


    // =========================
    // SERVICES
    // =========================

    const { data: services, error } = await supabaseClient
    .from("patientt_services")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", from)
    .lte("created_at", to + "T23:59:59");

    if(error){
        alert(error.message);
        return;
    }

    let total = 0;
    let paid = 0;

    services.forEach(service => {

        total += Number(service.total_amount || 0);
        paid += Number(service.paid_amount || 0);

    });

    const remain = total - paid;

    // =========================
// NET PROFIT (LAST 6 MONTHS ONLY)
// =========================

let netProfit = null;

const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

const selectedFrom = new Date(from);

if (selectedFrom >= sixMonthsAgo) {

    // Lab Cost
    const { data: labWorks } = await supabaseClient
        .from("lab_works")
        .select("lab_cost")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lte("created_at", to + "T23:59:59");

    let labTotal = 0;

    labWorks?.forEach(item=>{
        labTotal += Number(item.lab_cost || 0);
    });

    // Bills
    const { data: bills } = await supabaseClient
        .from("bills")
        .select("amount")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lte("created_at", to + "T23:59:59");

    let billsTotal = 0;

    bills?.forEach(item=>{
        billsTotal += Number(item.amount || 0);
    });

    netProfit = paid - labTotal - billsTotal;
}


    // =========================
    // PATIENTS
    // =========================

    const { data: patients } = await supabaseClient
    .from("patients")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", from)
    .lte("created_at", to + "T23:59:59");

    // =========================
    // UI
    // =========================

    document.getElementById("customTotal")
    .innerText = total + " EGP";

    document.getElementById("customPaid")
    .innerText = paid + " EGP";

    document.getElementById("customRemain")
    .innerText = remain + " EGP";

    document.getElementById("customServices")
    .innerText = services.length;

    document.getElementById("customPatients")
    .innerText = patients.length;

    document.getElementById("customNetProfit").innerText =
    netProfit === null
        ? "Only available for last 6 months"
        : netProfit.toFixed(2) + " EGP";
}


// رسم بياني ومقارنة

let monthlyChart;


/* =========================
MONTHLY CHART
========================= */

/* =========================
MONTHLY CHART
========================= */

async function loadMonthlyComparison(){

    const userId = await getUserId();

    const now = new Date();

    let labels = [];
    let totals = [];
    let paids = [];
    let profits = [];

    // آخر 6 شهور

    for(let i = 5; i >= 0; i--){

        const year = now.getUTCFullYear();
        const month = now.getUTCMonth() - i;

        const start = new Date(Date.UTC(
            year,
            month,
            1,
            0,0,0
        ));

        const end = new Date(Date.UTC(
            year,
            month + 1,
            0,
            23,59,59
        ));

        const monthName =
            start.toLocaleString("en-US", {
                month: "short"
            });

        labels.push(monthName);

        /* =========================
           SERVICES
        ========================= */

        const { data: services, error } =
            await supabaseClient
            .from("patientt_services")
            .select("*")
            .eq("user_id", userId)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString());

        if(error){
            console.log(error);

            totals.push(0);
            paids.push(0);
            profits.push(0);

            continue;
        }

        let total = 0;
        let paid = 0;

        services?.forEach(item => {

            total += Number(item.total_amount || 0);

            paid += Number(item.paid_amount || 0);

        });

        /* =========================
           LAB COST
        ========================= */

        const { data: labWorks } =
            await supabaseClient
            .from("lab_works")
            .select("lab_cost")
            .eq("user_id", userId)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString());

        let labCost = 0;

        labWorks?.forEach(item => {

            labCost += Number(item.lab_cost || 0);

        });

        /* =========================
           BILLS
        ========================= */

        const { data: bills } =
            await supabaseClient
            .from("bills")
            .select("amount")
            .eq("user_id", userId)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString());

        let billsCost = 0;

        bills?.forEach(item => {

            billsCost += Number(item.amount || 0);

        });

        /* =========================
           NET PROFIT
        ========================= */

        const netProfit =
            paid - labCost - billsCost;

        totals.push(total);
        paids.push(paid);
        profits.push(netProfit);
    }

    /* =========================
       DESTROY OLD CHART
    ========================= */

    if(monthlyChart){
        monthlyChart.destroy();
    }

    /* =========================
       CREATE CHART
    ========================= */

    const ctx =
        document.getElementById("monthlyChart");

    monthlyChart = new Chart(ctx, {

        type:"bar",

        data:{

            labels:labels,

            datasets:[

                {
                    label:"المستحق",
                    data:totals,
                    backgroundColor:"#4cc9f0",
                    borderRadius:10
                },

                {
                    label:"Paid",
                    data:paids,
                    backgroundColor:"#80ffdb",
                    borderRadius:10
                },

                {
                    label:"Net Profit",
                    data:profits,
                    backgroundColor:"#22c55e",
                    borderRadius:10
                }

            ]
        },

        options:{

            responsive:true,

            plugins:{

                legend:{
                    labels:{
                        color:"white"
                    }
                }
            },

            scales:{

                x:{
                    ticks:{
                        color:"#cbd5e1"
                    },
                    grid:{
                        color:"rgba(255,255,255,.05)"
                    }
                },

                y:{
                    ticks:{
                        color:"#cbd5e1"
                    },
                    grid:{
                        color:"rgba(255,255,255,.05)"
                    }
                }
            }
        }
    });
}

/* =========================
START
========================= */

window.addEventListener("load", ()=>{

    loadMonthlyComparison();

});


async function loadTopService(){

    const userId = await getUserId();

    const { data, error } = await supabaseClient
    .from("patientt_services")
    .select("service_name")
    .eq("user_id", userId);

    if(error){
        console.log(error);
        return;
    }

    let counter = {};

    data.forEach(item=>{

        const name = item.service_name || "Unknown";

        counter[name] = (counter[name] || 0) + 1;
    });

    let topName = "---";
    let topCount = 0;

    for(let service in counter){
        if(counter[service] > topCount){
            topName = service;
            topCount = counter[service];
        }
    }

    document.getElementById("topServiceName").innerText = topName;
    document.getElementById("topServiceCount").innerText = topCount + " Times";
}




let servicesChart;

/* =========================
LOAD SERVICES ANALYTICS
========================= */

async function loadServicesAnalytics(){

    const userId = await getUserId();

    /* =========================
       DATE FILTER
    ========================= */

    const fromInput = document.getElementById("analyticsFrom")?.value;
    const toInput = document.getElementById("analyticsTo")?.value;

    let query = supabaseClient
        .from("patientt_services")
        .select("*")
        .eq("user_id", userId);

if(fromInput){

        const fromDate = new Date(fromInput);

        const fromUTC = new Date(Date.UTC(
            fromDate.getFullYear(),
            fromDate.getMonth(),
            fromDate.getDate(),
            0, 0, 0
        ));

        query = query.gte("created_at", fromUTC.toISOString());
    }

 if(toInput){

        const toDate = new Date(toInput);

        const toUTC = new Date(Date.UTC(
            toDate.getFullYear(),
            toDate.getMonth(),
            toDate.getDate(),
            23, 59, 59
        ));

        query = query.lte("created_at", toUTC.toISOString());
    }

    const { data, error } = await query;

console.log("DATA FROM SUPABASE:", data);
console.log("ERROR:", error);

    if(error){
        console.log(error);
        return;
    }

    /* =========================
       IMPORTANT FIX (EMPTY DATA)
    ========================= */

    const table = document.getElementById("servicesAnalyticsTable");
    const canvas = document.getElementById("servicesChart");

    // لو مفيش بيانات
    if(!data || data.length === 0){

        table.innerHTML = `
            <tr>
                <td colspan="5" style="padding:20px;color:#fff;text-align:center;">
                    لا توجد بيانات في هذه الفترة
                </td>
            </tr>
        `;

        document.getElementById("topService").innerText = "---";
        document.getElementById("servicesCount").innerText = 0;

        if(window.servicesChart){
            window.servicesChart.destroy();
        }

        return;
    }

    /* =========================
       STATS
    ========================= */

    const stats = {};
    let totalServices = 0;

    data.forEach(service => {

        const name = service.service_name || "Unnamed";

        const total = Number(service.total_amount || 0);
        const paid = Number(service.paid_amount || 0);
        const remain = Number(service.remain_amount || 0);

        if(!stats[name]){
            stats[name] = {
                count:0,
                total:0,
                paid:0,
                remain:0
            };
        }

        stats[name].count += 1;
        stats[name].total += total;
        stats[name].paid += paid;
        stats[name].remain += remain;

        totalServices++;
    });

    /* =========================
       TABLE
    ========================= */

    table.innerHTML = "";

    let topName = "---";
    let topCount = 0;

    Object.keys(stats).forEach(name => {

        const item = stats[name];

        if(item.count > topCount){
            topCount = item.count;
            topName = name;
        }

        table.innerHTML += `
        <tr style="background:#1e293b;border-bottom:1px solid rgba(255,255,255,.05);">

            <td style="padding:14px;color:white;">${name}</td>
            <td style="padding:14px;color:#4cc9f0;">${item.count}</td>
            <td style="padding:14px;color:#80ffdb;">${item.total.toFixed(2)} EGP</td>
            <td style="padding:14px;color:#38bdf8;">${item.paid.toFixed(2)} EGP</td>
            <td style="padding:14px;color:#ff8fa3;">${item.remain.toFixed(2)} EGP</td>

        </tr>`;
    });

    /* =========================
       TOP STATS
    ========================= */

    document.getElementById("topService").innerText = topName;
    document.getElementById("servicesCount").innerText = totalServices;

    /* =========================
       CHART DATA
    ========================= */

    const labels = Object.keys(stats);
    const values = labels.map(label => stats[label].count);

    /* =========================
       DESTROY OLD CHART
    ========================= */

    
if(window.servicesChart && typeof window.servicesChart.destroy === "function"){
    window.servicesChart.destroy();
}
    /* =========================
       CREATE CHART (SAFE)
    ========================= */

    window.servicesChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "عدد مرات الخدمة",
                data: values,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: "white" }
                }
            },
            scales: {
                x: { ticks: { color: "white" } },
                y: { ticks: { color: "white" } }
            }
        }
    });
}

/* =========================
AUTO LOAD
========================= */





async function getUserId() {
    const { data } = await supabaseClient.auth.getUser();
    return data.user.id;
}


window.addEventListener("load", async () => {

    await initUser();

    loadCurrentMonthDashboard();
    loadFinancialDashboard();
    loadDailyDashboard();
    loadMonthlyComparison();
    loadTopService();

    // 🔥 استدعاء واحد فقط
    await loadServicesAnalytics();
});


// احصائيات العمر 
function calculateAge(birthDate){

    if(!birthDate) return 0;

    const today = new Date();
    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();

    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

async function loadAgeStats(){

    const userId = await getUserId();
    if(!userId) return;

    const filter = document.getElementById("timeFilter")?.value || "all";

    let query = supabaseClient
        .from("patients")
        .select("birth_date, created_at")
        .eq("user_id", userId);

    const now = new Date();

    /* =========================
   FILTER LOGIC (UTC SAFE)
========================= */

if(filter === "today"){

    const nowUTC = new Date();

    const startUTC = new Date(Date.UTC(
        nowUTC.getUTCFullYear(),
        nowUTC.getUTCMonth(),
        nowUTC.getUTCDate(),
        0,0,0
    ));

    query = query.gte(
        "created_at",
        startUTC.toISOString()
    );
}

else if(filter === "week"){

    const weekAgoUTC = new Date();

    weekAgoUTC.setUTCDate(
        weekAgoUTC.getUTCDate() - 7
    );

    query = query.gte(
        "created_at",
        weekAgoUTC.toISOString()
    );
}

else if(filter === "month"){

    const monthAgoUTC = new Date();

    monthAgoUTC.setUTCMonth(
        monthAgoUTC.getUTCMonth() - 1
    );

    query = query.gte(
        "created_at",
        monthAgoUTC.toISOString()
    );
}

    /* ALL TIME → لا شيء (default) */

    const { data, error } = await query;

    if(error){
        console.log("SUPABASE ERROR:", error);
        return;
    }

    if(!data){
        return;
    }

    /* =========================
       AGE GROUPS
    ========================= */

    let groups = {
        "0-10": 0,
        "11-20": 0,
        "21-40": 0,
        "41-60": 0,
        "60+": 0
    };

    data.forEach(p => {

        if(!p.birth_date) return;

        const age = calculateAge(p.birth_date);

        if(isNaN(age)) return;

        if(age <= 10) groups["0-10"]++;
        else if(age <= 20) groups["11-20"]++;
        else if(age <= 40) groups["21-40"]++;
        else if(age <= 60) groups["41-60"]++;
        else groups["60+"]++;
    });

    /* =========================
       RENDER TABLE
    ========================= */

    const container = document.getElementById("ageStats");

    container.innerHTML = `
<tr>
    <td><div class="table-badge blue">👶 Kids</div></td>
    <td>0 - 10</td>
    <td class="count">${groups["0-10"]}</td>
</tr>

<tr>
    <td><div class="table-badge green">🧑 Young</div></td>
    <td>11 - 20</td>
    <td class="count">${groups["11-20"]}</td>
</tr>

<tr>
    <td><div class="table-badge purple">👨 Adults</div></td>
    <td>21 - 40</td>
    <td class="count">${groups["21-40"]}</td>
</tr>

<tr>
    <td><div class="table-badge orange">🧔 Middle</div></td>
    <td>41 - 60</td>
    <td class="count">${groups["41-60"]}</td>
</tr>

<tr>
    <td><div class="table-badge red">👴 Seniors</div></td>
    <td>60+</td>
    <td class="count">${groups["60+"]}</td>
</tr>
`;
}

window.onload = () => {
    loadAgeStats();
};

function goToLabs(){
    window.location.href = "labs.html";
}

function goToBills(){
    window.location.href = "Bill.html";
}






async function loadNetProfit(){

    const userId = await getUserId();

    /* =========================
       SAFE FILTER
    ========================= */

    const filterElement =
        document.getElementById("profitFilter");

    if(!filterElement){
        console.error("profitFilter not found");
        return;
    }

    let filter = filterElement.value;

    // 🔥 DEFAULT = MONTH
    if(!filter || filter === ""){
        filter = "month";
        filterElement.value = "month";
    }

    const now = new Date();

    let fromDate = new Date();
    let toDate = new Date();

    /* =========================
       DATE FILTERS (UTC SAFE)
    ========================= */

    switch(filter){

        case "today":
            fromDate = new Date();
            fromDate.setHours(0,0,0,0);
            toDate = new Date();
            break;

            case "yesterday":

             fromDate = new Date();

             fromDate.setDate(fromDate.getDate() - 1);
             fromDate.setHours(0,0,0,0);

             toDate = new Date(fromDate);

             toDate.setHours(23,59,59,999);

             break;

        case "week":
            fromDate = new Date();
            fromDate.setDate(now.getDate() - 7);
            toDate = new Date();
            break;

        case "month":
            fromDate = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                1
            ));
            toDate = new Date();
            break;
case "last_month":

    fromDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - 1,
        1,
        0,0,0
    ));

    toDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        0,
        23,59,59
    ));

    break;

        case "3m":
            fromDate = new Date();
            fromDate.setMonth(now.getMonth() - 3);
            toDate = new Date();
            break;

        case "6m":
            fromDate = new Date();
            fromDate.setMonth(now.getMonth() - 6);
            toDate = new Date();
            break;
    }

    const from = fromDate.toISOString();
    const to = toDate.toISOString();

    /* =========================
       SERVICES
    ========================= */

    const { data: services } =
    await supabaseClient
    .from("patientt_services")
    .select("paid_amount")
    .eq("user_id", userId)
    .gte("created_at", from)
    .lte("created_at", to);

let paidTotal = 0;

services?.forEach(i => {
    paidTotal += Number(i.paid_amount || 0);
});

    /* =========================
       LAB COST
    ========================= */

    const { data: labWorks } =
        await supabaseClient
        .from("lab_works")
        .select("lab_cost")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lte("created_at", to);

    let labTotal = 0;

    labWorks?.forEach(i => {
        labTotal += Number(i.lab_cost || 0);
    });

    /* =========================
       BILLS
    ========================= */

    const { data: bills } =
        await supabaseClient
        .from("bills")
        .select("amount")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lte("created_at", to);

    let billsTotal = 0;

    bills?.forEach(i => {
        billsTotal += Number(i.amount || 0);
    });

    /* =========================
       NET PROFIT
    ========================= */

    const netProfit =
    paidTotal - labTotal - billsTotal;
    /* =========================
       UI
    ========================= */

    document.getElementById("netProfit").innerHTML = `
        <div style="font-size:18px;font-weight:700">
            ${netProfit.toFixed(2)} EGP
        </div>

        <div style="color:#94a3b8;font-size:13px;margin-top:5px">
            Paid: ${paidTotal.toFixed(2)} <br>
            Lab Cost: ${labTotal.toFixed(2)} <br>
            Bills: ${billsTotal.toFixed(2)}
        </div>
    `;
}

// دليفري المعمامل 
async function loadDeliveryReminders() {

     console.log("loadDeliveryReminders started");

    const container =
        document.getElementById("deliveryReminders");

    console.log("CONTAINER:", container);

    
    const userId = await getUserId();

    if (!userId) return;

   const { data, error } = await supabaseClient
    .from("lab_works")
    .select(`
        *,
        labs (
            lab_name
        )
    `)
    .eq("user_id", userId)
    .eq("received", false);
    

    console.log("LAB WORKS DATA:", data);
console.log("LAB WORKS ERROR:", error);

console.log("USER ID:", userId);
console.log("DATA:", data);
console.log("ERROR:", error);

    if (error) {
        console.log(error);
        return;
    }


    container.innerHTML = "";

    const today = new Date();
    today.setHours(0,0,0,0);

    const reminders = data.filter(w => {

        if (!w.delivery_date) return false;

        const delivery =
            new Date(w.delivery_date);

        const diffDays =
            Math.ceil(
                (delivery - today)
                / (1000 * 60 * 60 * 24)
            );

        return diffDays <= 3;
    });

console.log("Reminders:", reminders.length);

    console.log(reminders);



    if(reminders.length === 0){
        container.innerHTML = `
            <div class="no-deliveries">
                ✅ No upcoming deliveries
            </div>
        `;
        return;
    }

    reminders.forEach(w => {

        const delivery =
            new Date(w.delivery_date);

        const diffDays =
            Math.ceil(
                (delivery - today)
                / (1000 * 60 * 60 * 24)
            );

            

        let color = "#22c55e";
        let text = "Soon";

        if(diffDays < 0){
            color = "#ef4444";
            text = "Overdue";
        }
        else if(diffDays === 0){
            color = "#f59e0b";
            text = "Today";
        }

        

        container.innerHTML += `
<div
    class="delivery-card"
    style="border-left-color:${color}"
>

    <div class="delivery-patient">
        👤 ${w.patient_name}
    </div>

    <div class="delivery-work">
        🦷 ${w.work_name}
    </div>

    <div class="delivery-lab">
        🏢 ${w.labs?.lab_name || "-"}
    </div>

    <div class="delivery-date">
        📅 ${w.delivery_date}
    </div>

    <span
        class="delivery-status"
        style="
            background:${color}20;
            color:${color};
            border:1px solid ${color};
        "
    >
        ${text}
    </span>

<button
    onclick="markWorkReceived(${w.id})"
    style="
    margin-top:10px;
    border:none;
    border-radius:999px;
    padding:8px 14px;
    font-size:13px;
    font-weight:700;
    cursor:pointer;
    color:white;
    background:linear-gradient(135deg,#10b981,#059669);
    box-shadow:0 4px 12px rgba(16,185,129,.35);
    transition:.25s;
    display:inline-flex;
    align-items:center;
    gap:6px;
    "
    onmouseover="
        this.style.transform='translateY(-2px)';
        this.style.boxShadow='0 8px 18px rgba(16,185,129,.45)';
    "
    onmouseout="
        this.style.transform='translateY(0)';
        this.style.boxShadow='0 4px 12px rgba(16,185,129,.35)';
    "
>
    ✅ استلام
</button>
</div>
`;

    });
}

loadDeliveryReminders();

async function markWorkReceived(id){

    const { error } = await supabaseClient
        .from("lab_works")
        .update({
            received: true
        })
        .eq("id", id);

    if(error){
        showToast(error.message);
        return;
    }

    showToast("✅ تم الاستلام");

    loadDeliveryReminders();
}


window.addEventListener("load", () => {
    document.querySelectorAll(".reports-details").forEach(item => {
        item.removeAttribute("open");
    });
});

/* =========================
   AUTO LOAD (FIXED)
========================= */

window.addEventListener("load", async () => {

    const filter = document.getElementById("profitFilter");

    if(filter){
        filter.value = "month";
    }

    await loadNetProfit();
});