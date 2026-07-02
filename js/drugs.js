async function loadCategories() {

    const { data, error } =
        await supabaseClient
            .from("drug_categories")
            .select("*")
            .order("name");

    if (error) {
        console.log(error);
        return;
    }

    const select =
        document.getElementById("category");

    select.innerHTML = `
        <option value="">
            Select Category
        </option>
    `;

    data.forEach(category => {

        select.innerHTML += `
            <option value="${category.id}">
                ${category.name}
            </option>
        `;
    });
}

/* =========================
   SAVE DRUG
========================= */

async function saveDrug() {

    const { data: userData } =
        await supabaseClient.auth.getUser();

    const userId =
        userData.user.id;

    const drug_name =
        document.getElementById("drugName")
        .value
        .trim();

    const category_id =
        document.getElementById("category")
        .value;

    const concentration =
        document.getElementById("concentration")
        .value
        .trim();

    const dosage_form =
        document.getElementById("dosageForm")
        .value
        .trim();

    const min_age =
        Number(
            document.getElementById("minAge")
            .value || 0
        );

    const max_age =
        Number(
            document.getElementById("maxAge")
            .value || 0
        );

    const mg_per_kg =
        Number(
            document.getElementById("mgPerKg")
            .value || 0
        );

    const frequency_per_day =
        Number(
            document.getElementById("frequency")
            .value || 0
        );

    const max_daily_dose =
        Number(
            document.getElementById("maxDose")
            .value || 0
        );

    const duration_days =
        Number(
            document.getElementById("duration")
            .value || 0
        );

    const notes =
        document.getElementById("notes")
        .value
        .trim();

    if (!drug_name) {

        showToast("Enter drug name");

        return;
    }

    if (!category_id) {

        showToast("Select category");

        return;
    }

    const { error } =
        await supabaseClient
            .from("drugs")
            .insert([{

                user_id: userId,

                category_id,

                drug_name,

                concentration,

                dosage_form,

                min_age,

                max_age,

                mg_per_kg,

                frequency_per_day,

                max_daily_dose,

                duration_days,

                notes

            }]);

   if (error) {

    showToast(error.message, "error");

    return;
}

if (!dosage_form) {
    showToast("Select dosage form", "error");
    return;
}

   showToast("Drug saved successfully", "success");

    clearForm();

    loadDrugs();
}

/* =========================
   CLEAR FORM
========================= */

function clearForm() {

    document.getElementById("drugName").value = "";
    document.getElementById("category").value = "";
    document.getElementById("concentration").value = "";
    document.getElementById("dosageForm").value = "";
    document.getElementById("minAge").value = "";
    document.getElementById("maxAge").value = "";
    document.getElementById("mgPerKg").value = "";
    document.getElementById("frequency").value = "";
    document.getElementById("maxDose").value = "";
    document.getElementById("duration").value = "";
    document.getElementById("notes").value = "";
}

/* =========================
   LOAD DRUGS
========================= */

async function loadDrugs() {

    const search =
        document.getElementById("searchInput")
        .value
        .trim()
        .toLowerCase();

    const { data, error } =
        await supabaseClient
            .from("drugs")
            .select(`
                *,
                drug_categories(
                    name
                )
            `)
            .order("drug_name");

    if (error) {

        console.log(error);

        return;
    }

    const container =
        document.getElementById(
            "drugsContainer"
        );

    container.innerHTML = "";

    const filtered =
        data.filter(drug =>
            drug.drug_name
            .toLowerCase()
            .includes(search)
        );

    if (filtered.length === 0) {

        container.innerHTML = `
            <p>
                No drugs found
            </p>
        `;

        return;
    }

    filtered.forEach(drug => {

        container.innerHTML += `

        <div class="drug-card">

            <div class="drug-name">
                ${drug.drug_name}
            </div>

            <div class="badge">
                ${drug.drug_categories?.name || ""}
            </div>

            <p>
                <b>Concentration:</b>
                ${drug.concentration || "-"}
            </p>

            <p>
                <b>Form:</b>
                ${drug.dosage_form || "-"}
            </p>

            <p>
                <b>Age:</b>
                ${drug.min_age} -
                ${drug.max_age}
            </p>

            <p>
                <b>mg/kg:</b>
                ${drug.mg_per_kg}
            </p>

            <p>
                <b>Frequency:</b>
                ${drug.frequency_per_day}
                / day
            </p>

            <p>
                <b>Max Dose:</b>
                ${drug.max_daily_dose}
            </p>

            <p>
                <b>Duration:</b>
                ${drug.duration_days}
                days
            </p>

            <p>
                <b>Notes:</b>
                ${drug.notes || "-"}
            </p>

            <button
                class="delete-btn"
                onclick="deleteDrug(${drug.id})"
            >
                Delete Drug
            </button>

        </div>

        `;
    });
}

/* =========================
   DELETE DRUG
========================= */

async function deleteDrug(id) {

    const confirmDelete =
        confirm(
            "Delete this drug?"
        );

    if (!confirmDelete)
        return;

    const { error } =
        await supabaseClient
            .from("drugs")
            .delete()
            .eq("id", id);

    if (error) {

        alert(error.message);

        return;
    }
    

    loadDrugs();
}

function changeConcentrationPlaceholder() {

    const dosageForm =
        document.getElementById("dosageForm").value;

    const concentrationInput =
        document.getElementById("concentration");

    if (
        dosageForm === "Suspension" ||
        dosageForm === "Syrup"
    ) {

        concentrationInput.placeholder =
            "Concentration (mg / 5 mL)";
    }
    else if (
        dosageForm === "Drops"
    ) {

        concentrationInput.placeholder =
            "Concentration (mg / mL)";
    }
    else if (
        dosageForm === "Tablet" ||
        dosageForm === "Capsule" ||
        dosageForm === "Suppository"
    ) {

        concentrationInput.placeholder =
            "Strength per unit (mg per tablet/capsule)";
    }
    else if (
        dosageForm === "Injection"
    ) {

        concentrationInput.placeholder =
            "Concentration (mg / mL)";
    }
    else {

        concentrationInput.placeholder =
            "Concentration";
    }
}

function showToast(message, type = "success") {

    const toast = document.getElementById("toast");

    toast.innerText = message;

    toast.style.borderColor =
        type === "error"
        ? "rgba(239,68,68,.6)"
        : "rgba(34,197,94,.6)";

    toast.style.color =
        type === "error"
        ? "#f87171"
        : "#4ade80";

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

/* =========================
   INIT
========================= */

loadCategories();
loadDrugs();