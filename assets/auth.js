import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

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

    if (user.photoURL) {
      const photo = document.createElement("img");
      photo.className = "auth-photo";
      photo.src = user.photoURL;
      photo.alt = "";
      photo.referrerPolicy = "no-referrer";
      photo.addEventListener("error", () => photo.remove());
      menu.append(photo);
    }

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

export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) throw new Error("auth/user-not-found");
  auth.languageCode = "ko";
  await sendEmailVerification(user);
}

function renderEmailVerification(user) {
  const section = document.querySelector("[data-email-verification]");
  if (!section) return;

  const message = section.querySelector("[data-email-verification-message]");
  const sentAfterSignup = new URLSearchParams(location.search).get("verificationEmailSent") === "1";

  if (user.emailVerified) {
    section.hidden = true;
    return;
  }

  message.textContent = sentAfterSignup
    ? "인증 메일을 보냈습니다. 메일함과 스팸함을 확인해 주세요."
    : "이메일 인증이 필요합니다.";
  section.hidden = false;
}

onAuthStateChanged(auth, async user => {
  renderAuthMenu(user);

  if (isSigningOut) return;

  const protectedPage = document.querySelector("[data-auth-required]");
  if (protectedPage) {
    if (!user) {
      location.replace("login.html?next=mypage.html");
      return;
    }
    await user.reload();
    user = auth.currentUser;
    const email = protectedPage.querySelector("[data-user-email]");
    if (email) email.textContent = user.email || "";
    renderEmailVerification(user);
    protectedPage.hidden = false;
  }

  if (user && location.pathname.endsWith("/login.html")) {
    const next = nextPage();
    if (next) location.replace(next);
  }
});
