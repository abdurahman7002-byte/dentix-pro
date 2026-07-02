


/* =========================
   CLOUDINARY UPLOAD
========================= */

async function uploadToCloudinary(file){

    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", "clinic_files");

    const response = await fetch(
        "https://api.cloudinary.com/v1_1/dflfcteo2/auto/upload",
        {
            method: "POST",
            body: formData
        }
    );

    const data = await response.json();

    if(data.error){
        throw new Error(data.error.message);
    }

    return data.secure_url;
}

// primary chart
function calculateAge(birthDate){

    if(!birthDate) return 99;

    const today = new Date();

    const birth =
        new Date(birthDate);

    let age =
        today.getFullYear()
        - birth.getFullYear();

    const m =
        today.getMonth()
        - birth.getMonth();

    if(
        m < 0 ||
        (
            m === 0 &&
            today.getDate() < birth.getDate()
        )
    ){
        age--;
    }

    return age;
}




const params = new URLSearchParams(window.location.search);
const patientId = params.get("id");

if(!patientId){
    alert("Patient ID Missing");
    throw new Error("Missing ID");
}

/* =========================
   LOAD PATIENT
========================= */

async function loadPatient(){

    const { data, error } = await supabaseClient
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

    if(error){
        console.log(error);
        return;
    }

    /* =========================
       PRIMARY TEETH CHECK
    ========================= */

    const age =
        calculateAge(data.birth_date);

    if(age <= 13){

        document.getElementById(
            "primaryChartCard"
        ).style.display = "block";

        loadPrimaryToothChart();
    }

    else{

        document.getElementById(
            "primaryChartCard"
        ).style.display = "none";
    }

    /* =========================
       PATIENT INFO
    ========================= */

    document.getElementById("patientInfo").innerHTML = `

        <h2>${data.full_name}</h2>

        <p><strong>Phone:</strong> ${data.phone || "-"}</p>

        <p><strong>Gender:</strong> ${data.gender || "-"}</p>

        <p><strong>Address:</strong> ${data.address || "-"}</p>

        <p>
            <strong>Age:</strong>
            ${age} Years
        </p>

        <p>
            <strong>Regist. At:</strong>
            ${data.visit_date || "-"}
        </p>

        <p>
            <strong>Medical History:</strong>
            ${data.medical_history || "-"}
        </p>

        <p>
            <strong>Dental History:</strong>
            ${data.dental_history || "-"}
        </p>

       
    `;

    /* =========================
       EDIT INPUTS
    ========================= */

    document.getElementById("name").value =
        data.full_name || "";

    document.getElementById("phone").value =
        data.phone || "";

    document.getElementById("address").value =
        data.address || "";

    document.getElementById("gender").value =
        data.gender || "";

    document.getElementById("birth_date").value =
        data.birth_date || "";

    document.getElementById("visit_date").value =
        data.visit_date || "";

    document.getElementById("medical_history").value =
        data.medical_history || "";

    document.getElementById("dental_history").value =
        data.dental_history || "";

   
}
/* =========================
   UPLOAD FILE SYSTEM
========================= */

async function uploadFile(inputId, type){

    const input = document.getElementById(inputId);

    if(!input.files.length){
        alert("Choose file first");
        return;
    }

    const file = input.files[0];

    let imageUrl;

    try{

        imageUrl = await uploadToCloudinary(file);

    }catch(err){

        alert(err.message);
        return;
    }

    const { error: dbError } = await supabaseClient
        .from("patient_images")
        .insert([{
            patient_id: patientId,
            image_url: imageUrl,
            image_type: type
        }]);

    if(dbError){
        alert(dbError.message);
        return;
    }

    showToast("Saved successfully");

    loadImages();
}

/* wrappers */
function uploadClinicalImage(){
    uploadFile("clinicalImage", "clinical");
}

function uploadXray(){
    uploadFile("xrayImage", "xray");
}


/* =========================
   LOAD IMAGES
========================= */

