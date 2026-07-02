let authChecked = false;

async function checkUser(){

    const { data: { user } } =
        await supabaseClient.auth.getUser();

    if(!user){
        window.location.replace("login.html");
        return null;
    }

    return user;
}


// run once ONLY
document.addEventListener("DOMContentLoaded", async () => {

    if(authChecked) return;
    authChecked = true;

    const user = await checkUser();

    if(!user) return;

    window.__USER__ = user;
});

// =========================
// CHECK USER (SAFE)
// =========================



// =========================
// GET CURRENT USER ID
// =========================
async function getUserId(){

    const user = await checkUser();
    if(!user) return null;

    return user.id;
}


// =========================
// OPTIONAL: GET ROLE (IF YOU USE IT)
// =========================
async function getRole(){

    const user = await checkUser();
    if(!user) return null;

    const { data, error } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

    if(error){
        console.log("Role error:", error);
        return null;
    }

    return data?.role || null;
}


// =========================
// LOGOUT
// =========================
async function logout() {

    await supabaseClient.auth.signOut();

    localStorage.clear();
    sessionStorage.clear();

    window.location.replace("login.html");
}


// =========================
// AUTO PROTECT PAGE (SAFE INIT)
// =========================
document.addEventListener("DOMContentLoaded", async () => {

    const user = await checkUser();

    if(!user) return;

    // لو عايز تنفذ حاجات بعد التأكد من الدخول
    if(typeof onUserReady === "function"){
        onUserReady(user);
    }
});


// =========================
// LISTENER (SAFE)
// =========================
supabaseClient.auth.onAuthStateChange((event, session) => {

    if(!session){
        window.location.replace("login.html");
    }
});