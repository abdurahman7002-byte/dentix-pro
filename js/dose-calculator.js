// =========================
// LOAD DRUGS
// =========================




async function loadDrugsForCalculator() {

    const select = document.getElementById("drugSelect");

    const { data, error } = await supabaseClient
        .from("drugs")
        .select(`
            *,
            drug_categories(name)
        `);

    if (error) {
        console.log(error);
        select.innerHTML = "<option>Error loading drugs</option>";
        return;
    }

    select.innerHTML = `<option value="">Select drug</option>`;

    data.forEach(drug => {

        select.innerHTML += `
            <option value='${JSON.stringify(drug)}'>
                ${drug.drug_name} (${drug.drug_categories?.name || "No category"})
            </option>
        `;
    });
}

function calculateDose() {

    const age = Number(document.getElementById("age").value);
    const weight = Number(document.getElementById("weight").value);
    const drugValue = document.getElementById("drugSelect").value;

    const resultBox = document.getElementById("resultBox");

    if (!age || !drugValue) {
        resultBox.style.display = "block";
        resultBox.innerHTML = "⚠️ Please fill age and drug";
        return;
    }

    const drug = JSON.parse(drugValue);

    console.log(drug);

    const mgPerKg = Number(drug.mg_per_kg || 0);
    const concentration = Number(drug.concentration || 0);
    const maxDose = Number(drug.max_daily_dose || 0);

    // =========================
    // NOTES
    // =========================

    let notesHTML = "";

    if (drug.notes) {

        notesHTML = `
            <div style="
                margin-top:12px;
                padding:12px;
                border-radius:12px;
                background:rgba(245,158,11,.12);
                border:1px solid rgba(245,158,11,.4);
                color:#fbbf24;
                font-weight:600;
            ">
                ⚠️ Note: ${drug.notes}
            </div>
        `;
    }

    resultBox.style.display = "block";

    // =========================
    // 👶 PEDIATRIC
    // =========================

    if (age < 12) {

        if (!weight) {
            resultBox.innerHTML =
                "⚠️ Please enter weight for pediatric dosing";
            return;
        }

        const freq = Number(drug.frequency_per_day || 1);

        const totalDoseMg = weight * mgPerKg;
        const doseMgPerDose = totalDoseMg / freq;

        let pediatricWarningHTML = "";

        // ✅ FIXED MAX DOSE CHECK
        if (maxDose > 0 && totalDoseMg > maxDose) {
            pediatricWarningHTML = `
                <div style="
                    margin-top:12px;
                    padding:12px;
                    border-radius:12px;
                    background:rgba(239,68,68,.15);
                    border:1px solid rgba(239,68,68,.5);
                    color:#f87171;
                    font-weight:700;
                ">
                    🚨 EXCEEDS MAXIMUM DAILY DOSE (${maxDose} mg/day)
                </div>
            `;
        }

        let doseFormHTML = "";

        const form = (drug.dosage_form || "").toLowerCase();

        if (form.includes("susp") || form.includes("syrup")) {

            if (concentration > 0) {

                const doseMl = (doseMgPerDose * 5) / concentration;

                doseFormHTML = `
                    <br><br>
                    <strong>Syrup Dose (per dose):</strong><br>
                    ${doseMl.toFixed(2)} mL
                `;
            }
        }

        else if (form.includes("tablet") || form.includes("capsule")) {

            if (concentration > 0) {

                const units = doseMgPerDose / concentration;

                doseFormHTML = `
                    <br><br>
                    <strong>Units Per Dose:</strong><br>
                    ${units.toFixed(2)}
                    ${form.includes("capsule") ? "capsule(s)" : "tablet(s)"}
                `;
            }
        }

        resultBox.innerHTML = `
            <div>

                <h3>👶 Pediatric Dose</h3>

                <strong>Drug:</strong> ${drug.drug_name}<br>
                <strong>Category:</strong> ${drug.drug_categories?.name || "-"}<br><br>

                <strong>Total Daily Dose:</strong><br>
                ${totalDoseMg.toFixed(2)} mg/day

                <br><br>

                <strong>Per Dose (${freq} times/day):</strong><br>
                ${doseMgPerDose.toFixed(2)} mg

                ${doseFormHTML}
                ${pediatricWarningHTML}
                ${notesHTML}

                <br><br>

                <small style="color:#94a3b8">
                    Based on ${mgPerKg} mg/kg/day
                </small>

            </div>
        `;
    }

    // =========================
    // 👨 ADULT
    // =========================

    else {

        const freq = Number(drug.frequency_per_day || 1);
        const hours = 24 / freq;

        const form = (drug.dosage_form || "").toLowerCase();

        let dosageHTML = "";

        let adultTotalDoseMg = 0;

        if (form.includes("susp") || form.includes("syrup")) {

            if (!weight) {
                resultBox.innerHTML = "⚠️ Please enter weight";
                return;
            }

            adultTotalDoseMg = weight * mgPerKg;
            const doseMgPerDose = adultTotalDoseMg / freq;

            const doseMl = (doseMgPerDose * 5) / concentration;

            dosageHTML = `
                <strong>Total Daily Dose:</strong><br>
                ${adultTotalDoseMg.toFixed(2)} mg/day

                <br><br>

                <strong>Per Dose (${freq} times/day):</strong><br>
                ${doseMgPerDose.toFixed(2)} mg

                <br><br>

                <strong>Syrup Dose:</strong><br>
                ${doseMl.toFixed(2)} mL every ${hours} hours
            `;
        }

        else if (form.includes("tablet")) {

            dosageHTML = `
                <strong>Dosage:</strong><br>
                1 tablet every ${hours} hours
            `;
        }

        else if (form.includes("capsule")) {

            dosageHTML = `
                <strong>Dosage:</strong><br>
                1 capsule every ${hours} hours
            `;
        }

        else {

            dosageHTML = `
                <strong>Dosage:</strong><br>
                Every ${hours} hours
            `;
        }

        // ✅ FIX: adult max dose check added properly
        let adultWarningHTML = "";

        if (maxDose > 0 && adultTotalDoseMg > maxDose) {

            adultWarningHTML = `
                <div style="
                    margin-top:12px;
                    padding:12px;
                    border-radius:12px;
                    background:rgba(239,68,68,.15);
                    border:1px solid rgba(239,68,68,.5);
                    color:#f87171;
                    font-weight:700;
                ">
                    🚨 EXCEEDS MAXIMUM DAILY DOSE (${maxDose} mg/day)
                </div>
            `;
        }

        resultBox.innerHTML = `
            <div>

                <h3>👨 Adult Dose</h3>

                <strong>Drug:</strong> ${drug.drug_name}<br>
                <strong>Category:</strong> ${drug.drug_categories?.name || "-"}<br><br>

                ${dosageHTML}
                ${adultWarningHTML}
                ${notesHTML}

                <br><br>

                <small style="color:#94a3b8">
                    Frequency: ${freq} times per day
                </small>

            </div>
        `;
    }
}

function estimateWeight() {

    const age =
        Number(
            document.getElementById("age").value
        );

    if (isNaN(age)) {

        alert("Enter age first");

        return;
    }

    if (age >= 12) {

        alert(
            "Weight estimation is available for children only (0-11 years)"
        );

        return;
    }

    let estimatedWeight;

    // أقل من سنة
    if (age < 1) {

        estimatedWeight = 8;
    }

    // 1 - 5 سنوات
    else if (age <= 5) {

        estimatedWeight =
            (age * 2) + 8;
    }

    // 6 - 11 سنة
    else {

        estimatedWeight =
            (age * 3) + 7;
    }

    document.getElementById("weight").value =
        estimatedWeight.toFixed(1);

    document.getElementById("weightHint").innerHTML =
        `⚠️ Estimated pediatric weight: ${estimatedWeight.toFixed(1)} kg`;
}

// =========================
// INIT
// =========================

document.addEventListener("DOMContentLoaded", () => {
    loadDrugsForCalculator();
});