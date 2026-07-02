
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
SAVE / UPDATE BILL
========================= */

async function saveBill(){

    const userId = await getUserId();

    const beneficiary =
        document.getElementById("beneficiary")
        .value
        .trim();

    const reason =
        document.getElementById("reason")
        .value
        .trim();

    const amount =
        parseFloat(
            document.getElementById("amount").value
        );

    if(!beneficiary){
        alert("Beneficiary is required");
        return;
    }

    if(!reason){
        alert("Reason is required");
        return;
    }

    if(!amount){
        alert("Amount is required");
        return;
    }

    const payload = {
        user_id: userId,
        beneficiary,
        reason,
        amount
    };

    let error;

    // =========================
    // UPDATE MODE
    // =========================
    if(editingBillId){

        ({ error } = await supabaseClient
            .from("bills")
            .update(payload)
            .eq("id", editingBillId)
        );

        editingBillId = null;

    } else {

        // =========================
        // INSERT MODE
        // =========================
        ({ error } = await supabaseClient
            .from("bills")
            .insert([payload])
        );
    }

    if(error){
        alert(error.message);
        return;
    }

    clearForm();
    loadBills();
    await loadMonthlyBillsDashboard();

    document.querySelector(".save-btn").innerText =
        "Save Bill";
}

/* =========================
EDIT BILL
========================= */

function editBill(bill){

    document.getElementById("beneficiary").value =
        bill.beneficiary || "";

    document.getElementById("reason").value =
        bill.reason || "";

    document.getElementById("amount").value =
        bill.amount || "";

    editingBillId = bill.id;

    document.querySelector(".save-btn").innerText =
        "Update Bill";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================
CLEAR FORM
========================= */

function clearForm(){

    document.getElementById("beneficiary").value = "";
    document.getElementById("reason").value = "";
    document.getElementById("amount").value = "";
}

/* =========================
LOAD BILLS
========================= */

async function loadBills(){

    const userId = await getUserId();

    // 🔥 فلتر: آخر 6 أشهر فقط
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data, error } =
        await supabaseClient
        .from("bills")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", sixMonthsAgo.toISOString()) // 👈 هنا الفلتر
        .order("id",{ascending:false});

    if(error){
        console.log(error);
        return;
    }

    const container =
        document.getElementById("billsContainer");

    container.innerHTML = "";

const searchText =
    (document.getElementById("billSearch")?.value || "")
    .toLowerCase()
    .trim();

    if(!data || data.length === 0){
        container.innerHTML =
        "<p>No Bills Found</p>";
        return;
    }

    const filteredBills = data.filter(bill => {

    if(!searchText) return true;

    const beneficiary =
        (bill.beneficiary || "")
        .toLowerCase();

    const date =
        new Date(bill.created_at)
        .toLocaleDateString()
        .toLowerCase();

    const dateTime =
        new Date(bill.created_at)
        .toLocaleString()
        .toLowerCase();

    return (
        beneficiary.includes(searchText) ||
        date.includes(searchText) ||
        dateTime.includes(searchText)
    );
});

if(filteredBills.length === 0){

    container.innerHTML = `
        <p style="
            text-align:center;
            color:#888;
            padding:20px;
        ">
            No matching bills found
        </p>
    `;

    return;
}

filteredBills.forEach(bill => {

        container.innerHTML += `

        <div class="bill-item">

            <div class="bill-title">
                ${bill.beneficiary}
            </div>

            <div>
                ${bill.reason}
            </div>

            <div class="amount">
                ${bill.amount} EGP
            </div>

            <div class="bill-date">
                ${new Date(bill.created_at).toLocaleString()}
            </div>

            <div style="display:flex;gap:8px;margin-top:10px;">

                <button
                    onclick='editBill(${JSON.stringify(bill)})'
                    class="edit-btn"
                    style="
                        background: linear-gradient(135deg, #3b82f6, #06b6d4);
                        color: white;
                        border: none;
                        padding: 8px 14px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 13px;
                        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.25);
                        transition: 0.3s;
                    "
                    onmouseover="this.style.transform='translateY(-2px)'"
                    onmouseout="this.style.transform='translateY(0)'"
                >
                    ✏️ Edit
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteBill(${bill.id})">

                    Delete

                </button>

            </div>

        </div>

        `;
    });
}
/* =========================
DELETE BILL
========================= */

async function deleteBill(id){

    if(!confirm("Delete Bill?"))
        return;

    const { error } =
        await supabaseClient
        .from("bills")
        .delete()
        .eq("id", id);

    if(error){
        alert(error.message);
        return;
    }

    loadBills();
    await loadMonthlyBillsDashboard();
}

/* =========================
GO DASHBOARD
========================= */

function goDashboard(){

    window.location.href =
        "dashboard.html";
}

/* =========================
INIT
========================= */

(async () => {

    await deleteOldBills();

    await loadBills();

})();


async function loadMonthlyBillsDashboard(){

    const userId = await getUserId();

    if(!userId){
        console.log("No user");
        return;
    }

    /* =========================
       MONTH RANGE (UTC SAFE)
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

    /* =========================
       GET BILLS
    ========================= */

    const { data: bills, error } =
        await supabaseClient
        .from("bills")
        .select("amount, created_at")
        .eq("user_id", userId)
        .gte("created_at", startOfMonth.toISOString())
        .lt("created_at", startOfNextMonth.toISOString());

    if(error){
        console.log(error);
        return;
    }

    /* =========================
       CALCULATE TOTAL
    ========================= */

    let totalBills = 0;

    bills?.forEach(bill => {
        totalBills += Number(bill.amount || 0);
    });

    /* =========================
       UI
    ========================= */

   const el = document.getElementById("monthlyBillsTotal");

if(el){
    el.innerHTML = `
        <div class="label">Monthly Bills- اجمالي الفواتير هذا الشهر</div>
        <div class="value">${totalBills.toFixed(2)} EGP</div>
        <div class="label">Total expenses this month</div>
    `;
}
}

window.addEventListener("load", () => {
    loadMonthlyBillsDashboard();
});

/* =========================
DELETE OLD BILLS
========================= */

async function deleteOldBills(){

    const userId = await getUserId();

    if(!userId) return;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(
        sixMonthsAgo.getMonth() - 6
    );

    const { error } = await supabaseClient
        .from("bills")
        .delete()
        .eq("user_id", userId)
        .lt(
            "created_at",
            sixMonthsAgo.toISOString()
        );

    if(error){
        console.log(
            "Delete old bills error:",
            error
        );
    }
}