async function loadImages(){

    const { data, error } = await supabaseClient
        .from("patient_images")
        .select("*")
        .eq("patient_id", patientId)
        .order("id", { ascending:false });

    if(error){

        console.log(error);

        return;
    }

    const container = document.getElementById("imagesContainer");

    const afterContainer =
document.getElementById(
    "afterImagesContainer"
);

    const filesContainer =
    document.getElementById("medicalFilesContainer");

    container.innerHTML = "";
    afterContainer.innerHTML = "";
    filesContainer.innerHTML = "";

    /* EMPTY */

    let beforeCount = 0;

let afterCount = 0;

let filesCount = 0;

      

    /* LOOP */

   data.forEach(img => {


    const targetContainer =

    img.image_type === "clinical_after" ||
    img.image_type === "xray_after"

    ? afterContainer

    : container;

    /* =========================
       MEDICAL FILES
    ========================= */

    if(
        img.image_type === "dicom" ||
        img.image_type === "obj" ||
        img.image_type === "ply" ||
        img.image_type === "pdf" ||
        img.image_type === "html"
)
        
    {
filesCount++;
       filesContainer.innerHTML += `

<div class="image-box">

    <!-- DELETE BUTTON -->

    <button 
        class="delete-image-btn"
        onclick="deleteImage(${img.id})"
    >

        <i class="fa-solid fa-trash"></i>

    </button>

    <!-- CONTENT -->

    <div style="
        width:100%;
        height:100%;

        display:flex;
        flex-direction:column;

        align-items:center;
        justify-content:center;

        gap:14px;

        padding:20px;

        text-align:center;
    ">

        <!-- ICON -->

        <i class="fa-solid fa-cube"
        style="
            font-size:65px;
            color:#80ffdb;
        "></i>

        <!-- FILE TYPE -->

        <div style="
            font-size:15px;
            font-weight:700;
            color:white;
            text-transform:uppercase;
        ">
            ${img.image_type}
        </div>

        <!-- DATE -->

        <div style="
            font-size:12px;
            color:#cbd5e1;
        ">

            <i class="fa-solid fa-clock"></i>

            ${
                new Date(img.created_at).toLocaleString('en-GB',{

                    timeZone:'Africa/Cairo',

                    day:'2-digit',
                    month:'2-digit',
                    year:'numeric',

                    hour:'2-digit',
                    minute:'2-digit',

                    hour12:true
                })
            }

        </div>

        <!-- OPEN FILE -->

<a 
    href="${img.image_url}"
    target="_blank"
    style="
        display:inline-flex;
        align-items:center;
        gap:10px;

        padding:10px 16px;

        border-radius:14px;

        text-decoration:none;

        color:white;
        font-weight:600;
        font-size:14px;

        background:linear-gradient(135deg,#00b4d8,#48cae4);

        box-shadow:0 8px 20px rgba(0,180,216,0.25);

        transition:all 0.3s ease;

        position:relative;
        overflow:hidden;
    "

    onmouseover="this.style.transform='translateY(-3px) scale(1.03)'"
    onmouseout="this.style.transform='translateY(0) scale(1)'"
>
    <i class="fa-solid fa-download"></i>
    Open File
</a>
        
    </div>

</div>
`;
    }

    /* =========================
       NORMAL IMAGES
    ========================= */

    else{
if(
    img.image_type === "clinical_after" ||
    img.image_type === "xray_after"
){
    afterCount++;
}
else{
    beforeCount++;
}
    targetContainer.innerHTML += `

    <div class="image-box">

        <!-- IMAGE -->

        <img 
            src="${img.image_url}"
            onclick="openImageViewer('${img.image_url}')"
            style="cursor:zoom-in;"
        >

        <!-- TYPE -->

        <div class="image-type">

            ${
                img.image_type === "clinical"
                ? "Clinical Before"

                : img.image_type === "xray"
                ? "X-Ray Before"

                : img.image_type === "clinical_after"
                ? "Clinical After"

                : img.image_type === "xray_after"
                ? "X-Ray After"

                : img.image_type
            }

        </div>

        <!-- DATE -->

        <div style="
            position:absolute;
            bottom:10px;
            left:10px;

            background:rgba(0,0,0,0.55);

            backdrop-filter:blur(8px);

            color:white;

            padding:6px 10px;

            border-radius:10px;

            font-size:12px;

            font-weight:600;
        ">

            <i class="fa-solid fa-clock"></i>

            ${
                new Date(img.created_at).toLocaleString('en-GB',{

                    timeZone:'Africa/Cairo',

                    day:'2-digit',
                    month:'2-digit',
                    year:'numeric',

                    hour:'2-digit',
                    minute:'2-digit',

                    hour12:true
                })
            }

        </div>

        <!-- DELETE -->

        <button 
            class="delete-image-btn"
            onclick="deleteImage(${img.id})"
        >

            <i class="fa-solid fa-trash"></i>

        </button>

    </div>

    `;
}
    

});

/* =========================
   EMPTY STATES
========================= */

/* BEFORE */

if(beforeCount === 0){

    container.innerHTML = `

    <div class="no-images">

        <i class="fa-solid fa-image"></i>

        <br><br>

        No Images

    </div>

    `;
}

/* AFTER */

if(afterCount === 0){

    afterContainer.innerHTML = `

    <div class="no-images">

        <i class="fa-solid fa-image"></i>

        <br><br>

        No After Images

    </div>

    `;
}

/* FILES */

if(filesCount === 0){

    filesContainer.innerHTML = `

    <div class="no-images">

        <i class="fa-solid fa-folder-open"></i>

        <br><br>

        No Files

    </div>

    `;
}

}
async function deleteImage(id){

    if(!confirm("Delete this image?")) return;

    const { error } = await supabaseClient
        .from("patient_images")
        .delete()
        .eq("id", id);

    if(error){
        alert(error.message);
        return;
    }
showToast("deleted successfully");

    loadImages();
}

/* =========================
   SAVE NOTE
========================= */

async function saveNote(){

    const note = document.getElementById("treatmentNote").value;

    if(!note){
        alert("Write note first");
        return;
    }

    const { data: userData } =
        await supabaseClient.auth.getUser();

    const userId = userData.user.id;

    const { error } = await supabaseClient
        .from("patient_notes")
        .insert([{
            patient_id: patientId,
            note: note,
            user_id: userId
        }]);

    if(error){
        alert(error.message);
        return;
    }

    document.getElementById("treatmentNote").value = "";

    loadNotes();
}

/* =========================
   LOAD NOTES
========================= */

