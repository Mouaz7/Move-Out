/**
 * MoveOut Theme & Language Manager
 * Handles dark/light mode and Swedish/English translations
 */

// ===== Theme Manager =====
const ThemeManager = {
  init() {
    const savedTheme = localStorage.getItem('moveout-theme') || 'dark';
    this.setTheme(savedTheme);
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('moveout-theme', theme);
    
    // Update toggle button icon (using Font Awesome)
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
      toggleBtn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
    
    // Update nav link colors
    this.updateNavLinks(theme);
    
    // Update header background
    this.updateHeader(theme);
  },

  updateNavLinks(theme) {
    const isDark = theme === 'dark';
    const color = isDark ? '#ffffff' : '#1a1a2e';
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Only set color - let CSS handle background/hover effects
    navLinks.forEach(link => {
      link.style.setProperty('color', color, 'important');
      link.style.setProperty('-webkit-text-fill-color', color, 'important');
    });
  },

  updateHeader(theme) {
    const header = document.querySelector('header');
    if (header) {
      if (theme === 'light') {
        header.style.background = 'rgba(255, 255, 255, 0.9)';
      } else {
        header.style.background = 'rgba(15, 15, 35, 0.9)';
      }
    }
  },

  toggle() {
    const currentTheme = localStorage.getItem('moveout-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }
};

// ===== Language Manager =====
const translations = {
  en: {
    // Navigation
    about: 'About',
    admin: 'Admin',
    profile: 'Profile',
    myBoxes: 'My Boxes',
    addBox: 'Add Box',
    logout: 'Logout',
    login: 'Login',
    register: 'Register',
    
    // Login Page
    loginTitle: 'Login to MoveOut',
    email: 'Email',
    password: 'Password',
    loginBtn: 'Login',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    signUp: 'Sign Up',
    loginWithGoogle: 'Login with Google',
    
    // Register Page
    signUpTitle: 'Sign Up',
    createAccount: 'Create an account to get started',
    name: 'Name',
    repeatPassword: 'Repeat Password',
    signUpBtn: 'Sign Up',
    haveAccount: 'Already have an account?',
    loginHere: 'Login here',
    
    // Profile Page
    profileOverview: 'Profile Overview',
    userName: 'User Name',
    updateProfile: 'Update Profile',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    leaveBlank: 'Leave blank if you do not wish to change the password.',
    updateBtn: 'Update Profile',
    deactivate: 'Deactivate Account',
    
    // Boxes
    allBoxes: 'All Boxes',
    createBox: 'Create Box',
    editBox: 'Edit Box',
    boxName: 'Box Name',
    labelName: 'Label Name',
    content: 'Content',
    private: 'Private',
    pinCode: 'PIN Code',
    save: 'Save',
    delete: 'Delete',
    view: 'View',
    edit: 'Edit',
    
    // About
    aboutTitle: 'About MoveOut',
    features: 'Features',
    
    // Footer
    copyright: '© 2024 MoveOut. All rights reserved.',
  },
  
  sv: {
    // Navigation
    about: 'Om oss',
    admin: 'Admin',
    profile: 'Profil',
    myBoxes: 'Mina lådor',
    addBox: 'Lägg till låda',
    logout: 'Logga ut',
    login: 'Logga in',
    register: 'Registrera',
    
    // Login Page
    loginTitle: 'Logga in på MoveOut',
    email: 'E-post',
    password: 'Lösenord',
    loginBtn: 'Logga in',
    forgotPassword: 'Glömt lösenord?',
    noAccount: 'Har du inget konto?',
    signUp: 'Registrera dig',
    loginWithGoogle: 'Logga in med Google',
    
    // Register Page
    signUpTitle: 'Registrera',
    createAccount: 'Skapa ett konto för att komma igång',
    name: 'Namn',
    repeatPassword: 'Upprepa lösenord',
    signUpBtn: 'Registrera',
    haveAccount: 'Har du redan ett konto?',
    loginHere: 'Logga in här',
    
    // Profile Page
    profileOverview: 'Profilöversikt',
    userName: 'Användarnamn',
    updateProfile: 'Uppdatera profil',
    currentPassword: 'Nuvarande lösenord',
    newPassword: 'Nytt lösenord',
    leaveBlank: 'Lämna tomt om du inte vill ändra lösenordet.',
    updateBtn: 'Uppdatera profil',
    deactivate: 'Inaktivera konto',
    
    // Boxes
    allBoxes: 'Alla lådor',
    createBox: 'Skapa låda',
    editBox: 'Redigera låda',
    boxName: 'Lådans namn',
    labelName: 'Etikettnamn',
    content: 'Innehåll',
    private: 'Privat',
    pinCode: 'PIN-kod',
    save: 'Spara',
    delete: 'Ta bort',
    view: 'Visa',
    edit: 'Redigera',
    
    // About
    aboutTitle: 'Om MoveOut',
    features: 'Funktioner',
    
    // Footer
    copyright: '© 2024 MoveOut. Alla rättigheter förbehållna.',
  }
};

const LanguageManager = {
  init() {
    const savedLang = localStorage.getItem('moveout-lang') || 'en';
    this.setLanguage(savedLang);
  },

  setLanguage(lang) {
    localStorage.setItem('moveout-lang', lang);
    document.documentElement.setAttribute('lang', lang);
    
    // Update toggle button
    const toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) {
      toggleBtn.innerHTML = lang === 'en' ? 'SV' : 'EN';
      toggleBtn.title = lang === 'en' ? 'Byt till Svenska' : 'Switch to English';
    }
    
    // Translate elements with data-i18n attribute
    this.translatePage(lang);
  },

  toggle() {
    const currentLang = localStorage.getItem('moveout-lang') || 'en';
    const newLang = currentLang === 'en' ? 'sv' : 'en';
    this.setLanguage(newLang);
  },

  translatePage(lang) {
    const t = translations[lang];
    
    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.textContent = t[key];
      }
    });
    
    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (t[key]) {
        el.placeholder = t[key];
      }
    });
  },

  get(key) {
    const lang = localStorage.getItem('moveout-lang') || 'en';
    return translations[lang][key] || key;
  }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  LanguageManager.init();
});

// Export for global use
window.ThemeManager = ThemeManager;
window.LanguageManager = LanguageManager;
