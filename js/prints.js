let prints = [];

/* =========================
   USER
========================= */
async function getUser(){
    const { data } = await supabaseClient.auth.getUser();

    const user = data?.user;

    if(!user){
        // 🔥 تحويل مباشر لصفحة تسجيل الدخول
        window.location.href = "login.html";
        return null;
    }

    return user;
}

/* =========================
   LOAD PRINTS
========================= */
async function loadPrints(){

    const user = await getUser();
    if(!user) return;

    const { data, error } = await supabaseClient
        .from("prints")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if(error){
        console.log(error);
        return;
    }

    prints = data || [];
    render();
}

/* =========================
   UPLOAD FILE (FIXED PUBLIC URL)
========================= */
async function uploadFile(file){

    const cloudName = "dflfcteo2";
    const uploadPreset = "prints-files";

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(url, {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    if(!data.secure_url){
        console.log("Cloudinary error:", data);
        return null;
    }

    return data.secure_url;
}

/* =========================
   ADD PRINT
========================= */
async function addPrint(){

    const user = await getUser();
    if(!user) return alert("Login required");

    const title = document.getElementById("title").value.trim();
    const type = document.getElementById("type").value;
    const content = document.getElementById("content").value;

    const imageFile = document.getElementById("image").files[0];
    const logoFile = document.getElementById("logo")?.files[0];

    if(!title) return alert("Enter title");

    let imageUrl = null;
    let logoUrl = null;

    // =========================
    // CLOUDINARY UPLOAD (IMAGE)
    // =========================
    if(imageFile){
        imageUrl = await uploadFile(imageFile);
    }

    // =========================
    // CLOUDINARY UPLOAD (LOGO)
    // =========================
    if(logoFile){
        logoUrl = await uploadFile(logoFile);
    }

    // =========================
    // SAVE TO SUPABASE ONLY DATA
    // =========================
    const { error } = await supabaseClient
        .from("prints")
        .insert([{
            user_id: user.id,
            title,
            type,
            content,
            image_url: imageUrl,
            logo_url: logoUrl
        }]);

    if(error){
        console.log(error);
        alert("Error saving print");
        return;
    }

    clearForm();
    loadPrints();
}

/* =========================
   DELETE
========================= */
async function deletePrint(id){

    await supabaseClient
        .from("prints")
        .delete()
        .eq("id", id);

    loadPrints();
}


/* =========================
   PRINT (FIXED WATERMARK)
========================= */
async function printItem(item){

    const win = window.open("", "_blank");

    win.document.write(`
    <html>
    <head>

    <title>Dentix Clinic</title>

    <style>
    body{
        font-family:Segoe UI;
        padding:40px;
    }

    .watermark{
        position:fixed;
        top:50%;
        left:50%;
        transform:translate(-50%,-50%);
        opacity:0.3;
        z-index:9999;
        width:100%;
        text-align:center;
        pointer-events:none;
    }

    .watermark img{
        max-width:350px;
        max-height:350px;
    }

    .content{
        position:relative;
        z-index:1;
    }

    .content p{
        white-space: break-spaces; /* 🔥 مهم جداً */
    }

    img{
        max-width:100%;
    }
</style>

    </head>

    <body>

    <div class="watermark">
        ${
            item.logo_url
            ? `<img id="logoImg" src="${item.logo_url}">`
            : `<div style="font-size:60px;font-weight:900;">CLINIC</div>`
        }
    </div>

    <div class="content">
        <h2>${item.title}</h2>
       <p dir="${getDirection(item.content)}" style="white-space: break-spaces;">
    ${item.content || ""}
</p>

        ${
            item.image_url
            ? `<img id="mainImg" src="${item.image_url}">`
            : ""
        }
    </div>

    <script>
        function waitImages(){
            const imgs = document.images;
            let loaded = 0;

            if(imgs.length === 0){
                window.print();
                return;
            }

            for(let img of imgs){
                if(img.complete){
                    loaded++;
                }else{
                    img.onload = img.onerror = () => {
                        loaded++;
                        if(loaded === imgs.length){
                            window.print();
                        }
                    };
                }
            }

            if(loaded === imgs.length){
                window.print();
            }
        }

        window.onload = () => setTimeout(waitImages, 200);
    <\/script>

    </body>
    </html>
    `);

    win.document.close();

    // تغيير اسم التبويب
    setTimeout(() => {
        try{
            win.document.title = "Dentix Clinic";
        }catch(e){}
    }, 100);
}

/* =========================
   RENDER
========================= */
function render(){

    const list = document.getElementById("list");
    list.innerHTML = "";

    if(!prints.length){
        list.innerHTML = `<p style="opacity:.6">No prints found</p>`;
        return;
    }

    prints.forEach(p => {

        list.innerHTML += `
        <div class="item">

            <div class="badge">${p.type}</div>

            <h3>${p.title}</h3>

            <p dir="${getDirection(p.content)}" style="white-space: break-spaces;">
    ${p.content || ""}
</p>

            ${p.image_url 
                ? `<img src="${p.image_url}" onerror="this.style.display='none'">`
                : ""
            }

          <div class="actions">
    <button class="print-btn"
        onclick='printItem(${JSON.stringify(p)})'>
        Print
    </button>

    <button class="delete-btn"
        onclick="deletePrint(${p.id})">
        Delete
    </button>
</div>

        </div>
        `;
    });
}

function urlToBase64(url){
    return fetch(url)
        .then(res => res.blob())
        .then(blob => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        }));
}
/* =========================
   HELPERS
========================= */
function clearForm(){
    document.getElementById("title").value = "";
    document.getElementById("content").value = "";
    document.getElementById("image").value = "";
}

function getDirection(text){
    if(!text) return "ltr";

    // Arabic Unicode range
    const arabic = /[\u0600-\u06FF]/;

    return arabic.test(text) ? "rtl" : "ltr";
}

function previewFileName(inputId, textId){
    const input = document.getElementById(inputId);
    const text = document.getElementById(textId);
    const box = input.parentElement.querySelector(".file-ui");

    if(input.files && input.files[0]){
        const fileName = input.files[0].name;

        text.innerText = fileName;

        // تغيير شكل الحقل عند الاختيار
        box.style.borderColor = "#38bdf8";
        box.style.background = "rgba(56,189,248,0.15)";
        box.style.transform = "scale(1.01)";
    }
}



/* INIT */
loadPrints();

(async function initAuth(){
    const user = await supabaseClient.auth.getUser();

    if(!user?.data?.user){
        window.location.href = "login.html";
        return;
    }

    loadPrints();
})();