async function loadNotes(){

    const { data, error } = await supabaseClient
        .from("patient_notes")
        .select("*")
        .eq("patient_id", patientId)
        .order("id", { ascending:false });

    if(error){
        console.log(error);
        return;
    }

    const container = document.getElementById("notesContainer");

    container.innerHTML = "";

    if(!data.length){
        container.innerHTML = `
        <div class="no-notes">
            <i class="fa-solid fa-note-sticky"></i>
            <br><br>
            No Treatment Notes
        </div>`;
        return;
    }

    data.forEach(n => {

        container.innerHTML += `
        <div class="note-card">

            <div class="note-header">
                <div class="note-title">
                    <i class="fa-solid fa-notes-medical"></i>
                    Treatment Note
                </div>

                <div class="note-date">
                    <i class="fa-solid fa-clock"></i>

                    ${new Date(n.created_at).toLocaleString('en-US', {
                        timeZone: 'Africa/Cairo',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    })}
                </div>
            </div>

            <textarea id="note-${n.id}" class="note-textarea">
                ${n.note}
            </textarea>

            <div class="note-actions">

                <button onclick="updateNote(${n.id})" class="update-note-btn">
                    Update
                </button>

                <button onclick="deleteNote(${n.id})" class="delete-note-btn">
                    Delete
                </button>

            </div>

        </div>`;
    });
}

/* =========================
   DELETE NOTE
========================= */

async function deleteNote(id){

    if(!confirm("Delete this note?")) return;

    const { error } = await supabaseClient
        .from("patient_notes")
        .delete()
        .eq("id", id);

    if(error){
        alert(error.message);
        return;
    }
showToast("Note Deleted");
    loadNotes();
}

/* =========================
   VISITS
========================= */

async function saveVisit(){

    const { data: userData } =
        await supabaseClient.auth.getUser();

    const userId = userData.user.id;

    const visitDate =
        document.getElementById("visitDate").value || null;

    const treatmentNotes =
        document.getElementById("treatmentNotes").value || null;

    const nextAppointment =
        document.getElementById("nextAppointment").value || null;

    const { error } = await supabaseClient
        .from("patient_visits")
        .insert([{
            patient_id: patientId,
            visit_date: visitDate,
            treatment_notes: treatmentNotes,
            next_appointment: nextAppointment,
            user_id: userId
        }]);

    if(error){
        alert(error.message);
        return;
    }

   showToast("visit added successfully");

    loadVisits();
}

/* LOAD VISITS */

async function loadVisits(){

    const { data, error } = await supabaseClient
        .from("patient_visits")
        .select("*")
        .eq("patient_id", patientId)
        .order("visit_date", { ascending:false });

    if(error){
        console.log(error);
        return;
    }

    const container = document.getElementById("visitsContainer");

    container.innerHTML = "";

    data.forEach(v => {

        container.innerHTML += `
        <div>
            <h3>${v.visit_date}</h3>
            <p>${v.treatment_notes || ""}</p>
        </div>`;
    });
}

async function saveEdit(){

    const { data: userData } = await supabaseClient.auth.getUser();
    const currentUserId = userData?.user?.id;

    if(!currentUserId){
        alert("User not logged in");
        return;
    }


    const { data, error } = await supabaseClient
        .from("patients")
        .update({
            full_name: document.getElementById("name").value || null,
            phone: document.getElementById("phone").value || null,
            address: document.getElementById("address").value || null,
            gender: document.getElementById("gender").value || null,
            birth_date: document.getElementById("birth_date").value || null,
            visit_date: document.getElementById("visit_date").value || null,
            medical_history: document.getElementById("medical_history").value || null,
            dental_history: document.getElementById("dental_history").value || null
        })
        .eq("id", patientId)
        .eq("user_id", currentUserId)
        .select();

    console.log("RESULT:", data, error);

    if(error){
        alert(error.message);
        return;
    }

    if(!data || data.length === 0){
        alert("No rows updated (check user_id or RLS)");
        return;
    }

    showToast("Updated Successfully");

    loadPatient();
}

/* =========================
   DELETE PATIENT
========================= */

async function deletePatient(){

    const confirmDelete =
        confirm("Are you sure you want to delete this patient?");

    if(!confirmDelete) return;

    try{

        /* =========================
           1 - DELETE SERVICES (IMPORTANT)
        ========================= */
        const { error: servicesError } = await supabaseClient
            .from("patientt_services")
            .delete()
            .eq("patient_id", patientId);

        if(servicesError){
            alert(servicesError.message);
            return;
        }

        /* =========================
           2 - DELETE VISITS (if exists)
        ========================= */
        await supabaseClient
            .from("patient_visits")
            .delete()
            .eq("patient_id", patientId);

        /* =========================
           3 - DELETE NOTES (if exists)
        ========================= */
        await supabaseClient
            .from("patient_notes")
            .delete()
            .eq("patient_id", patientId);

        /* =========================
           4 - DELETE PATIENT
        ========================= */

        const { error: patientError } = await supabaseClient
            .from("patients")
            .delete()
            .eq("id", patientId);

        if(patientError){
            alert(patientError.message);
            return;
        }

        showToast("Patient Deleted");

        /* مهم: تحديث الداشبورد */
        window.location.href = "dashboard.html";

    }catch(err){
        console.log(err);
        alert("Error deleting patient");
    }
}

/* =========================
   INIT
========================= */

loadPatient();
loadImages();
loadNotes();
loadVisits();
loadServices();
loadToothChart();
/* =========================
   NAV
========================= */

function goToDashboard(){
    window.location.href = "dashboard.html";
}



