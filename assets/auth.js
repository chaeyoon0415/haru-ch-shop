import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDavrwZtFJrgJXWEe_GPlr4QHXpMlMBsvw",
  authDomain: "haru-ch-shop.firebaseapp.com",
  projectId: "haru-ch-shop",
  storageBucket: "haru-ch-shop.firebasestorage.app",
  messagingSenderId: "971703720070",
  appId: "1:971703720070:web:df10e702482b8882475907"
};

export const auth = getAuth(initializeApp(firebaseConfig));

let isSigningOut = false;

function nextPage() {
  return new URLSearchParams(location.search).get("next") === "mypage.html" ? "mypage.html" : null;
}

function renderAuthMenu(user) {
  document.querySelectorAll("[data-auth-menu]").forEach(menu => {
    menu.textContent = "";
    menu.className = "auth-menu";

    if (!user) {
      const login = document.createElement("a");
      login.href = "login.html";
      login.textContent = "로그인";
      menu.append(login);
      return;
    }

    const email = document.createElement("span");
    email.className = "auth-email";
    email.textContent = user.email || "";

    const mypage = document.createElement("a");
    mypage.href = "mypage.html";
    mypage.textContent = "마이페이지";

    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "auth-signout";
    logout.textContent = "로그아웃";
    logout.addEventListener("click", () => logoutUser());

    menu.append(email, mypage, logout);
  });
}

export async function logoutUser() {
  isSigningOut = true;
  try {
    await signOut(auth);
    location.replace("index.html");
  } catch (error) {
    isSigningOut = false;
  }
}

onAuthStateChanged(auth, user => {
  renderAuthMenu(user);

  if (isSigningOut) return;

  const protectedPage = document.querySelector("[data-auth-required]");
  if (protectedPage) {
    if (!user) {
      location.replace("login.html?next=mypage.html");
      return;
    }
    const email = protectedPage.querySelector("[data-user-email]");
    if (email) email.textContent = user.email || "";
    protectedPage.hidden = false;
  }

  if (user && location.pathname.endsWith("/login.html")) {
    const next = nextPage();
    if (next) location.replace(next);
  }
});
