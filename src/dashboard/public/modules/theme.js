export function initTheme(app) {
  const savedTheme = localStorage.getItem('dashboard-theme') || 'dark';
  app.theme = savedTheme;
  applyTheme(app);
}

export function toggleTheme(app) {
  const themes = ['light', 'dark', 'system'];
  const currentIndex = themes.indexOf(app.theme);
  app.theme = themes[(currentIndex + 1) % themes.length];
  localStorage.setItem('dashboard-theme', app.theme);
  applyTheme(app);
}

export function applyTheme(app) {
  const html = document.documentElement;
  if (app.theme === 'dark' || (app.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
  updateHighlightTheme();
}

export function updateHighlightTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const lightTheme = document.getElementById('highlight-theme-light');
  const darkTheme = document.getElementById('highlight-theme-dark');
  if (lightTheme && darkTheme) {
    lightTheme.disabled = isDark;
    darkTheme.disabled = !isDark;
  }
}