function calculateAge(birthDate){

    if(!birthDate) return "-";

    const today = new Date();

    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();

    const monthDiff =
        today.getMonth() - birth.getMonth();

    if(
        monthDiff < 0 ||
        (
            monthDiff === 0 &&
            today.getDate() < birth.getDate()
        )
    ){
        age--;
    }

    return age;
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

// dicom 
async function uploadDicom(input){

    const file = input.files[0];

    if(!file) return;

    let imageUrl;

    try{

        imageUrl = await uploadToCloudinary(file);

    }catch(err){

        alert(err.message);
        return;
    }

    await supabaseClient
        .from("patient_images")
        .insert([{
            patient_id: patientId,
            image_url: imageUrl,
            image_type: "dicom"
        }]);

    showToast("DICOM uploaded ✅");

    loadImages();
}


// obj 
async function uploadOBJ(input){

    const file = input.files[0];

    if(!file) return;

    let imageUrl;

    try{

        imageUrl = await uploadToCloudinary(file);

    }catch(err){

        alert(err.message);
        return;
    }

    const { error } = await supabaseClient
        .from("patient_images")
        .insert([{
            patient_id: patientId,
            image_url: imageUrl,
            image_type: "obj"
        }]);

    if(error){
        alert(error.message);
        return;
    }

    showToast("OBJ Uploaded Successfully ✅");

    loadImages();
}

// ply 
async function uploadPLY(input){

    const file = input.files[0];

    if(!file) return;

    let imageUrl;

    try{

        imageUrl = await uploadToCloudinary(file);

    }catch(err){

        alert(err.message);
        return;
    }

    const { error } = await supabaseClient
        .from("patient_images")
        .insert([{
            patient_id: patientId,
            image_url: imageUrl,
            image_type: "ply"
        }]);

    if(error){
        alert(error.message);
        return;
    }

    showToast("PLY Uploaded Successfully ✅");

    loadImages();
}

// pdf 
async function uploadPDF(input){

    const file = input.files[0];

    if(!file) return;

    let imageUrl;

    try{

        imageUrl = await uploadToCloudinary(file);

    }catch(err){

        alert(err.message);
        return;
    }

    const { error } = await supabaseClient
        .from("patient_images")
        .insert([{
            patient_id: patientId,
            image_url: imageUrl,
            image_type: "pdf"
        }]);

    if(error){
        alert(error.message);
        return;
    }

    showToast("PDF Uploaded Successfully ✅");

    loadImages();
}

// cal remaining 

function calculateRemainingEdit(){

    const total =
        Number(
            document.getElementById("total_amount").value
        ) || 0;

    const paid =
        Number(
            document.getElementById("paid_amount").value
        ) || 0;

    const remaining = total - paid;

    document.getElementById("remaining_amount").value =
        remaining >= 0 ? remaining : 0;
}

// EDIT INFO
function goToEditCard(){

    const details = document.getElementById("editDetails");

    if(details) details.open = true;

    document.getElementById("editCard")
        .scrollIntoView({
            behavior:"smooth",
            block:"start"
        });
}

// BOOK VISIT
function goToVisitCard(){

    const details = document.getElementById("visitDetails");

    if(details) details.open = true;

    document.getElementById("VisitCard")
        .scrollIntoView({
            behavior:"smooth",
            block:"start"
        });
}

// ADD SERVICE
function goToAddService(){

    const details = document.getElementById("addServiceDetails");

    if(details) details.open = true;

    document.getElementById("addServiceCard")
        .scrollIntoView({
            behavior:"smooth",
            block:"start"
        });
}


// html 
async function uploadHTML(input){

    if(!input.files.length){

        alert("Choose HTML file");

        return;
    }

    const file = input.files[0];

    let fileUrl;

    try{

        fileUrl = await uploadToCloudinary(file);

    }catch(err){

        alert(err.message);

        return;
    }

    /* USER */

    const { data:userData } =
        await supabaseClient.auth.getUser();

    const userId = userData.user.id;

    /* SAVE DB */

    const { error:dbError } =
        await supabaseClient
        .from("patient_images")
        .insert([{

            patient_id: patientId,

            image_url: fileUrl,

            image_type: "html",

            user_id: userId

        }]);

    if(dbError){

        alert(dbError.message);

        return;
    }

    showToast("HTML Uploaded");

    loadImages();
}
/* =========================
   SERVICES
========================= */

const clinicServices = [

    "Scaling",
    "Whitening",
     "Rresin Infiltration",
    "Flouride Varnish",
    "Amalgam",
    "Composite",
      "Glass Iononmer",
    "Composite venner",
    "Root Canal ttt",
    "Root Canal Rettt",
    
    "Crown",
     "Veneer",
    "Bridge",
     "overlay",
      "endocrown",
       "onlay",
        "inlay",
    "PFM",
    "Zirconia",
    "EMAX",
    "Indirect Composite",
    
    "Surgery",
    "Simple Extraction",
    "Surgical Extraction",
    "Implant",
    "Decoronation",
    "apicectomy",
    "Gingivectomy",
    "Gingivoplasty",
    "Crown Lengthening",
    "Pocket Debridement",
      "Sinus lifting",
       "Bone Grafting",
        "Soft Tissue Grafting",
        "Botox",

    "Orthodontics",
   "Removable Appliance",
   "Fixed Appliance",
    "Complete Denture",
    "Partial Denture",
    
    "Night Guard",
    "Pulpotomy",
     "Pulpectomy",
     "ST SL Crown",
    "Zirc. Pedo Crown",
    "Space Maintainer",

    
    

];

/* LOAD SERVICES */

async function loadServices(){

    const container =
    document.getElementById(
        "servicesContainer"
    );

    container.innerHTML = "";

    /* GET SAVED */

    const { data, error } =
        await supabaseClient
        .from("patient_services")
        .select("*")
        .eq("patient_id", patientId);

    if(error){

        console.log(error);

        return;
    }

    const selectedServices =
        data.map(s => s.service_name);

    /* LOOP */

    clinicServices.forEach(service => {

    const isSelected =
        selectedServices.includes(service);

    const bgColor = isSelected
        ? "linear-gradient(135deg,#00b894,#55efc4)"
        : "linear-gradient(135deg,#ef476f,#ff5d8f)";

    const shadow = isSelected
        ? "0 8px 20px rgba(0,184,148,0.3)"
        : "0 8px 20px rgba(239,71,111,0.3)";

    container.innerHTML += `

    <div
        class="service-box"

        data-service="${service}"

        onclick="toggleService(this)"

        style="
            padding:14px 18px;

            border-radius:14px;

            cursor:pointer;

            font-weight:700;

            transition:0.3s ease;

            user-select:none;

            color:white;

            background:${bgColor};

            box-shadow:${shadow};
        "
    >

        ${service}

    </div>

    `;
});

}

// toggle 
async function toggleService(element){

    const service =
        element.dataset.service;

    /* CHECK */

    const { data } =
        await supabaseClient
        .from("patient_services")
        .select("*")
        .eq("patient_id", patientId)
        .eq("service_name", service);

    /* REMOVE */

    if(data.length){

        await supabaseClient
            .from("patient_services")
            .delete()
            .eq("id", data[0].id);
    }

    /* ADD */

    else{

        await supabaseClient
            .from("patient_services")
            .insert([{

                patient_id: patientId,

                service_name: service
            }]);
    }

    /* RELOAD */

    loadServices();
}

/* =========================
   TOOTH CHART
========================= */

const teeth = [

"18","17","16","15","14","13","12","11",
"21","22","23","24","25","26","27","28",

"48","47","46","45","44","43","42","41",
"31","32","33","34","35","36","37","38"

];



const primaryTeeth = [

/* UPPER RIGHT */

{ id:"UR_E", label:"E" },
{ id:"UR_D", label:"D" },
{ id:"UR_C", label:"C" },
{ id:"UR_B", label:"B" },
{ id:"UR_A", label:"A" },

/* UPPER LEFT */

{ id:"UL_A", label:"A" },
{ id:"UL_B", label:"B" },
{ id:"UL_C", label:"C" },
{ id:"UL_D", label:"D" },
{ id:"UL_E", label:"E" },

/* LOWER RIGHT */

{ id:"LR_E", label:"E" },
{ id:"LR_D", label:"D" },
{ id:"LR_C", label:"C" },
{ id:"LR_B", label:"B" },
{ id:"LR_A", label:"A" },

/* LOWER LEFT */

{ id:"LL_A", label:"A" },
{ id:"LL_B", label:"B" },
{ id:"LL_C", label:"C" },
{ id:"LL_D", label:"D" },
{ id:"LL_E", label:"E" }

];

/* STATES */

const toothStates = [

    "healthy",
    "missing",
    "impacted",
"discoloration",
    "caries",
    "decayed",
    "non_restorable",

 "rct",
"rct_Rettt",
    "Apicectomy",
    

     "amalgam",
    "composite",
    "glass_ionomer",

   

    "veneered",
    "veneered_comp",

    "veneered_emax",

    "overlay",
    "endo_crown",
    
    "inlay",

    "onlay",

      

    "crowned",
    "crowned_endo",
   

    "poor_crown",
    "poor_filling",

    

     
    

    

    "periapical_lesion",

    "perio_endo_lesion",

    
    "abutment",
    "implant",
    "pontic",


    "pulpectomy",

    "pulpotomy",

    "pulpotomy_stainless_crown",

    "pulpectomy_stainless_crown",

    "pulpotomy_zirconia_pedo_crown",

    "pulpectomy_zirconia_pedo_crown",

    
   
    "pocket",

    "recession",

    "mobility",

    "fracture",

    "attrition",

    "root_resorption",

    "internal_resorption",

    "root_fracture",

    "pulp_polyp",

    "root_caries",
    

    "malaligned",

    "tilted",

    "over_eruption",

    "under_eruption",

    "ankylosed",

    "retained_d_impaction",

     "retained_d_missing",



];

let selectedTooth = null;

/* =========================
   GET LABEL
========================= */

function getToothLabel(status){

    return (

        status === "healthy"
        ? "Healthy"

        : status === "caries"
        ? "Caries"

        : status === "missing"
        ? "Missing"

        : status === "rct"
        ? "RCT"

        : status === "filling"
        ? "Filling"

        : status === "crowned"
        ? "Crowned"

        : status === "crowned_endo"
        ? "Crown + Endo"

        : status === "decayed"
        ? "Decayed"

        : status === "discoloration"
        ? "Discoloration"

        : status === "impacted"
        ? "Impacted"

        : status === "implant"
        ? "Implant"

        : status === "recession"
        ? "Recession"

        : status === "root_caries"
        ? "Root Caries"

        : status === "malaligned"
        ? "Malaligned"

        : status === "pocket"
        ? "Pocket"

        : status === "tilted"
        ? "Tilted"

        : status === "over_eruption"
        ? "Over Eruption"

        : status === "under_eruption"
        ? "Under Eruption"

        : status === "non_restorable"
        ? "Non Restorable"

        : status === "mobility"
        ? "Mobility"

        : status === "periapical_lesion"
        ? "Periapical Lesion"

        : status === "ankylosed"
        ? "Ankylosed"

        : status === "veneered"
        ? "Veneered"

        : status === "abutment"
        ? "Abutment"

        : status === "overlay"
       ? "Overlay"

          : status === "endo_crown"
         ? "Endo Crown"

        : status === "poor_crown"
         ? "Poor Crown"

           : status === "poor_filling"
          ? "Poor Filling"

          : status === "rct_Rettt"
         ? "RCT rettt"

         : status === "apicectomy"
         ? "Apicectomy"
         
: status === "pontic"
? "Pontic"

: status === "pulpotomy"
? "Pulpotomy"

: status === "pulpectomy"
? "Pulpectomy"

: status === "retained_d_impaction"
? "Retained d + Impaction"

: status === "retained_d_missing"
? "Retained d + Missing"

: status === "pulpotomy_stainless_crown"
? "Pulpotomy + ST SL Crown"

: status === "pulpectomy_stainless_crown"
? "Pulpectomy + ST SL Crown"

: status === "inlay"
? "Inlay"

: status === "onlay"
? "Onlay"

: status === "veneered_comp"
? "Veneered (Comp.)"

: status === "veneered_emax"
? "Veneered (Emax)"

: status === "pulpotomy_zirconia_pedo_crown"
? "Pulpotomy + Zirc. Pedo Crown"

: status === "pulpectomy_zirconia_pedo_crown"
? "Pulpectomy + Zirc. Pedo Crown"

: status === "fracture"
? "Fracture"

: status === "attrition"
? "Attrition"

: status === "perio_endo_lesion"
? "Perio-Endo Lesion"

: status === "root_resorption"
? "Root Resorption"

: status === "internal_resorption"
? "Internal Resorption"

: status === "root_fracture"
? "Root Fracture"

: status === "pulp_polyp"
? "Pulp Polyp"

: status === "amalgam"
? "Amalgam"

: status === "composite"
? "Composite"

: status === "glass_ionomer"
? "Glass Ionomer"

        : status
    );
}

/* =========================
   LOAD
========================= */


async function loadToothChart(){

    const upperContainer =
        document.getElementById("upperTeeth");

    const lowerContainer =
        document.getElementById("lowerTeeth");

    upperContainer.innerHTML = "";
    lowerContainer.innerHTML = "";

    const { data, error } =
        await supabaseClient
        .from("patient_teeth")
        .select("*")
        .eq("patient_id", patientId);

    if(error){
        console.log(error);
        return;
    }

    const safeData = data || [];

    teeth.forEach(tooth => {

        const saved =
            safeData.find(
                t => t.tooth_number === tooth
            );

        const status =
            saved?.tooth_status || "healthy";

        const toothHTML = `

        <div
            class="tooth ${status}"

            onclick="openToothModal('${tooth}')"
        >

            <div class="tooth-number">
                ${tooth}
            </div>

            <div class="tooth-status">
                ${getToothLabel(status)}
            </div>

        </div>
        `;

        /* UPPER */

        if(
            tooth.startsWith("1") ||
            tooth.startsWith("2")
        ){

            upperContainer.innerHTML += toothHTML;
        }

        /* LOWER */

        else{

            lowerContainer.innerHTML += toothHTML;
        }
    });
}
/* =========================
   CHANGE STATE
========================= */

async function changeToothState(tooth){

    const { data } =
        await supabaseClient
        .from("patient_teeth")
        .select("*")
        .eq("patient_id", patientId)
        .eq("tooth_number", tooth);

    let currentState = "healthy";

    if(data.length){

        currentState =
            data[0].tooth_status;
    }

    /* NEXT STATE */

    let index =
        toothStates.indexOf(currentState);

    index++;

    if(index >= toothStates.length){

        index = 0;
    }

    const nextState =
        toothStates[index];

    /* DELETE OLD */

    await supabaseClient
        .from("patient_teeth")
        .delete()
        .eq("patient_id", patientId)
        .eq("tooth_number", tooth);

    /* INSERT NEW */

    await supabaseClient
        .from("patient_teeth")
        .insert([{

            patient_id: patientId,

            tooth_number: tooth,

            tooth_status: nextState
        }]);

    loadToothChart();
    loadPrimaryToothChart();
}

// نافذة اخر حالة السن 

function openToothModal(tooth){

    selectedTooth = tooth;

    const modal =
        document.getElementById("toothModal");

    const options =
        document.getElementById("toothOptions");

    options.innerHTML = "";

    toothStates.forEach(state => {

        options.innerHTML += `

        <div
            onclick="setToothState('${state}')"

            style="
                padding:10px 8px;

                border-radius:12px;

                cursor:pointer;

                font-size:11px;

                font-weight:700;

                text-align:center;

                line-height:1.2;

                background:linear-gradient(135deg,#ef476f,#ff5d8f);

                color:white;

                user-select:none;
            "
        >

            ${state}

        </div>
        `;
    });

    modal.style.display = "flex";
}



async function setToothState(state){

    const tooth = selectedTooth;

    /* DELETE OLD */

    const { error: deleteError } =
        await supabaseClient
        .from("patient_teeth")
        .delete()
        .eq("patient_id", patientId)
        .eq("tooth_number", tooth);

    if(deleteError){

        console.log(deleteError);

        return;
    }

    /* INSERT NEW */

    const { error: insertError } =
        await supabaseClient
        .from("patient_teeth")
        .insert([{

            patient_id: patientId,

            tooth_number: tooth,

            tooth_status: state
        }]);

    if(insertError){

        console.log(insertError);

        return;
    }

    /* CLOSE MODAL */

    document.getElementById(
        "toothModal"
    ).style.display = "none";

    /* WAIT SMALL TIME */

    setTimeout(() => {

        loadToothChart();

        loadPrimaryToothChart();

    }, 150);
}

// image viewer 


/* =========================
   IMAGE VIEWER
========================= */

let scale = 1;

let pointX = 0;
let pointY = 0;

let startX = 0;
let startY = 0;

let isDragging = false;

/* OPEN */

function openImageViewer(src){

    const viewer =
        document.getElementById("imageViewer");

    const img =
        document.getElementById("viewerImage");

    viewer.style.display = "flex";

    img.src = src;

    scale = 1;

    pointX = 0;
    pointY = 0;

    updateTransform();
}

/* CLOSE */

function closeImageViewer(){

    document.getElementById(
        "imageViewer"
    ).style.display = "none";
}

/* UPDATE */

function updateTransform(){

    const img =
        document.getElementById("viewerImage");

    img.style.transform =
        `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

/* ZOOM */

function zoomIn(){

    scale += 0.2;

    updateTransform();
}

function zoomOut(){

    scale -= 0.2;

    if(scale < 1){

        scale = 1;
    }

    updateTransform();
}

/* =========================
   AFTER PAGE LOAD
========================= */

document.addEventListener("DOMContentLoaded", () => {

    const viewer =
        document.getElementById("imageViewer");

    const img =
        document.getElementById("viewerImage");

    /* DRAG */

    img.addEventListener("mousedown", e => {

        isDragging = true;

        startX = e.clientX - pointX;
        startY = e.clientY - pointY;

        img.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", e => {

        if(!isDragging) return;

        pointX = e.clientX - startX;
        pointY = e.clientY - startY;

        updateTransform();
    });

    document.addEventListener("mouseup", () => {

        isDragging = false;

        img.style.cursor = "grab";
    });

    /* TOUCH */

    img.addEventListener("touchstart", e => {

        if(e.touches.length !== 1) return;

        isDragging = true;

        startX =
            e.touches[0].clientX - pointX;

        startY =
            e.touches[0].clientY - pointY;
    });

    img.addEventListener("touchmove", e => {

        if(!isDragging) return;

        pointX =
            e.touches[0].clientX - startX;

        pointY =
            e.touches[0].clientY - startY;

        updateTransform();
    });

    img.addEventListener("touchend", () => {

        isDragging = false;
    });

    /* CLOSE BACKGROUND */

    viewer.addEventListener("click", e => {

        if(e.target.id === "imageViewer"){

            closeImageViewer();
        }
    });
});

// primary teeth chart 


async function loadPrimaryToothChart(){

    const upper =
        document.getElementById(
            "primaryUpperTeeth"
        );

    const lower =
        document.getElementById(
            "primaryLowerTeeth"
        );

    if(!upper || !lower) return;

    upper.innerHTML = "";
    lower.innerHTML = "";

    const { data, error } =
        await supabaseClient
        .from("patient_teeth")
        .select("*")
        .eq("patient_id", patientId);

    if(error){

        console.log(error);

        return;
    }

    const safeData = data || [];

    /* =========================
       UPPER TEETH
    ========================= */

    const upperTeeth = [

        { id:"UR_E", label:"E" },
        { id:"UR_D", label:"D" },
        { id:"UR_C", label:"C" },
        { id:"UR_B", label:"B" },
        { id:"UR_A", label:"A" },

        { id:"UL_A", label:"A" },
        { id:"UL_B", label:"B" },
        { id:"UL_C", label:"C" },
        { id:"UL_D", label:"D" },
        { id:"UL_E", label:"E" }
    ];

    /* =========================
       LOWER TEETH
    ========================= */

    const lowerTeeth = [

        { id:"LR_E", label:"E" },
        { id:"LR_D", label:"D" },
        { id:"LR_C", label:"C" },
        { id:"LR_B", label:"B" },
        { id:"LR_A", label:"A" },

        { id:"LL_A", label:"A" },
        { id:"LL_B", label:"B" },
        { id:"LL_C", label:"C" },
        { id:"LL_D", label:"D" },
        { id:"LL_E", label:"E" }
    ];

    /* =========================
       RENDER FUNCTION
    ========================= */

    function renderTeeth(list, target){

        list.forEach(tooth => {

            const saved =
                safeData.find(
                    t => t.tooth_number === tooth.id
                );

            const status =
                saved?.tooth_status || "healthy";

            target.innerHTML += `

            <div
                class="tooth ${status}"

                onclick="openToothModal('${tooth.id}')"
            >

                <div class="tooth-number">

                    ${tooth.label}

                </div>

                <div class="tooth-status">

                    ${getToothLabel(status)}

                </div>

            </div>
            `;
        });
    }

    /* =========================
       RENDER
    ========================= */

    renderTeeth(upperTeeth, upper);

    renderTeeth(lowerTeeth, lower);
}





async function savePatienttService(){

    const service_name =
        document.getElementById("serviceName").value;

    const total_amount =
        Number(document.getElementById("serviceTotal").value || 0);

    const paid_amount =
        Number(document.getElementById("servicePaid").value || 0);

    const remain_amount = total_amount - paid_amount;

    if(!service_name){
        alert("اكتب اسم الخدمة");
        return;
    }

    // 👤 get current user
    const { data: userData, error: userError } =
        await supabaseClient.auth.getUser();

    if(userError || !userData.user){
        alert("User not found");
        return;
    }

    const userId = userData.user.id;

    const { error } = await supabaseClient
    .from("patientt_services")
    .insert([{

        patient_id: patientId,
        user_id: userId,

        service_name,
        total_amount,
        paid_amount,
        remain_amount

    }]);

    if(error){
        alert(error.message);
        return;
    }

    // clear inputs
    document.getElementById("serviceName").value = "";
    document.getElementById("serviceTotal").value = "";
    document.getElementById("servicePaid").value = "";
    document.getElementById("serviceRemain").value = "";

    loadPatienttServices();
}


/* =========================
AUTO CALCULATE REMAIN
========================= */

function calculateRemain(){

    const total =
        parseFloat(document.getElementById("serviceTotal").value) || 0;

    const paid =
        parseFloat(document.getElementById("servicePaid").value) || 0;

    document.getElementById("serviceRemain").value = total - paid;
}


/* EVENTS */

document.getElementById("serviceTotal")
.addEventListener("input", calculateRemain);

document.getElementById("servicePaid")
.addEventListener("input", calculateRemain);


/* =========================
🔥 AUTO SUGGEST FROM SUPABASE (FIXED & WORKING)
========================= */

document.getElementById("serviceName").addEventListener("input", async () => {

    const name = document.getElementById("serviceName").value.trim();
    const totalInput = document.getElementById("serviceTotal");

    if (!name) {
        totalInput.value = "";
        calculateRemain();
        return;
    }

    const { data, error } = await supabaseClient
        .from("patientt_services")
        .select("service_name, total_amount")
        .ilike("service_name", `%${name}%`)
        .limit(1);

    if (error) {
        console.log(error.message);
        return;
    }

    if (data && data.length > 0) {
        totalInput.value = data[0].total_amount;
    } else {
        totalInput.value = "";
    }

    calculateRemain();
});


/* =========================
LOAD SERVICES
========================= */

async function loadPatienttServices(){

    const tbody = document.getElementById("patienttServicesList");
    tbody.innerHTML = "";

    const { data, error } = await supabaseClient
        .from("patientt_services")
        .select("*")
        .eq("patient_id", patientId)
        .order("id", { ascending:false });

    if(error){
        alert(error.message);
        return;
    }

    data.forEach(service => {

        const remain =
            Number(service.total_amount || 0) -
            Number(service.paid_amount || 0);

        tbody.innerHTML += `
        <tr>

            <td>${service.service_name}</td>
            <td>${service.total_amount}</td>
            <td>${service.paid_amount}</td>
            <td>${remain}</td>

            <td>${new Date(service.created_at).toLocaleString()}</td>

            <td>
                <button onclick="editPatienttService(${service.id})"
                    style="background:#4cc9f0;color:white;border:none;padding:6px;border-radius:6px;">
                    تعديل
                </button>

                <button onclick="deletePatienttService(${service.id})"
                    style="background:#ef4444;color:white;border:none;padding:6px;border-radius:6px;">
                    حذف
                </button>
            </td>

        </tr>
        `;
    });
}

// دالة تعديل الخدمات 
async function editPatienttService(id){

    const newName = prompt("اسم الخدمة الجديد (اتركه فارغ إذا لا تريد تغييره):");
    const newTotal = prompt("المبلغ المستحق (اتركه فارغ إذا لا تريد تغييره):");
    const newPaid = prompt("المبلغ المدفوع (اتركه فارغ إذا لا تريد تغييره):");

    // =========================
    // جلب البيانات الحالية
    // =========================
    const { data, error: fetchError } = await supabaseClient
        .from("patientt_services")
        .select("*")
        .eq("id", id)
        .single();

    if(fetchError){
        alert(fetchError.message);
        return;
    }

    // =========================
    // تجهيز القيم الجديدة (اختياري)
    // =========================
    let updatedName = data.service_name;
    let updatedTotal = data.total_amount;
    let updatedPaid = data.paid_amount;

    if(newName !== null && newName.trim() !== ""){
        updatedName = newName;
    }

    if(newTotal !== null && newTotal.trim() !== ""){
        updatedTotal = Number(newTotal);
    }

    if(newPaid !== null && newPaid.trim() !== ""){
        updatedPaid = Number(newPaid);
    }

    const remain = updatedTotal - updatedPaid;

    // =========================
    // تحديث قاعدة البيانات
    // =========================
    const { error } = await supabaseClient
        .from("patientt_services")
        .update({
            service_name: updatedName,
            total_amount: updatedTotal,
            paid_amount: updatedPaid,
            remain_amount: remain
        })
        .eq("id", id);

    if(error){
        alert(error.message);
        return;
    }

    loadPatienttServices();
}




/* =========================
DELETE SERVICE
========================= */

async function deletePatienttService(id){

    if(!confirm("هل تريد حذف الخدمة؟")) return;

    const { error } = await supabaseClient
        .from("patientt_services")
        .delete()
        .eq("id", id);

    if(error){
        alert(error.message);
        return;
    }

    loadPatienttServices();
}

/* =========================
WINDOW LOAD
========================= */

window.addEventListener("load", ()=>{

    loadPatienttServices();

});


